/**
 * LectureSeule — marquage de l'excédent au-delà du plafond.
 *
 * Décision D6 du cahier (sections 5.6 et 8.4) : à la fin d'un essai, on ne
 * coupe rien et on ne supprime rien. L'espace bascule au palier Découverte,
 * et ce qui dépasse le plafond passe en LECTURE SEULE — visible, consultable,
 * exportable le jour où une formule rouvre l'export, et jamais masqué.
 *
 * Masquer l'excédent serait la faute la plus grave de tout le dispositif :
 * l'utilisateur croirait ses données perdues, ce qu'aucun écran ne doit
 * laisser entendre. Il est donc affiché comme les autres, avec une mention qui
 * dit exactement ce qui change — l'écriture — et rien de plus.
 *
 * L'INFORMATION VIENT DU SERVEUR. Un enregistrement porte un booléen
 * `lecture_seule` posé par la couche métier, qui seule sait quels
 * enregistrements dépassent le plafond de la période. Le navigateur ne
 * recompte jamais : il ne connaît ni la période du locataire, ni l'ordre
 * retenu, ni les suppressions.
 */

import React from 'react';
import { Lock } from 'lucide-react';
import { Badge, cx, TEXT_MUTED, TONES } from '@/Components/UI';

/**
 * Lit le drapeau serveur sur un enregistrement.
 * Tolère les deux nommages rencontrés dans les charges utiles JSON.
 */
export const estLectureSeule = (enregistrement) =>
  enregistrement?.lecture_seule === true || enregistrement?.read_only === true;

/** Pastille posée à côté du libellé d'une ligne en lecture seule. */
export function BadgeLectureSeule({ className = '', size = 'sm' }) {
  return (
    <Badge
      variant="neutral"
      size={size}
      icon={Lock}
      outline
      className={className}
      title="Consultation possible, modification fermée."
    >
      Lecture seule
    </Badge>
  );
}

/**
 * Bandeau de légende placé au-dessus d'une liste qui contient de l'excédent.
 *
 * Il explique le marquage une fois, plutôt que de répéter une phrase sur
 * chaque ligne. `nombre` vient du serveur : c'est un décompte de données, pas
 * un plafond de configuration.
 */
export function LegendeLectureSeule({ nombre, className = '' }) {
  if (!nombre) return null;

  const ton = TONES.neutral;

  return (
    <div
      className={cx(
        'flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm',
        ton.soft, ton.border, className,
      )}
      data-licence-lecture-seule
    >
      <Lock className={cx('mt-0.5 h-4 w-4 shrink-0', ton.icon)} aria-hidden="true" />
      <p className={TEXT_MUTED}>
        <strong className="font-medium">
          {nombre} enregistrement{nombre > 1 ? 's' : ''} en lecture seule.
        </strong>{' '}
        Ils restent affichés et consultables ; seule leur modification est
        fermée. Activez une formule pour les rouvrir à l'écriture.
      </p>
    </div>
  );
}

export default BadgeLectureSeule;
