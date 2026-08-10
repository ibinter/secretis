/**
 * SuperAdmin/Licences/Show.jsx — fiche licence d'un espace (section 12.6).
 *
 * Cinq actions, et pas une de plus. Ce qui n'est pas ici ne l'est pas par
 * oubli :
 *
 *   - aucun champ de durée d'essai. La durée vient de la configuration de la
 *     solution ; l'écran l'AFFICHE en lecture seule pour que le superadmin
 *     sache ce qu'il accorde, et n'offre aucun moyen de la changer. Le serveur
 *     refuse d'ailleurs en 422 toute requête qui en porterait une, parce que
 *     l'absence d'un champ n'a jamais empêché personne d'appeler une route ;
 *   - aucun champ de date de fin. Elle est calculée à partir de la formule :
 *     une licence sans échéance est structurellement impossible, jusque dans
 *     la contrainte de base `licenses_jamais_perpetuelle` ;
 *   - aucun champ de plafond. Relever une limite passe par une formule, pas
 *     par une faveur ;
 *   - aucun bouton de modification du journal. La table refuse UPDATE et
 *     DELETE : un journal retouchable ne prouve plus rien.
 */

import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import {
  KeyRound, PlayCircle, CalendarPlus, BadgeCheck, Download, Trash2,
  History, Gauge, AlertTriangle, ArrowLeft, Lock, Flame,
} from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, EmptyState, Modal, FormInput, Select,
  cx, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, NUM,
} from '@/Components/UI';

const TON_ETAT = {
  DEMO: 'neutral', FREE: 'info', TRIAL: 'accent',
  ACTIVE: 'success', GRACE: 'warning', EXPIRED: 'danger',
};

const CLE_GLOSSAIRE = {
  DEMO: 'demo_publique', FREE: 'gratuit', TRIAL: 'essai',
  ACTIVE: 'formule', GRACE: 'grace', EXPIRED: 'lecture_seule',
};

const TON_ACTEUR = { superadmin: 'accent', paiement: 'success', systeme: 'neutral' };

const fmt  = (n) => Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const jour = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
const dateHeure = (d) =>
  (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export default function LicenceShow({
  reglages, espace, licence, etat, etatStocke, complet, droits,
  quotas = [], journal = [], butees = [], formules = [], actions = {}, incoherences = [],
}) {
  const [ouvert, setOuvert] = useState(null); // 'essai' | 'prolongation' | 'activation' | 'purge'
  const glossaire = reglages?.glossaire ?? {};
  const libelle = (e) => glossaire[CLE_GLOSSAIRE[e]] ?? e;

  const base = `/superadmin/licences/${espace.id}`;
  const optionsFormule = formules.map((f) => ({
    value: f.slug,
    label: `${f.nom} — ${fmt(f.prix)} XOF / ${f.duration_months} mois`,
  }));

  const essai        = useForm({ formule: formules[0]?.slug ?? '' });
  const prolongation = useForm({ motif: '' });
  const activation   = useForm({ formule: formules[0]?.slug ?? '', reference: '' });
  const purge        = useForm({
    nom_espace: '', sauvegarde_froide: '',
    confirmation_une: false, confirmation_deux: false,
  });

  const fermer = () => setOuvert(null);

  const soumettre = (form, url) => (ev) => {
    ev.preventDefault();
    form.post(url, { preserveScroll: true, onSuccess: () => { form.reset(); fermer(); } });
  };

  const purgeArmee =
    purge.data.confirmation_une
    && purge.data.confirmation_deux
    && purge.data.nom_espace === espace.nom
    && purge.data.sauvegarde_froide.trim().length > 2;

  return (
    <SuperAdminLayout title={`Licence — ${espace.nom}`}>
      <Head title={`Licence — ${espace.nom}`} />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={KeyRound}
          title={espace.nom}
          subtitle={complet?.message ?? undefined}
          breadcrumbs={[
            { label: 'Administration', href: '/superadmin' },
            { label: 'Licences', href: '/superadmin/licences' },
            { label: espace.nom },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/superadmin/licences">
                <Button variant="ghost" icon={ArrowLeft}>Retour</Button>
              </Link>
              <Button
                variant="secondary"
                icon={Download}
                as="a"
                href={`${base}/export`}
                disabled={!actions.export?.possible}
              >
                Exporter les données
              </Button>
            </div>
          }
        />

        {/* ─── Bandeau d'état ──────────────────────────────────────────────── */}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="État"
            value={libelle(etat)}
            hint={etat}
            tone={TON_ETAT[etat] ?? 'neutral'}
          />
          <StatCard
            label="Formule"
            value={complet?.formule ?? '—'}
            hint={licence?.origine ? `origine : ${licence.origine}` : undefined}
          />
          <StatCard
            label="Jours restants"
            value={complet?.jours_restants ?? '—'}
            hint={complet?.date_fin ? `fin le ${jour(complet.date_fin)}` : 'sans échéance'}
            tone={complet?.jours_restants !== null && complet?.jours_restants <= reglages.preavis_jours
              ? 'warning' : 'neutral'}
          />
          <StatCard
            label="Conservation jusqu'au"
            value={complet?.date_purge ? jour(complet.date_purge) : '—'}
            hint={`${reglages.retention_jours} jour(s) après la période de grâce`}
          />
        </div>

        {etatStocke && etatStocke !== etat && (
          <div className={cx(
            'flex items-start gap-3 rounded-xl px-4 py-3 text-sm',
            'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200',
          )}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              L'état stocké (<strong>{etatStocke}</strong>) diffère de l'état calculé
              (<strong>{etat}</strong>). C'est l'état calculé qui s'applique ; la colonne n'est
              qu'un cache que la tâche de recalcul remet à jour.
            </span>
          </div>
        )}

        {/* ─── Contradictions propres à cet espace ─────────────────────────── */}

        {incoherences.length > 0 && (
          <Card icon={AlertTriangle} title="Contradictions relevées sur cet espace"
                subtitle="Affichées, non corrigées.">
            <ul className="space-y-3">
              {incoherences.map((a) => (
                <li key={a.code} className={cx('rounded-lg border p-3', BORDER)}>
                  <p className={cx('font-medium', TEXT_TITLE)}>{a.titre}</p>
                  <p className={cx('mt-1 text-sm', TEXT_MUTED)}>{a.explication}</p>
                  <p className={cx('mt-2 text-[11px] uppercase tracking-wide', TEXT_FAINT)}>
                    code : {a.code}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ─── Actions ─────────────────────────────────────────────────────── */}

        <Card
          title="Actions"
          subtitle="Cinq actions, encadrées. Ce qui n'y figure pas est interdit par le cahier, pas oublié."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ActionTuile
              icon={PlayCircle}
              titre="Démarrer un essai"
              detail={`Durée imposée : ${reglages.essai_jours} jour(s). Non modifiable.`}
              etat={actions.essai}
              onClick={() => setOuvert('essai')}
            />
            <ActionTuile
              icon={CalendarPlus}
              titre="Prolonger l'essai"
              detail={
                `${reglages.prolongation_jours} jour(s), `
                + `${reglages.prolongation_max} seule fois, motif obligatoire.`
              }
              etat={actions.prolongation}
              onClick={() => setOuvert('prolongation')}
            />
            <ActionTuile
              icon={BadgeCheck}
              titre="Activer une formule après paiement"
              detail="La date de fin est calculée à partir de la formule, jamais saisie."
              etat={actions.activation}
              onClick={() => setOuvert('activation')}
            />
            <ActionTuile
              icon={Trash2}
              titre="Déclencher une purge"
              detail="Double confirmation, nom de l'espace, sauvegarde froide, journalisation."
              etat={actions.purge}
              danger
              onClick={() => setOuvert('purge')}
            />
          </div>
        </Card>

        {/* ─── Quotas ──────────────────────────────────────────────────────── */}

        <Card
          icon={Gauge}
          title="Compteurs métier"
          subtitle={
            droits?.quotas
              ? `Palier ${reglages.palier_gratuit} — ${reglages.plafond_resume}.`
              : 'Cet état n\'est pas plafonné : les compteurs sont suivis mais n\'opposent aucun refus.'
          }
          flush
        >
          {quotas.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState icon={Gauge} title="Aucun compteur métier configuré"
                          description="La solution ne déclare aucun plafond." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                    <th className="px-4 py-2.5">Compteur</th>
                    <th className="px-4 py-2.5">Période</th>
                    <th className="px-4 py-2.5 text-right">Usage</th>
                    <th className="px-4 py-2.5 text-right">Plafond</th>
                    <th className="px-4 py-2.5 text-right">Restant</th>
                    <th className="px-4 py-2.5">Remise à zéro</th>
                  </tr>
                </thead>
                <tbody>
                  {quotas.map((q) => {
                    const part = q.plafond ? Math.min(100, Math.round((q.valeur / q.plafond) * 100)) : 0;

                    return (
                      <tr key={q.compteur} className={cx('border-b', BORDER)}>
                        <td className={cx('px-4 py-3 font-medium', TEXT_TITLE)}>
                          {q.compteur}
                          <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                            <div
                              className={cx('h-full rounded-full',
                                part >= 100 ? 'bg-red-500' : part >= 80 ? 'bg-amber-500' : 'bg-emerald-500')}
                              style={{ width: `${part}%` }}
                            />
                          </div>
                        </td>
                        <td className={cx('px-4 py-3', TEXT_MUTED)}>{q.periode}</td>
                        <td className={cx('px-4 py-3 text-right font-semibold', NUM, TEXT_TITLE)}>
                          {fmt(q.valeur)}
                        </td>
                        <td className={cx('px-4 py-3 text-right', NUM, TEXT_MUTED)}>
                          {q.plafond === null ? 'sans plafond' : fmt(q.plafond)}
                        </td>
                        <td className={cx('px-4 py-3 text-right', NUM,
                          q.restant === 0 ? 'font-semibold text-red-600 dark:text-red-400' : TEXT_MUTED)}>
                          {q.restant === null ? '—' : fmt(q.restant)}
                        </td>
                        <td className={cx('px-4 py-3 text-xs', TEXT_MUTED)}>
                          {q.remise_a_zero
                            ? <>{jour(q.remise_a_zero)} <span className={TEXT_FAINT}>({q.fuseau})</span></>
                            : <span className={TEXT_FAINT}>jamais — compteur cumulatif</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ─── Butées sur le plafond ───────────────────────────────────────── */}

        {butees.length > 0 && (
          <Card
            icon={Flame}
            title={`Tentatives refusées au plafond (${fmt(butees.length)})`}
            subtitle={
              butees.length >= reglages.seuil_prospect
                ? 'Cet espace figure dans l\'alerte commerciale : il a demandé plus que ce que son palier autorise.'
                : 'Suivi des refus opposés à cet espace.'
            }
            flush
          >
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white dark:bg-[#162032]">
                  <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                    <th className="px-4 py-2.5">Horodatage</th>
                    <th className="px-4 py-2.5">Compteur</th>
                    <th className="px-4 py-2.5 text-right">Valeur tentée</th>
                    <th className="px-4 py-2.5 text-right">Plafond</th>
                  </tr>
                </thead>
                <tbody>
                  {butees.map((h, i) => (
                    <tr key={i} className={cx('border-b', BORDER)}>
                      <td className={cx('px-4 py-2.5 text-xs', TEXT_MUTED)}>{dateHeure(h.created_at)}</td>
                      <td className={cx('px-4 py-2.5', TEXT_TITLE)}>{h.compteur}</td>
                      <td className={cx('px-4 py-2.5 text-right', NUM)}>{fmt(h.valeur_tentee)}</td>
                      <td className={cx('px-4 py-2.5 text-right', NUM, TEXT_MUTED)}>{fmt(h.plafond)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ─── Journal des transitions ─────────────────────────────────────── */}

        <Card
          icon={History}
          title="Journal des transitions"
          subtitle="État avant, état après, cause, acteur, horodatage."
          actions={
            <span className={cx('inline-flex items-center gap-1.5 text-xs', TEXT_FAINT)}>
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Consultable, non modifiable
            </span>
          }
          flush
        >
          {journal.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState
                icon={History}
                title="Aucune transition enregistrée"
                description="Cet espace n'a pas encore changé d'état depuis la mise en place du journal."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                    <th className="px-4 py-2.5">Horodatage</th>
                    <th className="px-4 py-2.5">Avant</th>
                    <th className="px-4 py-2.5">Après</th>
                    <th className="px-4 py-2.5">Cause</th>
                    <th className="px-4 py-2.5">Acteur</th>
                  </tr>
                </thead>
                <tbody>
                  {journal.map((t) => (
                    <tr key={t.id} className={cx('border-b align-top', BORDER)}>
                      <td className={cx('whitespace-nowrap px-4 py-3 text-xs', TEXT_MUTED)}>
                        {dateHeure(t.horodatage)}
                      </td>
                      <td className="px-4 py-3">
                        {t.etat_avant
                          ? <Badge variant={TON_ETAT[t.etat_avant] ?? 'neutral'}>{t.etat_avant}</Badge>
                          : <span className={TEXT_FAINT}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={TON_ETAT[t.etat_apres] ?? 'neutral'}>{t.etat_apres}</Badge>
                      </td>
                      <td className={cx('px-4 py-3', TEXT_TITLE)}>{t.cause}</td>
                      <td className="px-4 py-3">
                        <Badge variant={TON_ACTEUR[t.acteur] ?? 'neutral'}>{t.acteur}</Badge>
                        {t.acteur_nom && (
                          <div className={cx('mt-1 text-xs', TEXT_FAINT)}>{t.acteur_nom}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ─── Détail de la licence ────────────────────────────────────────── */}

        {licence && (
          <Card title="Licence courante" subtitle="Lecture seule — la console n'édite aucune de ces valeurs.">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {Object.entries(licence).map(([cle, valeur]) => (
                <div key={cle} className="flex items-baseline justify-between gap-4">
                  <dt className={cx('text-xs uppercase tracking-wide', TEXT_FAINT)}>{cle}</dt>
                  <dd className={cx('truncate text-sm', NUM, TEXT_TITLE)}>
                    {valeur === null || valeur === undefined
                      ? <span className={TEXT_FAINT}>—</span>
                      : String(valeur)}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>

      {/* ─── Démarrer un essai ──────────────────────────────────────────────── */}

      <Modal
        open={ouvert === 'essai'}
        onClose={fermer}
        title="Démarrer un essai"
        description={
          `La durée est celle de la solution : ${reglages.essai_jours} jour(s). `
          + 'Elle ne se règle pas espace par espace, et aucun champ ne le permet.'
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={fermer}>Annuler</Button>
            <Button
              type="submit"
              form="form-essai"
              loading={essai.processing}
              disabled={!essai.data.formule}
            >
              Démarrer l'essai
            </Button>
          </div>
        }
      >
        <form id="form-essai" onSubmit={soumettre(essai, `${base}/essai`)} className="space-y-4">
          <Select
            label="Formule évaluée"
            options={optionsFormule}
            value={essai.data.formule}
            onChange={(v) => essai.setData('formule', v)}
            error={essai.errors.formule}
            required
          />
          <ChampVerrouille
            libelle="Durée de l'essai"
            valeur={`${reglages.essai_jours} jour(s)`}
            raison="Imposée par la configuration de la solution. Une durée accordée au cas par cas
                    devient la règle que le client suivant réclamera."
          />
          <ChampVerrouille
            libelle="Date de fin"
            valeur="Calculée au démarrage"
            raison="Aucune licence ne peut être créée sans date de fin — la contrainte est portée
                    par la base, pas par la bonne volonté de l'écran."
          />
        </form>
      </Modal>

      {/* ─── Prolonger ──────────────────────────────────────────────────────── */}

      <Modal
        open={ouvert === 'prolongation'}
        onClose={fermer}
        title="Prolonger l'essai"
        description={
          `${reglages.prolongation_jours} jour(s) supplémentaires, `
          + `${reglages.prolongation_max} seule fois. Le motif est conservé au journal.`
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={fermer}>Annuler</Button>
            <Button
              type="submit"
              form="form-prolongation"
              loading={prolongation.processing}
              disabled={prolongation.data.motif.trim().length < 10}
            >
              Prolonger
            </Button>
          </div>
        }
      >
        <form
          id="form-prolongation"
          onSubmit={soumettre(prolongation, `${base}/prolongation`)}
          className="space-y-4"
        >
          <FormInput
            as="textarea"
            id="motif"
            label="Motif de la prolongation"
            required
            hint="Ce que le client a demandé, et ce qui a été convenu. Le journal le conservera tel quel."
            value={prolongation.data.motif}
            onChange={(ev) => prolongation.setData('motif', ev.target.value)}
            error={prolongation.errors.motif}
          />
          <ChampVerrouille
            libelle="Durée de la prolongation"
            valeur={`${reglages.prolongation_jours} jour(s)`}
            raison="Fixée par la configuration. Une seconde prolongation n'est pas prévue : elle
                    appelle une proposition commerciale, pas un délai supplémentaire."
          />
        </form>
      </Modal>

      {/* ─── Activer une formule ────────────────────────────────────────────── */}

      <Modal
        open={ouvert === 'activation'}
        onClose={fermer}
        title="Activer une formule après paiement"
        description="La date de fin découle de la durée de la formule choisie."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={fermer}>Annuler</Button>
            <Button
              type="submit"
              form="form-activation"
              loading={activation.processing}
              disabled={!activation.data.formule || activation.data.reference.trim().length < 3}
            >
              Activer
            </Button>
          </div>
        }
      >
        <form
          id="form-activation"
          onSubmit={soumettre(activation, `${base}/activation`)}
          className="space-y-4"
        >
          <Select
            label="Formule"
            options={optionsFormule}
            value={activation.data.formule}
            onChange={(v) => activation.setData('formule', v)}
            error={activation.errors.formule}
            required
          />
          <FormInput
            id="reference"
            label="Référence du paiement"
            required
            placeholder="Reçu, transaction mobile money, virement…"
            hint="Elle est conservée sur la licence et au journal : une activation sans trace de
                  paiement n'est pas vérifiable six mois plus tard."
            value={activation.data.reference}
            onChange={(ev) => activation.setData('reference', ev.target.value)}
            error={activation.errors.reference}
          />
          <ChampVerrouille
            libelle="Date de fin"
            valeur="Début + durée de la formule"
            raison="Ni saisie, ni omise. La période de grâce et la date de conservation en découlent."
          />
          <ChampVerrouille
            libelle="Plafonds"
            valeur="Ceux de la formule"
            raison="Relever une limite pour un seul espace est interdit : la formule est le seul
                    chemin, sans quoi la grille tarifaire ne décrit plus ce qui est vendu."
          />
        </form>
      </Modal>

      {/* ─── Purge ──────────────────────────────────────────────────────────── */}

      <Modal
        open={ouvert === 'purge'}
        onClose={fermer}
        title="Déclencher une purge"
        size="lg"
        description={
          'Action irréversible. La demande est journalisée et remise à l\'exploitation : '
          + 'la console ne supprime rien elle-même.'
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={fermer}>Annuler</Button>
            <Button
              type="submit"
              form="form-purge"
              variant="danger"
              loading={purge.processing}
              disabled={!purgeArmee}
            >
              Enregistrer la demande de purge
            </Button>
          </div>
        }
      >
        <form id="form-purge" onSubmit={soumettre(purge, `${base}/purge`)} className="space-y-4">
          <div className={cx(
            'flex items-start gap-3 rounded-lg px-4 py-3 text-sm',
            'bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-200',
          )}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Les données de <strong>{espace.nom}</strong> sont conservées
              {complet?.date_purge ? <> jusqu'au <strong>{jour(complet.date_purge)}</strong></> : null}.
              La purge n'est acceptée qu'après cette date, et jamais sans sauvegarde froide.
            </span>
          </div>

          <FormInput
            id="sauvegarde_froide"
            label="Référence de la sauvegarde froide"
            required
            placeholder="Nom de l'archive, support, date"
            hint="Sans cette référence, la demande est refusée. Supprimer sans sauvegarde n'est pas
                  une purge, c'est une perte."
            value={purge.data.sauvegarde_froide}
            onChange={(ev) => purge.setData('sauvegarde_froide', ev.target.value)}
            error={purge.errors.sauvegarde_froide}
          />

          <label className={cx('flex items-start gap-3 rounded-lg border p-3 text-sm', BORDER, TEXT_MUTED)}>
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={purge.data.confirmation_une}
              onChange={(ev) => purge.setData('confirmation_une', ev.target.checked)}
            />
            <span>Je confirme que la période de conservation est échue et que le client en a été informé.</span>
          </label>

          <label className={cx('flex items-start gap-3 rounded-lg border p-3 text-sm', BORDER, TEXT_MUTED)}>
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={purge.data.confirmation_deux}
              onChange={(ev) => purge.setData('confirmation_deux', ev.target.checked)}
            />
            <span>Je confirme que la sauvegarde froide indiquée existe et a été vérifiée.</span>
          </label>

          <FormInput
            id="nom_espace"
            label={`Saisissez « ${espace.nom} » pour confirmer`}
            required
            autoComplete="off"
            value={purge.data.nom_espace}
            onChange={(ev) => purge.setData('nom_espace', ev.target.value)}
            error={purge.errors.nom_espace}
          />
        </form>
      </Modal>
    </SuperAdminLayout>
  );
}

/* ─── Tuile d'action ────────────────────────────────────────────────────────
 * Une action indisponible n'est pas masquée : elle est désactivée AVEC sa
 * raison. Un bouton qui disparaît laisse croire à un bug ; un bouton grisé qui
 * explique pourquoi enseigne la règle.
 */
function ActionTuile({ icon: Icon, titre, detail, etat = {}, danger = false, onClick }) {
  const possible = etat.possible !== false;

  return (
    <button
      type="button"
      onClick={possible ? onClick : undefined}
      disabled={!possible}
      className={cx(
        'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
        BORDER,
        possible
          ? cx('hover:bg-gray-50 dark:hover:bg-white/[0.04]',
               danger && 'hover:border-red-300 dark:hover:border-red-500/40')
          : 'cursor-not-allowed opacity-60',
      )}
    >
      <span className={cx(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        danger
          ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
          : 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
      )}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className={cx('block font-medium', TEXT_TITLE)}>{titre}</span>
        <span className={cx('mt-0.5 block text-xs', TEXT_MUTED)}>{detail}</span>
        {!possible && etat.motif && (
          <span className={cx('mt-1.5 block text-xs italic', TEXT_FAINT)}>{etat.motif}</span>
        )}
      </span>
    </button>
  );
}

/* ─── Champ verrouillé ──────────────────────────────────────────────────────
 * Un paramètre imposé s'affiche, il ne se cache pas. Le superadmin doit voir
 * ce qu'il accorde ; il ne doit pas pouvoir le changer.
 */
function ChampVerrouille({ libelle, valeur, raison }) {
  return (
    <div className={cx('rounded-lg border px-3 py-2.5', BORDER, 'bg-gray-50 dark:bg-[#0F1923]')}>
      <div className="flex items-center justify-between gap-3">
        <span className={cx('text-sm font-medium', TEXT_MUTED)}>{libelle}</span>
        <span className={cx('inline-flex items-center gap-1.5 text-sm font-semibold', NUM, TEXT_TITLE)}>
          <Lock className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
          {valeur}
        </span>
      </div>
      <p className={cx('mt-1 text-xs', TEXT_FAINT)}>{raison}</p>
    </div>
  );
}
