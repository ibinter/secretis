/**
 * SECRETIS ERP — Enregistrement du Service Worker
 * ---------------------------------------------------------------------------
 * Ce module est le SEUL point d'enregistrement du Service Worker de SECRETIS.
 * Il est importé par `app.jsx` et gère tout le cycle de vie :
 *   installation → activation → détection d'une nouvelle version → invitation
 *   à recharger → application de la mise à jour.
 *
 * RÈGLE ABSOLUE : aucune erreur ici ne doit empêcher l'application de démarrer.
 * Tout est encapsulé dans des try/catch et derrière le garde
 * `'serviceWorker' in navigator`.
 *
 * INVALIDATION AU DÉPLOIEMENT
 *   Le SW est enregistré sous l'URL `/sw.js?v=<BUILD_ID>` où BUILD_ID est le
 *   hash du bundle Vite courant. Deux effets :
 *     1. l'URL change à chaque build → le navigateur retélécharge le script,
 *        même si nginx sert les `.js` en `Cache-Control: public, immutable` ;
 *     2. `sw.js` dérive son `CACHE_NAME` de ce `?v=` → l'ancien cache est purgé
 *        automatiquement à l'activation, sans intervention manuelle.
 * ---------------------------------------------------------------------------
 */

const SW_PATH            = '/sw.js';
const INTERVALLE_VERIF   = 30 * 60 * 1000; // 30 min
const EVT_MAJ_DISPONIBLE = 'secretis:sw-update-available';
const EVT_ENREGISTRE     = 'secretis:sw-registered';

let registrationCourante = null;
let workerEnAttente      = null;
let majAcceptee          = false; // l'utilisateur a-t-il demandé la mise à jour ?
let rechargementEnCours  = false;

// ─── Identifiant de build ────────────────────────────────────────────────────
/**
 * Vite produit des fichiers hachés (`app-B7xK2q9F.js`). `import.meta.url` pointe
 * vers le chunk courant : son hash change dès que le code change, et seulement
 * dans ce cas. C'est exactement la granularité d'invalidation recherchée.
 */
function resoudreBuildId() {
  try {
    const url = typeof import.meta !== 'undefined' ? (import.meta.url || '') : '';
    const correspondance = url.match(/-([A-Za-z0-9_-]{6,})\.[cm]?js(?:[?#]|$)/);
    if (correspondance) return correspondance[1];
  } catch { /* import.meta indisponible */ }

  try {
    const version = import.meta.env?.VITE_APP_VERSION;
    if (version) return String(version).replace(/[^\w.-]/g, '').slice(0, 40) || 'dev';
  } catch { /* env indisponible */ }

  return 'dev';
}

const BUILD_ID = resoudreBuildId();

// ─── Utilitaires ─────────────────────────────────────────────────────────────
function emettre(nom, detail) {
  try {
    window.dispatchEvent(new CustomEvent(nom, { detail }));
  } catch { /* CustomEvent indisponible : sans conséquence */ }
}

function signalerMiseAJour(worker) {
  workerEnAttente = worker || null;
  emettre(EVT_MAJ_DISPONIBLE, { worker: workerEnAttente, buildId: BUILD_ID });
}

function surveillerInstallation(registration) {
  registration.addEventListener('updatefound', () => {
    const nouveau = registration.installing;
    if (!nouveau) return;

    nouveau.addEventListener('statechange', () => {
      // `controller` non nul => il y avait déjà une version active : c'est
      // bien une MISE À JOUR, pas la première installation.
      if (nouveau.state === 'installed' && navigator.serviceWorker.controller) {
        signalerMiseAJour(nouveau);
      }
    });
  });
}

// ─── API publique ────────────────────────────────────────────────────────────

/** Y a-t-il un Service Worker en attente d'activation ? */
export function miseAJourDisponible() {
  return Boolean(workerEnAttente);
}

/** Registration courante (ou null tant que l'enregistrement n'a pas abouti). */
export function getRegistration() {
  return registrationCourante;
}

export function getBuildId() {
  return BUILD_ID;
}

/**
 * Applique la mise à jour : le SW en attente prend la main, puis la page se
 * recharge via `controllerchange`. Appelée par le bandeau « Mettre à jour ».
 */
export function applyUpdate() {
  majAcceptee = true;

  try {
    const cible = workerEnAttente
      || registrationCourante?.waiting
      || navigator.serviceWorker?.controller;

    if (cible) {
      cible.postMessage({ type: 'SKIP_WAITING' });
      // Filet de sécurité : si `controllerchange` n'arrive pas (SW bloqué),
      // on recharge quand même au bout de 3 s.
      setTimeout(() => {
        if (!rechargementEnCours) {
          rechargementEnCours = true;
          window.location.reload();
        }
      }, 3000);
    } else {
      window.location.reload();
    }
  } catch (err) {
    console.warn('[PWA] Mise à jour impossible, rechargement simple :', err);
    window.location.reload();
  }
}

/**
 * Escape hatch : purge totale (caches + service workers) puis rechargement.
 * Destinée au support terrain quand un cache corrompu empêche le démarrage.
 * Exposée sur `window.secretisForcerMiseAJour()`.
 */
export async function forceUpdate() {
  majAcceptee = true;

  try {
    if ('caches' in window) {
      const cles = await caches.keys();
      await Promise.all(cles.map((cle) => caches.delete(cle)));
    }
  } catch (err) {
    console.warn('[PWA] Purge des caches partielle :', err);
  }

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  } catch (err) {
    console.warn('[PWA] Désinscription du Service Worker partielle :', err);
  }

  rechargementEnCours = true;
  // `?maj=` casse le cache HTTP du document lui-même.
  window.location.replace(`${window.location.pathname}?maj=${Date.now()}`);
}

/** Force une vérification immédiate auprès du serveur. */
export function checkForUpdate() {
  try {
    registrationCourante?.update?.().catch(() => {});
  } catch { /* sans conséquence */ }
}

/**
 * Point d'entrée. Sûr à appeler plusieurs fois et dans n'importe quel
 * environnement (SSR, tests, http:// non sécurisé, navigateur ancien).
 */
export function registerServiceWorker() {
  try {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Service Workers indisponibles hors contexte sécurisé (hors localhost).
    if (window.isSecureContext === false) return;

    // Le serveur de dev Vite sert les modules depuis un autre port : le SW
    // intercepterait des URL qui n'existent pas côté Laravel.
    if (import.meta.env?.DEV) {
      console.info('[PWA] Service Worker désactivé en développement.');
      return;
    }

    // Rechargement unique lorsque le nouveau SW prend le contrôle, et
    // uniquement si l'utilisateur a explicitement accepté la mise à jour.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!majAcceptee || rechargementEnCours) return;
      rechargementEnCours = true;
      window.location.reload();
    });

    const demarrer = () => {
      try {
        navigator.serviceWorker
          .register(`${SW_PATH}?v=${encodeURIComponent(BUILD_ID)}`, {
            scope: '/',
            // Ne jamais servir sw.js depuis le cache HTTP : nginx envoie
            // `Cache-Control: public, immutable` sur tous les `.js`.
            updateViaCache: 'none',
          })
          .then((registration) => {
            registrationCourante = registration;
            emettre(EVT_ENREGISTRE, { registration, buildId: BUILD_ID });

            // Une version installée attend déjà (onglet précédent, reload).
            if (registration.waiting && navigator.serviceWorker.controller) {
              signalerMiseAJour(registration.waiting);
            }

            surveillerInstallation(registration);

            // Vérifications périodiques + au retour de l'onglet et du réseau.
            setInterval(() => checkForUpdate(), INTERVALLE_VERIF);
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') checkForUpdate();
            });
            window.addEventListener('online', () => checkForUpdate());
          })
          .catch((err) => {
            console.warn('[PWA] Enregistrement du Service Worker échoué :', err);
          });
      } catch (err) {
        console.warn('[PWA] Enregistrement du Service Worker impossible :', err);
      }
    };

    // On attend `load` pour ne pas concurrencer le chargement initial.
    if (document.readyState === 'complete') demarrer();
    else window.addEventListener('load', demarrer, { once: true });

    // Outils de diagnostic pour le support terrain.
    window.secretisForcerMiseAJour = forceUpdate;
    window.__SECRETIS_PWA__ = {
      buildId: BUILD_ID,
      forcerMiseAJour: forceUpdate,
      verifier: checkForUpdate,
      appliquerMiseAJour: applyUpdate,
      registration: () => registrationCourante,
    };
  } catch (err) {
    // Jamais fatal : l'application doit démarrer même sans PWA.
    console.warn('[PWA] Initialisation ignorée :', err);
  }
}

export const EVENEMENTS = {
  MAJ_DISPONIBLE: EVT_MAJ_DISPONIBLE,
  ENREGISTRE:     EVT_ENREGISTRE,
};

export default registerServiceWorker;
