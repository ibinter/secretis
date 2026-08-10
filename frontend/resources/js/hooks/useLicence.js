/**
 * useLicence — lecture de l'état de licence, des droits et des quotas.
 *
 * CE HOOK NE DÉCIDE RIEN.
 *
 * Le cahier IBIG SOFT v1.1 (section 2) est catégorique : l'état est calculé
 * côté serveur à chaque requête, et une valeur d'état reçue du navigateur est
 * ignorée. Le contrôle de quota se fait à l'ÉCRITURE, dans la couche métier —
 * masquer un bouton n'empêche personne d'appeler l'API.
 *
 * Ce hook se contente donc de LIRE la prop Inertia partagée `licence`, produite
 * par `LicenceService::etatComplet()`. Il ne calcule ni durée, ni plafond, ni
 * reste à consommer, et n'écrit rien dans `localStorage`. Aucun nombre, aucune
 * phrase officielle n'est écrit ici : tout vient du serveur.
 *
 * ─── Contrat de la prop partagée `licence` ─────────────────────────────────
 *   {
 *     etat            'DEMO'|'FREE'|'TRIAL'|'ACTIVE'|'GRACE'|'EXPIRED',
 *     solution        string,
 *     formule         string|null,      // nom de la formule payante en cours
 *     jours_restants  number|null,
 *     date_fin        'YYYY-MM-DD'|null,
 *     date_purge      'YYYY-MM-DD'|null,
 *     droits          { ecriture, export, api, multi_utilisateur, sara,
 *                       whatsapp, sms, filigrane, quotas },
 *     quotas          { [compteur]: { compteur, valeur, plafond, restant,
 *                                     autorise, periode, mensuel } },
 *     plafond_resume  string,           // résumé du plafond, rédigé côté serveur
 *     filigrane       string|null,
 *     message         string|null,      // texte officiel 8.4, déjà rédigé
 *     prolongeable    boolean,
 *   }
 *
 * La prop peut être absente : page publique, session non authentifiée, ou
 * middleware de partage pas encore passé. Ce cas est traité explicitement —
 * voir `disponible` ci-dessous — et ne doit jamais faire tomber un écran.
 */

import { usePage } from '@inertiajs/react';

/** Les six états du cahier. Exportés pour éviter les chaînes libres ailleurs. */
export const ETATS = {
  DEMO:    'DEMO',
  FREE:    'FREE',
  TRIAL:   'TRIAL',
  ACTIVE:  'ACTIVE',
  GRACE:   'GRACE',
  EXPIRED: 'EXPIRED',
};

/** Forme neutre servie quand le serveur n'a rien partagé. */
const ABSENTE = {
  etat: null,
  solution: null,
  formule: null,
  jours_restants: null,
  date_fin: null,
  date_purge: null,
  droits: null,
  quotas: null,
  plafond_resume: null,
  filigrane: null,
  message: null,
  prolongeable: false,
};

export function useLicence() {
  const page = usePage();
  const brute = page?.props?.licence ?? null;
  const disponible = Boolean(brute && brute.etat);
  const licence = disponible ? brute : ABSENTE;

  // `etatComplet()` imbrique les droits sous `droits`. Un autre chantier lit
  // déjà `licence.sara` à plat (Components/Layout/AppLayout.jsx). Les deux
  // formes sont acceptées ici le temps que le contrat soit tranché — sans quoi
  // l'une des deux lectures renverrait silencieusement `undefined`.
  const droits = licence.droits ?? null;
  const quotas = licence.quotas ?? null;

  /**
   * Un droit ponctuel : export, api, sara, multi_utilisateur, whatsapp, sms…
   *
   * Quand l'état n'est pas connu du navigateur, la réponse est PERMISSIVE.
   * Deux raisons : le serveur reste seul juge et refusera l'appel de toute
   * façon ; et un défaut restrictif ferait disparaître des boutons sur tous
   * les écrans à la moindre requête où la prop n'est pas partagée — une panne
   * silencieuse bien pire que la fonction refusée à l'appel.
   */
  const peut = (droit) => {
    if (droits) return droits[droit] === true;
    if (disponible && typeof brute?.[droit] === 'boolean') return brute[droit];
    return true;
  };

  /** Le quota d'un compteur métier, tel que le serveur l'a calculé. */
  const quota = (compteur) => quotas?.[compteur] ?? null;

  /**
   * L'écriture d'un compteur est-elle encore ouverte ?
   *
   * On relaie `autorise`, décidé par le serveur. On ne compare jamais
   * `valeur` à `plafond` ici : ce serait dupliquer la règle métier, et les
   * deux versions finiraient par diverger.
   */
  const ecritureOuverte = (compteur) => {
    const q = quota(compteur);
    if (!q) return true;
    return q.autorise !== false;
  };

  return {
    /** false = le serveur n'a rien partagé : n'affichez aucune mention de licence. */
    disponible,

    etat:           licence.etat,
    solution:       licence.solution,
    formule:        licence.formule,
    joursRestants:  licence.jours_restants,
    dateFin:        licence.date_fin,
    datePurge:      licence.date_purge,
    plafondResume:  licence.plafond_resume,
    filigrane:      licence.filigrane,
    /** Texte officiel de bannière (section 8.4), rédigé côté serveur. */
    message:        licence.message,
    prolongeable:   licence.prolongeable === true,

    droits,
    quotas,

    peut,
    quota,
    ecritureOuverte,

    /** Écriture globalement fermée (état de lecture seule). */
    lectureSeule: peut('ecriture') === false,

    /** L'objet brut, pour les rares écrans qui ont besoin d'un champ non exposé. */
    brut: disponible ? brute : null,
  };
}

/** Raccourci : `const peutExporter = useDroit('export')`. */
export function useDroit(droit) {
  return useLicence().peut(droit);
}

/** Raccourci : `const q = useQuota('courriers_mois')`. */
export function useQuota(compteur) {
  return useLicence().quota(compteur);
}

export default useLicence;
