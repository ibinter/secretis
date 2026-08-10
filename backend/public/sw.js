/* eslint-disable no-restricted-globals */
/**
 * SECRETIS ERP — Service Worker
 * ---------------------------------------------------------------------------
 * Objectif : mode hors-ligne réellement opérationnel (coupures réseau/électriques
 * fréquentes en Afrique de l'Ouest et du Centre), SANS réintroduire le bug de
 * cache périmé après déploiement (pages 404 fantômes).
 *
 * PRINCIPE D'INVALIDATION
 *   Le nom du cache n'est PAS écrit en dur. Il est dérivé du paramètre `?v=`
 *   ajouté à l'URL d'enregistrement par `resources/js/pwa/registerServiceWorker.js`.
 *   Ce paramètre vaut le hash du bundle Vite courant (ex. `app-B7xK2q9F.js`).
 *   Conséquences :
 *     - un nouveau build => nouvelle URL de SW => le navigateur télécharge un
 *       nouveau script (contourne le `Cache-Control: immutable` de nginx sur *.js) ;
 *     - un nouveau build => nouveau CACHE_NAME => l'ancien cache est purgé à
 *       l'activation. Plus besoin d'incrémenter un numéro à la main.
 *
 * STRATÉGIES
 *   - Requêtes non-GET, tierces, API/auth      : réseau direct (le SW ne s'en mêle pas)
 *   - Assets buildés/statiques (URL hachée)    : cache-first (immuables par construction)
 *   - Navigations (documents HTML)             : network-first, repli /offline.html
 *   - Documents privés (Cache-Control private) : jamais mis en cache (postes partagés)
 * ---------------------------------------------------------------------------
 */

'use strict';

// ─── Version du cache, dérivée de l'URL d'enregistrement ─────────────────────
const BUILD_ID = (() => {
  try {
    return new URL(self.location.href).searchParams.get('v') || 'dev';
  } catch {
    return 'dev';
  }
})();

const CACHE_PREFIX = 'secretis-';
const CACHE_NAME   = CACHE_PREFIX + BUILD_ID;
const OFFLINE_URL  = '/offline.html';

// Ressources indispensables au mode hors-ligne. Chacune est mise en cache
// individuellement : un 404 sur une icône ne doit pas faire échouer l'install.
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
];

// ─── Chemins que le Service Worker ne doit JAMAIS intercepter ────────────────
// Données authentifiées et multi-tenant : aucune mise en cache possible.
const NEVER_HANDLE = [
  /^\/api\//,
  /^\/sanctum\//,
  /^\/broadcasting\//,
  /^\/livewire(\/|$)/,
  /^\/login(\/|$)/,
  /^\/logout(\/|$)/,
  /^\/register(\/|$)/,
  /^\/password(\/|$)/,
  /^\/two-factor(\/|$)/,
  /^\/telescope(\/|$)/,
  /^\/horizon(\/|$)/,
  /^\/sw\.js$/,
  /^\/build\/manifest\.json$/,
  /^\/build\/\.vite\//,
  /^\/hot$/,
];

// ─── Assets statiques : URL hachée ou extension inerte => cache-first ────────
const STATIC_EXT = /\.(?:js|mjs|css|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot)$/i;

function isNeverHandled(pathname) {
  return NEVER_HANDLE.some((re) => re.test(pathname));
}

function isStaticAsset(url) {
  if (url.pathname.startsWith('/build/')) return true;
  if (url.pathname.startsWith('/assets/')) return true;
  return STATIC_EXT.test(url.pathname);
}

/** Contrôles communs : réponse exploitable et stockable. */
function isStorable(response) {
  if (!response || !response.ok) return false;
  if (response.status === 206) return false;          // contenu partiel (vidéo/PDF)
  if (response.type === 'opaque') return false;
  const cc = (response.headers.get('Cache-Control') || '').toLowerCase();
  return !cc.includes('no-store');                    // seul `no-store` interdit le stockage
}

/**
 * Assets (JS/CSS/images/polices) : contenu identique pour tous les utilisateurs,
 * et URL hachée par Vite. `private` et `no-cache` n'interdisent pas le stockage
 * dans un cache privé — on ne bloque que sur `no-store`.
 */
function isCacheableAsset(response) {
  return isStorable(response);
}

/**
 * Documents HTML : posture volontairement plus stricte que la spec HTTP.
 * Un document Laravel authentifié (`Cache-Control: no-cache, private`) contient
 * le `data-page` Inertia, donc les données de l'utilisateur connecté. Sur un
 * poste partagé — courant chez nos clients — le mettre en cache l'exposerait à
 * l'utilisateur suivant. On ne conserve que des documents explicitement publics.
 */
function isCacheableDocument(response) {
  if (!isStorable(response)) return false;
  const cc = (response.headers.get('Cache-Control') || '').toLowerCase();
  if (cc.includes('private') || cc.includes('no-cache')) return false;
  return true;
}

// ─── Installation ────────────────────────────────────────────────────────────
// Pas de skipWaiting() ici : le nouveau SW attend que l'utilisateur accepte la
// mise à jour (bandeau « Nouvelle version disponible »). Cela évite de recharger
// la page sous les doigts d'un utilisateur en train de saisir un formulaire.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache
            .add(new Request(url, { cache: 'reload' }))
            .catch((err) => console.warn('[SW] Pré-cache ignoré :', url, err))
        )
      );
    })()
  );
});

// ─── Activation : purge de tous les caches d'anciennes versions ──────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME) // purge aussi les anciens noms (« secretis-v12 »…)
          .map((key) => caches.delete(key))
      );

      // Navigation Preload : accélère la première navigation quand le SW démarre.
      if (self.registration.navigationPreload) {
        try { await self.registration.navigationPreload.enable(); } catch { /* non supporté */ }
      }

      await self.clients.claim();

      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach((client) =>
        client.postMessage({ type: 'SW_ACTIVATED', version: BUILD_ID, cache: CACHE_NAME })
      );
    })()
  );
});

// ─── Messages venant de l'application ────────────────────────────────────────
self.addEventListener('message', (event) => {
  const { type } = event.data || {};
  const reply = (payload) => {
    if (event.ports && event.ports[0]) event.ports[0].postMessage(payload);
  };

  switch (type) {
    // L'utilisateur a cliqué « Mettre à jour » : le SW en attente prend la main.
    case 'SKIP_WAITING':
      self.skipWaiting();
      reply({ ok: true });
      break;

    case 'GET_VERSION':
      reply({ version: BUILD_ID, cache: CACHE_NAME });
      break;

    // Escape hatch : purge totale déclenchée depuis l'interface.
    case 'CLEAR_CACHES':
      event.waitUntil(
        (async () => {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
          reply({ cleared: true });
        })()
      );
      break;

    // La file d'attente d'actions hors-ligne (IndexedDB) n'est pas implémentée.
    // On répond tout de même pour éviter que usePwa n'attende 3 s dans le vide.
    case 'GET_PENDING_COUNT':
      reply({ type: 'PENDING_COUNT', count: 0 });
      break;

    case 'QUEUE_ACTION':
    case 'SYNC_NOW':
      reply({ supported: false, count: 0 });
      break;

    default:
      reply(null);
  }
});

// ─── Stratégies ──────────────────────────────────────────────────────────────

/** Assets hachés : immuables. Le cache fait autorité, le réseau ne sert qu'au premier accès. */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (isCacheableAsset(response)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    // Hors-ligne et jamais vu : on tente une correspondance sans query string.
    const fallback = await caches.match(request, { ignoreSearch: true });
    if (fallback) return fallback;
    throw err;
  }
}

/**
 * Navigations : le réseau fait toujours autorité (aucun HTML périmé servi tant
 * que la connexion répond). En cas d'échec réseau : page hors-ligne statique.
 */
async function handleNavigation(event) {
  try {
    const preloaded = event.preloadResponse ? await event.preloadResponse : null;
    if (preloaded) {
      if (isCacheableDocument(preloaded)) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, preloaded.clone()).catch(() => {});
      }
      return preloaded;
    }

    const response = await fetch(event.request);
    if (isCacheableDocument(response)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    // 1) même page déjà vue et publiquement cacheable
    const cached = await caches.match(event.request);
    if (cached) return cached;

    // 2) page hors-ligne pré-cachée
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;

    // 3) dernier recours : réponse minimale (le pré-cache a échoué)
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Hors ligne</title>' +
        '<body style="font-family:system-ui;text-align:center;padding:4rem">' +
        '<h1>Vous êtes hors ligne</h1>' +
        '<p>Vérifiez votre connexion internet puis réessayez.</p>' +
        '<button onclick="location.reload()">Réessayer</button></body>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

// ─── Interception ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Seules les lectures sont gérées ; POST/PUT/DELETE passent en direct.
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Ressources tierces (CDN, tuiles de carte…) : pas d'interception.
  if (url.origin !== self.location.origin) return;

  // API, authentification, SW lui-même : jamais interceptés.
  if (isNeverHandled(url.pathname)) return;

  // Requêtes Inertia (XHR) : elles transportent les props de l'utilisateur.
  if (request.headers.get('X-Inertia')) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Tout le reste : réseau direct, sans mise en cache.
});
