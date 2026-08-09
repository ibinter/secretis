/**
 * PlafondAtteint — écran de refus d'écriture au plafond (section 8.5).
 *
 * S'affiche quand une écriture a été REFUSÉE PAR LE SERVEUR. Ce composant
 * n'anticipe rien et ne masque rien : il rend compte d'un refus déjà prononcé
 * dans la couche métier. Masquer le bouton en amont n'empêcherait personne
 * d'appeler l'API, et priverait l'utilisateur de l'explication.
 *
 * Le texte vient du serveur (`LicenceService::messageRefus()`), qui y injecte
 * le plafond, la formule suivante et son prix. Rien n'est recomposé ici : ni
 * chiffre, ni nom de palier, ni phrase officielle.
 *
 * Deux règles de ton, tenues par la section 5.6 :
 *   — rien n'est présenté comme perdu : les données restent accessibles et
 *     modifiables, et le texte officiel le dit en deuxième phrase ;
 *   — le refus laisse une porte de sortie qui n'est pas l'achat : le bouton
 *     secondaire « Continuer sans changer » referme l'écran sans rien exiger.
 *
 * Usage :
 *   const [refus, setRefus] = useState(null);
 *   ...
 *   catch (err) { setRefus(err.response?.data?.message ?? null); }
 *   ...
 *   <PlafondAtteintModal open={refus !== null} message={refus}
 *                        onClose={() => setRefus(null)} />
 */

import React from 'react';
import { router } from '@inertiajs/react';
import { Gauge } from 'lucide-react';
import { Button, Modal, cx, TEXT_TITLE, TEXT_MUTED, TONES } from '@/Components/UI';

/**
 * Repli quand le serveur n'a transmis aucun message.
 *
 * Cette phrase est le fragment de la section 8.5 qui ne contient ni chiffre,
 * ni nom de palier, ni prix : elle peut donc être écrite sans dupliquer une
 * valeur de configuration. Le reste du texte officiel n'est jamais reconstitué
 * côté client — s'il manque, c'est au serveur de le fournir.
 */
const REPLI = 'Vos données restent accessibles et modifiables.';

/** Corps du refus, réutilisable en bloc dans une page comme dans une fenêtre. */
export function PlafondAtteint({
  message,
  titre = 'Plafond atteint',
  hrefFormules = '/abonnement',
  onContinuer,
  className = '',
}) {
  const ton = TONES.warning;

  return (
    <div className={cx('flex flex-col gap-4', className)}>
      <div className="flex items-start gap-3">
        <span className={cx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', ton.soft)}>
          <Gauge className={cx('h-5 w-5', ton.icon)} aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-1">
          {titre && <p className={cx('font-semibold', TEXT_TITLE)}>{titre}</p>}
          {/* Texte officiel, affiché tel quel. */}
          <p className={cx('text-sm', TEXT_MUTED)}>{message || REPLI}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => router.visit(hrefFormules)}>
          Voir les formules
        </Button>
        <Button variant="secondary" onClick={onContinuer}>
          Continuer sans changer
        </Button>
      </div>
    </div>
  );
}

/** La même chose dans une fenêtre modale — forme courante après un refus d'API. */
export function PlafondAtteintModal({
  open = false,
  message,
  hrefFormules = '/abonnement',
  onClose,
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Plafond atteint">
      {/* Le titre est déjà porté par la fenêtre : ne pas le répéter. */}
      <PlafondAtteint
        message={message}
        titre={null}
        hrefFormules={hrefFormules}
        onContinuer={onClose}
      />
    </Modal>
  );
}

export default PlafondAtteint;
