/**
 * LicenceBanner — bandeau d'état permanent (cahier IBIG SOFT v1.1, section 8.4).
 *
 * CE COMPOSANT NE CALCULE RIEN.
 *
 * Le texte affiché est celui que le serveur a déjà rédigé
 * (`LicenceService::etatComplet()['message']`). Aucune durée, aucun plafond,
 * aucun prix n'est écrit ici : la section 12.1 l'interdit explicitement, et
 * une formulation qui varie d'un écran à l'autre donne l'impression de règles
 * qui varient.
 *
 * Ce qui est décidé ici, et rien d'autre : le TON. Un essai en cours est une
 * information, une période de grâce est un avertissement, un espace revenu au
 * palier Découverte après un essai est une situation stable qu'il faut
 * présenter comme telle — l'utilisateur vient de perdre des fonctions, pas ses
 * données (section 5.6).
 *
 * Le bandeau est permanent : il ne se ferme pas. Un état de licence n'est pas
 * une notification, c'est le cadre dans lequel l'espace fonctionne.
 */

import React from 'react';
import { Link } from '@inertiajs/react';
import { Info, Clock, ShieldCheck, AlertTriangle, Lock } from 'lucide-react';
import useLicence, { ETATS } from '@/hooks/useLicence';
import { cx, TONES } from '@/Components/UI';

/**
 * Ton, icône et libellé d'état par état de licence.
 *
 * `ACTIVE` est volontairement absent : un abonnement en cours n'a rien à
 * signaler, et le serveur ne produit d'ailleurs aucun message pour cet état.
 */
const PRESENTATION = {
  [ETATS.DEMO]: {
    ton: 'info',
    icone: Info,
    etiquette: 'Démo publique',
  },
  [ETATS.TRIAL]: {
    ton: 'info',
    icone: Clock,
    etiquette: 'Essai',
    // Le dernier jour, l'information devient un avertissement. Le texte, lui,
    // ne change pas de main : c'est toujours celui du serveur.
    tonDernierJour: 'warning',
  },
  [ETATS.FREE]: {
    // Ton neutre et icône rassurante : le palier Découverte est un état
    // stable, pas une sanction, et le message du serveur — qu'il s'adresse à
    // un espace neuf ou à un espace revenu d'essai — parle de données
    // conservées. Rien ici ne doit ressembler à une alerte.
    ton: 'neutral',
    icone: ShieldCheck,
    etiquette: 'Découverte',
  },
  [ETATS.GRACE]: {
    ton: 'warning',
    icone: AlertTriangle,
    etiquette: 'Période de grâce',
  },
  [ETATS.EXPIRED]: {
    ton: 'warning',
    icone: Lock,
    etiquette: 'Lecture seule',
  },
};

/** Le lien vers les formules n'a de sens que si une formule peut changer l'état. */
const AVEC_LIEN_FORMULES = [ETATS.FREE, ETATS.TRIAL, ETATS.GRACE, ETATS.EXPIRED];

export default function LicenceBanner({ className = '' }) {
  const { disponible, etat, message, joursRestants } = useLicence();

  // Prop partagée absente (page publique, session non authentifiée, middleware
  // pas encore passé) : on n'affiche rien plutôt qu'un état deviné.
  if (!disponible || !message) return null;

  const presentation = PRESENTATION[etat];
  if (!presentation) return null;

  // Choix de ton — présentation seule. Le message reste celui du serveur, qui
  // a déjà décidé s'il s'agissait du dernier jour d'essai.
  const dernierJourEssai =
    etat === ETATS.TRIAL && joursRestants !== null && joursRestants <= 1;

  const ton = TONES[
    (dernierJourEssai && presentation.tonDernierJour) || presentation.ton
  ] ?? TONES.neutral;

  const Icone = presentation.icone;

  return (
    // Pas de zone « live » : l'état de licence n'est pas une notification qui
    // survient, c'est le cadre permanent de l'espace. L'annoncer à chaque
    // navigation Inertia rendrait le lecteur d'écran bavard pour rien.
    <div
      aria-label="État de votre espace"
      className={cx(
        'flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2.5 text-sm sm:px-6',
        ton.soft,
        ton.border,
        'print:hidden',
        className,
      )}
      data-licence-etat={etat}
    >
      <Icone className={cx('h-4 w-4 shrink-0', ton.icon)} aria-hidden="true" />

      <span className={cx('text-[11px] font-semibold uppercase tracking-wider shrink-0', ton.text)}>
        {presentation.etiquette}
      </span>

      {/* Texte officiel — affiché tel quel, jamais reformulé côté client. */}
      <span className={cx('min-w-0 flex-1', ton.text)}>{message}</span>

      {AVEC_LIEN_FORMULES.includes(etat) && (
        <Link
          href="/abonnement"
          className={cx(
            'shrink-0 font-medium underline underline-offset-2 hover:no-underline',
            ton.text,
          )}
        >
          Voir les formules
        </Link>
      )}
    </div>
  );
}

export { LicenceBanner };
