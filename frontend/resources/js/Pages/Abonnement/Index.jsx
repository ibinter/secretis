/**
 * Abonnement/Index.jsx — état de l'espace, plafonds et formules.
 *
 * Reprise complète pour les six états du cahier IBIG SOFT v1.1
 * (DEMO · Découverte · Essai · Formule active · Période de grâce · Lecture
 * seule). L'ancienne page ne connaissait que quatre statuts hérités, appelait
 * deux points d'API dont un inexistant (`/api/payments/history`), et annonçait
 * un accès « suspendu » — vocabulaire banni par la section 12.3, et faux : à
 * l'échéance l'espace passe en lecture seule, il n'est jamais coupé.
 *
 * ─── Deux règles tiennent tout le fichier ─────────────────────────────────
 *
 * 1. AUCUN CHIFFRE EN DUR. Ni durée d'essai, ni plafond, ni prix, ni durée de
 *    grâce, ni durée de conservation. Tout vient des props serveur, elles-mêmes
 *    lues dans `config/licence.config.json` et dans la table `plans`. Une
 *    mention dont le nombre n'est pas fourni n'est pas affichée avec une valeur
 *    devinée : elle n'est pas affichée du tout.
 *
 * 2. AUCUNE RÈGLE MÉTIER. L'état, les droits, les quotas et le message de
 *    bandeau sont calculés côté serveur. Cette page les met en page.
 *
 * ─── Props ────────────────────────────────────────────────────────────────
 *
 *   licence     prop Inertia PARTAGÉE (`LicenceService::etatComplet()`), lue
 *               via `useLicence()`. Voir le contrat dans `@/hooks/useLicence`.
 *
 *   palier      Le palier gratuit, tel que décrit en section 8.1 :
 *               { nom, prix, devise, resume, inclus[], exclus[],
 *                 utilisateurs, note }
 *
 *   formules    Grille payante INCHANGÉE (décision D1), lue dans `plans` :
 *               [{ slug, nom, prix, devise, periode, populaire, inclus[] }]
 *
 *   mentions    Les valeurs de la section C7, jamais recopiées ici :
 *               { essai_jours, grace_jours, retention_jours, filigrane }
 *
 *   formuleSuivante  { slug, nom, prix } — la formule immédiatement supérieure.
 */

import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
  BadgeCheck, Clock, ShieldCheck, AlertTriangle, Lock, Info,
  Check, Minus, CreditCard, Gauge,
} from 'lucide-react';
import AuthLayout from '@/Layouts/AuthLayout';
import useLicence, { ETATS } from '@/hooks/useLicence';
import {
  PageHeader, Button, Badge, Card, StatCard, EmptyState,
  cx, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, NUM, TONES,
} from '@/Components/UI';

/* ─── Présentation des six états ───────────────────────────────────────────── */
/* Uniquement du ton et de l'étiquette : le texte affiché reste celui du
   serveur. Les libellés viennent du glossaire canonique (section 12.3).      */

const ETAT_PRESENTATION = {
  [ETATS.DEMO]:    { etiquette: 'Démo publique',    ton: 'info',    icone: Info },
  [ETATS.FREE]:    { etiquette: 'Découverte',       ton: 'neutral', icone: ShieldCheck },
  [ETATS.TRIAL]:   { etiquette: 'Essai',            ton: 'info',    icone: Clock },
  [ETATS.ACTIVE]:  { etiquette: 'Formule active',   ton: 'success', icone: BadgeCheck },
  [ETATS.GRACE]:   { etiquette: 'Période de grâce', ton: 'warning', icone: AlertTriangle },
  [ETATS.EXPIRED]: { etiquette: 'Lecture seule',    ton: 'warning', icone: Lock },
};

/** Libellés des droits — noms de fonctions, aucune valeur chiffrée. */
const DROITS_LIBELLES = {
  ecriture:          'Création et modification',
  export:            'Export CSV, Excel et PDF',
  multi_utilisateur: 'Multi-utilisateur et rôles',
  api:               'API et intégrations',
  whatsapp:          'Relances automatiques WhatsApp',
  sms:               'Relances automatiques SMS',
  sara:              'Assistant IA SARA',
};

/** L'ordre d'affichage des droits, pour ne pas dépendre de l'ordre du JSON. */
const DROITS_ORDRE = [
  'ecriture', 'export', 'multi_utilisateur', 'api', 'whatsapp', 'sms', 'sara',
];

/* ─── Formatage ────────────────────────────────────────────────────────────── */

const nombre = (n) => Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

/** Un prix ne s'affiche que si le serveur l'a fourni : jamais de « 0 » deviné. */
const prix = (montant, devise) =>
  montant === null || montant === undefined
    ? null
    : `${nombre(montant)} ${devise ?? ''}`.trim();

const dateFr = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('fr-FR');
};

/* ─── Ligne « inclus / exclus » ────────────────────────────────────────────── */

function Ligne({ ouvert, children }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ouvert
        ? <Check className={cx('mt-0.5 h-4 w-4 shrink-0', TONES.success.icon)} aria-hidden="true" />
        : <Minus className={cx('mt-0.5 h-4 w-4 shrink-0', TEXT_FAINT)} aria-hidden="true" />}
      <span className={ouvert ? TEXT_TITLE : TEXT_MUTED}>{children}</span>
      <span className="sr-only">{ouvert ? '(inclus)' : '(non inclus)'}</span>
    </li>
  );
}

/* ─── Carte Découverte (texte officiel, section 8.1) ───────────────────────── */

function CarteDecouverte({ palier, actuel }) {
  if (!palier) return null;

  const montant = prix(palier.prix, palier.devise);

  return (
    <Card
      className={cx(actuel && cx('ring-2', 'ring-purple-500/40'))}
      title={
        <span className="flex items-center gap-2">
          {palier.nom}
          {actuel && <Badge variant="accent">Palier actuel</Badge>}
        </span>
      }
      subtitle="Pour découvrir"
    >
      <div className="space-y-4">
        <div>
          {montant && (
            <p className={cx('text-2xl font-semibold', TEXT_TITLE, NUM)}>{montant}</p>
          )}
          <p className={cx('text-sm', TEXT_MUTED)}>Gratuit à vie, sans carte bancaire</p>
        </div>

        {/* Plafond — résumé rédigé par le serveur, jamais recomposé ici. */}
        {palier.resume && (
          <div className={cx('flex items-center gap-2 rounded-lg px-3 py-2', TONES.neutral.soft)}>
            <Gauge className={cx('h-4 w-4 shrink-0', TONES.neutral.icon)} aria-hidden="true" />
            <span className={cx('text-sm font-medium', TEXT_TITLE)}>{palier.resume}</span>
          </div>
        )}

        <ul className="space-y-1.5">
          {(palier.inclus ?? []).map((item) => (
            <Ligne key={item} ouvert>{item}</Ligne>
          ))}
          {(palier.exclus ?? []).map((item) => (
            <Ligne key={item} ouvert={false}>{item}</Ligne>
          ))}
        </ul>

        {palier.note && (
          <p className={cx('text-xs leading-relaxed', TEXT_FAINT)}>{palier.note}</p>
        )}
      </div>
    </Card>
  );
}

/* ─── Carte d'une formule payante ──────────────────────────────────────────── */

function CarteFormule({ formule, actuelle }) {
  const montant = prix(formule.prix, formule.devise);

  return (
    <Card
      className={cx(actuelle && cx('ring-2', 'ring-emerald-500/40'))}
      title={
        <span className="flex items-center gap-2">
          {formule.nom}
          {actuelle   && <Badge variant="success">Formule en cours</Badge>}
          {formule.populaire && !actuelle && <Badge variant="accent">La plus choisie</Badge>}
        </span>
      }
    >
      <div className="space-y-4">
        <div>
          {montant
            ? <p className={cx('text-2xl font-semibold', TEXT_TITLE, NUM)}>{montant}</p>
            : <p className={cx('text-sm', TEXT_MUTED)}>Tarif communiqué sur demande</p>}
          {formule.periode && (
            <p className={cx('text-sm', TEXT_MUTED)}>{formule.periode}</p>
          )}
        </div>

        {formule.inclus?.length > 0 && (
          <ul className="space-y-1.5">
            {formule.inclus.map((item) => <Ligne key={item} ouvert>{item}</Ligne>)}
          </ul>
        )}

        {!actuelle && (
          <Button
            variant="primary"
            block
            icon={CreditCard}
            href={`/abonnement/checkout?plan=${encodeURIComponent(formule.slug)}`}
          >
            Activer {formule.nom}
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function AbonnementIndex({
  palier = null,
  formules = [],
  mentions = null,
  formuleSuivante = null,
}) {
  const {
    disponible, etat, formule, joursRestants, dateFin, datePurge,
    message, droits, quotas, filigrane,
  } = useLicence();

  const presentation = ETAT_PRESENTATION[etat] ?? null;
  const ton = TONES[presentation?.ton] ?? TONES.neutral;
  const Icone = presentation?.icone ?? Info;

  const listeQuotas = quotas ? Object.values(quotas) : [];
  const auPalierGratuit = etat === ETATS.FREE;

  return (
    <AuthLayout>
      <Head title="Abonnement" />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={BadgeCheck}
          title="Abonnement"
          subtitle="L'état de votre espace, ce qu'il ouvre, et les formules disponibles."
          breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Abonnement' }]}
        />

        {/* ─── État de l'espace ─────────────────────────────────────────── */}

        {!disponible ? (
          <Card>
            <EmptyState
              icon={Info}
              title="État de l'espace indisponible"
              description="L'état de licence n'a pas été transmis par le serveur. Rechargez la page ; s'il manque toujours, contactez le support."
            />
          </Card>
        ) : (
          <Card>
            <div className="flex flex-col gap-5">

              <div className="flex flex-wrap items-start gap-4">
                <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', ton.soft)}>
                  <Icone className={cx('h-5 w-5', ton.icon)} aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={cx('text-lg font-semibold', TEXT_TITLE)}>
                      {presentation?.etiquette ?? 'État de l\'espace'}
                    </h2>
                    {formule && <Badge variant="neutral">{formule}</Badge>}
                  </div>
                  {/* Texte officiel de la section 8.4, rédigé par le serveur. */}
                  {message && <p className={cx('text-sm', TEXT_MUTED)}>{message}</p>}
                </div>

                {formuleSuivante?.slug && etat !== ETATS.ACTIVE && (
                  <Button
                    variant="primary"
                    icon={CreditCard}
                    href={`/abonnement/checkout?plan=${encodeURIComponent(formuleSuivante.slug)}`}
                  >
                    Activer {formuleSuivante.nom}
                  </Button>
                )}
              </div>

              {/* Repères de dates et de durées — tous fournis par le serveur. */}
              {(joursRestants !== null || dateFin || datePurge) && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {joursRestants !== null && (
                    <StatCard
                      icon={Clock}
                      label="Jours restants"
                      value={joursRestants}
                      unit="j"
                      tone={presentation?.ton}
                    />
                  )}
                  {dateFin && (
                    <StatCard icon={BadgeCheck} label="Échéance" value={dateFr(dateFin)} />
                  )}
                  {datePurge && (
                    <StatCard
                      icon={ShieldCheck}
                      label="Données conservées jusqu'au"
                      value={dateFr(datePurge)}
                    />
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ─── Compteurs métier ─────────────────────────────────────────── */}

        {listeQuotas.length > 0 && (
          <Card
            title="Compteurs métier"
            subtitle="Ce qui reste ouvert à l'écriture sur la période en cours. L'excédent reste consultable."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {listeQuotas.map((q) => (
                <div
                  key={q.compteur}
                  className={cx('flex items-center justify-between gap-4 rounded-xl border px-4 py-3', BORDER)}
                >
                  <div className="min-w-0">
                    {/* `libelle` est fourni par le serveur quand il existe ;
                        à défaut on affiche la clé du compteur plutôt que
                        d'inventer un intitulé qui divergerait des autres
                        surfaces. */}
                    <p className={cx('text-sm font-medium', TEXT_TITLE)}>
                      {q.libelle ?? q.compteur}
                    </p>
                    <p className={cx('text-xs', TEXT_MUTED, NUM)}>
                      Période {q.periode}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cx('text-lg font-semibold', TEXT_TITLE, NUM)}>
                      {nombre(q.valeur)}
                      {q.plafond !== null && q.plafond !== undefined && (
                        <span className={cx('text-sm font-normal', TEXT_MUTED)}> / {nombre(q.plafond)}</span>
                      )}
                    </p>
                    {q.autorise === false && (
                      <Badge variant="warning" icon={Gauge}>Plafond atteint</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ─── Ce que l'état ouvre ──────────────────────────────────────── */}

        {droits && (
          <Card
            title="Ce que votre espace ouvre aujourd'hui"
            subtitle="Rien n'est masqué : ce qui est fermé est indiqué, et se rouvre en activant une formule."
          >
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {DROITS_ORDRE.filter((cle) => cle in droits).map((cle) => (
                <Ligne key={cle} ouvert={droits[cle] === true}>
                  {DROITS_LIBELLES[cle] ?? cle}
                </Ligne>
              ))}
            </ul>

            {filigrane && (
              <p className={cx('mt-4 text-xs leading-relaxed', TEXT_FAINT)}>
                Les documents générés portent la mention «&nbsp;{filigrane}&nbsp;».
              </p>
            )}
          </Card>
        )}

        {/* ─── Grille : Découverte en première position (correction C5) ──── */}

        {(palier || formules.length > 0) && (
          <section data-ibig-tarifs className="space-y-4">
            <h2 className={cx('text-lg font-semibold', TEXT_TITLE)}>Formules</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <CarteDecouverte palier={palier} actuel={auPalierGratuit} />
              {formules.map((f) => (
                <CarteFormule
                  key={f.slug}
                  formule={f}
                  actuelle={Boolean(formule) && f.nom === formule}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Mentions de la section C7 ────────────────────────────────── */}
        {/* Chaque mention est conditionnée à la présence de sa valeur : une
            durée absente fait disparaître la phrase, jamais apparaître un
            nombre choisi par le composant.                                  */}

        {mentions && (
          <Card title="Ce que vous devez savoir">
            <ul className={cx('space-y-2 text-sm', TEXT_MUTED)}>
              {mentions.essai_jours != null && (
                <li className="flex items-start gap-2">
                  <Check className={cx('mt-0.5 h-4 w-4 shrink-0', TONES.success.icon)} aria-hidden="true" />
                  <span>
                    Essai de <span className={NUM}>{mentions.essai_jours}</span> jours,
                    sans carte bancaire, sans engagement.
                  </span>
                </li>
              )}

              {palier?.nom && (
                <li className="flex items-start gap-2">
                  <Check className={cx('mt-0.5 h-4 w-4 shrink-0', TONES.success.icon)} aria-hidden="true" />
                  <span>
                    À la fin de l'essai, votre espace bascule automatiquement en {palier.nom}.
                    Aucune donnée n'est supprimée.
                  </span>
                </li>
              )}

              {mentions.grace_jours != null && mentions.retention_jours != null && (
                <li className="flex items-start gap-2">
                  <Check className={cx('mt-0.5 h-4 w-4 shrink-0', TONES.success.icon)} aria-hidden="true" />
                  <span>
                    <span className={NUM}>{mentions.grace_jours}</span> jours de grâce après
                    échéance, puis lecture seule. Données conservées{' '}
                    <span className={NUM}>{mentions.retention_jours}</span> jours.
                  </span>
                </li>
              )}

              {mentions.filigrane && palier?.nom && (
                <li className="flex items-start gap-2">
                  <Check className={cx('mt-0.5 h-4 w-4 shrink-0', TONES.success.icon)} aria-hidden="true" />
                  <span>
                    Les documents générés au palier {palier.nom} portent la mention
                    «&nbsp;{mentions.filigrane}&nbsp;».
                  </span>
                </li>
              )}
            </ul>
          </Card>
        )}

        <p className={cx('text-xs', TEXT_FAINT)}>
          Une question sur votre formule ?{' '}
          <Link href="/support/tickets/create" className="underline underline-offset-2">
            Écrivez au support
          </Link>
          .
        </p>
      </div>
    </AuthLayout>
  );
}

export { AbonnementIndex };
