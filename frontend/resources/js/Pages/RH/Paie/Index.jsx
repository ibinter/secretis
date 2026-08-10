/**
 * RH/Paie/Index.jsx — périodes de paie et paramétrage de l'entreprise.
 *
 * Le référentiel des TAUX (matière légale, commune à un pays) est géré par
 * IBIG. Cet écran-ci sert à la RH : ouvrir un mois, suivre les totaux, et
 * paramétrer ce qui est propre à l'entreprise — ses rubriques et son taux
 * d'accidents du travail.
 *
 * L'état du référentiel est affiché en tête, sans détour : tant que les taux du
 * pays ne sont pas confirmés sur texte officiel, la RH doit le savoir avant
 * d'imprimer quoi que ce soit.
 */

import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import {
  Wallet, CalendarPlus, ShieldCheck, AlertTriangle, CircleDashed,
  Plus, Trash2, ChevronRight, Users, ShieldAlert,
} from 'lucide-react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, EmptyState, Modal,
  cx, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, NUM,
} from '@/Components/UI';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const STATUTS = {
  draft:  { label: 'En cours', tone: 'warning' },
  closed: { label: 'Clôturée', tone: 'success' },
  paid:   { label: 'Réglée',   tone: 'info' },
};

const fmt = (n, devise = '') =>
  `${Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}${devise ? ' ' + devise : ''}`;

export default function PaieIndex({ periodes = [], effectif = 0, sansSalaire = 0, referentiel = {}, rubriques = [] }) {
  const maintenant = new Date();
  const [modaleMois, setModaleMois]   = useState(false);
  const [modaleRubrique, setModaleRubrique] = useState(false);

  const periode = useForm({ year: maintenant.getFullYear(), month: maintenant.getMonth() + 1 });
  const rubrique = useForm({
    code: '', label: '', type: 'earning',
    default_amount: '', percentage_of_base: '',
    subject_to_contributions: true, subject_to_income_tax: true,
  });

  const devise = periodes[0]?.currency ?? '';

  return (
    <AuthLayout>
      <Head title="Paie" />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={Wallet}
          title="Paie"
          subtitle="Périodes mensuelles, bulletins et paramétrage de votre entreprise."
          actions={
            <Button onClick={() => setModaleMois(true)} disabled={!referentiel.utilisable}>
              <CalendarPlus className="h-4 w-4" /> Ouvrir un mois
            </Button>
          }
        />

        {/* ── État du référentiel : la RH doit savoir sur quoi elle s'appuie ── */}
        {!referentiel.utilisable ? (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">La paie n'est pas encore utilisable pour votre pays.</p>
              <p className="mt-1">
                {referentiel.erreur
                  ?? `Les cotisations sociales de ${referentiel.nom ?? 'votre pays'} ne sont pas paramétrées. `
                     + `Contactez IBIG Soft : aucun bulletin ne peut être calculé tant que les taux ne sont pas saisis.`}
              </p>
            </div>
          </div>
        ) : !referentiel.toutes_confirmees ? (
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Taux non confirmés sur texte officiel.</p>
              <p className="mt-1">
                Les cotisations {referentiel.caisse ? `(${referentiel.caisse})` : ''} sont paramétrées mais
                n'ont pas encore été validées au regard des textes en vigueur. Les bulletins portent cette
                réserve — à lever avec votre comptable avant tout dépôt de déclaration.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-800">
            <ShieldCheck className="h-4 w-4" />
            Taux {referentiel.caisse} confirmés sur texte officiel.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Users}        label="Effectif actif"    value={effectif} />
          <StatCard icon={AlertTriangle} label="Sans salaire saisi" value={sansSalaire} />
          <StatCard icon={Wallet}       label="Périodes"          value={periodes.length} />
          <StatCard icon={CircleDashed} label="Rubriques"         value={rubriques.length} />
        </div>

        {sansSalaire > 0 && (
          <p className={cx('text-sm', TEXT_MUTED)}>
            {sansSalaire} salarié(s) actif(s) n'ont pas de salaire de base renseigné : leur bulletin
            ne pourra pas être calculé tant que leur fiche reste incomplète.
          </p>
        )}

        {/* ── Périodes ── */}
        <Card title="Périodes de paie">
          {periodes.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title="Aucune période ouverte"
              description="Ouvrez un mois pour calculer les bulletins de votre effectif."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                    <th className="px-2 py-2">Période</th>
                    <th className="px-2 py-2 text-right">Bulletins</th>
                    <th className="px-2 py-2 text-right">Brut</th>
                    <th className="px-2 py-2 text-right">Net à payer</th>
                    <th className="px-2 py-2 text-right">Charges patronales</th>
                    <th className="px-2 py-2">État</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {periodes.map((p) => {
                    const s = STATUTS[p.status] ?? STATUTS.draft;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => router.visit(`/rh/paie/periodes/${p.id}`)}
                        className={cx('cursor-pointer border-b hover:bg-purple-50/50', BORDER)}
                      >
                        <td className={cx('px-2 py-2.5 font-medium', TEXT_TITLE)}>{p.label}</td>
                        <td className={cx('px-2 py-2.5 text-right', NUM)}>{p.payslips}</td>
                        <td className={cx('px-2 py-2.5 text-right', NUM)}>{fmt(p.total_gross)}</td>
                        <td className={cx('px-2 py-2.5 text-right font-medium', NUM)}>{fmt(p.total_net, p.currency)}</td>
                        <td className={cx('px-2 py-2.5 text-right', NUM, TEXT_FAINT)}>{fmt(p.total_employer)}</td>
                        <td className="px-2 py-2.5"><Badge variant={s.tone}>{s.label}</Badge></td>
                        <td className="px-2 py-2.5 text-right">
                          <ChevronRight className={cx('inline h-4 w-4', TEXT_FAINT)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── Rubriques ── */}
        <Card
          title="Rubriques de paie"
          actions={
            <Button variant="subtle" onClick={() => setModaleRubrique(true)}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          }
        >
          <p className={cx('mb-3 text-sm', TEXT_MUTED)}>
            Primes, indemnités et retenues appliquées à tous les bulletins. Une rubrique peut être
            exonérée de cotisations, d'impôt, ou des deux — la prime de transport l'est souvent.
          </p>

          {rubriques.length === 0 ? (
            <p className={cx('text-sm', TEXT_FAINT)}>Aucune rubrique : seul le salaire de base est pris en compte.</p>
          ) : (
            <div className="space-y-2">
              {rubriques.map((r) => (
                <div key={r.id} className={cx('flex items-center justify-between rounded-lg border px-3 py-2', BORDER)}>
                  <div className="min-w-0">
                    <span className={cx('text-sm font-medium', TEXT_TITLE)}>{r.label}</span>
                    <span className={cx('ml-2 text-xs', TEXT_FAINT)}>{r.code}</span>
                    <div className={cx('text-xs', TEXT_MUTED)}>
                      {r.type === 'earning' ? 'Gain' : 'Retenue'}
                      {' · '}
                      {r.default_amount !== null
                        ? `${fmt(r.default_amount)} fixe`
                        : `${r.percentage_of_base} % du salaire de base`}
                      {!r.subject_to_contributions && ' · exonérée de cotisations'}
                      {!r.subject_to_income_tax && " · exonérée d'impôt"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer la rubrique « ${r.label} » ?`)) {
                        router.delete(`/rh/paie/rubriques/${r.id}`, { preserveScroll: true });
                      }
                    }}
                    className="rounded p-1.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Modale : ouvrir un mois ── */}
      {modaleMois && (
        <Modal open onClose={() => setModaleMois(false)} title="Ouvrir une période de paie">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Mois</span>
              <select
                value={periode.data.month}
                onChange={(e) => periode.setData('month', Number(e.target.value))}
                className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
              >
                {MOIS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Année</span>
              <input
                type="number"
                value={periode.data.year}
                onChange={(e) => periode.setData('year', Number(e.target.value))}
                className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
              />
            </label>
          </div>
          {periode.errors.periode && (
            <p className="mt-3 text-sm text-red-600">{periode.errors.periode}</p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModaleMois(false)}>Annuler</Button>
            <Button
              disabled={periode.processing}
              onClick={() => periode.post('/rh/paie/periodes', { onSuccess: () => setModaleMois(false) })}
            >
              Ouvrir
            </Button>
          </div>
        </Modal>
      )}

      {/* ── Modale : rubrique ── */}
      {modaleRubrique && (
        <Modal open onClose={() => setModaleRubrique(false)} title="Nouvelle rubrique" size="lg">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Code</span>
              <input
                value={rubrique.data.code}
                onChange={(e) => rubrique.setData('code', e.target.value.toUpperCase())}
                placeholder="TRANSP"
                className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
              />
            </label>
            <label className="block">
              <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Libellé</span>
              <input
                value={rubrique.data.label}
                onChange={(e) => rubrique.setData('label', e.target.value)}
                placeholder="Prime de transport"
                className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
              />
            </label>
            <label className="block">
              <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Nature</span>
              <select
                value={rubrique.data.type}
                onChange={(e) => rubrique.setData('type', e.target.value)}
                className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
              >
                <option value="earning">Gain — s'ajoute au brut</option>
                <option value="deduction">Retenue — se retranche du net</option>
              </select>
            </label>
            <div />
            <label className="block">
              <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Montant fixe</span>
              <input
                type="number"
                value={rubrique.data.default_amount}
                onChange={(e) => rubrique.setData({ ...rubrique.data, default_amount: e.target.value, percentage_of_base: '' })}
                className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
              />
            </label>
            <label className="block">
              <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>ou % du salaire de base</span>
              <input
                type="number" step="0.01"
                value={rubrique.data.percentage_of_base}
                onChange={(e) => rubrique.setData({ ...rubrique.data, percentage_of_base: e.target.value, default_amount: '' })}
                className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
              />
            </label>
          </div>

          {rubrique.data.type === 'earning' && (
            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rubrique.data.subject_to_contributions}
                  onChange={(e) => rubrique.setData('subject_to_contributions', e.target.checked)}
                />
                Soumise aux cotisations sociales
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rubrique.data.subject_to_income_tax}
                  onChange={(e) => rubrique.setData('subject_to_income_tax', e.target.checked)}
                />
                Soumise à l'impôt sur les salaires
              </label>
            </div>
          )}

          {rubrique.errors.rubrique && (
            <p className="mt-3 text-sm text-red-600">{rubrique.errors.rubrique}</p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModaleRubrique(false)}>Annuler</Button>
            <Button
              disabled={rubrique.processing}
              onClick={() => rubrique.post('/rh/paie/rubriques', {
                preserveScroll: true,
                onSuccess: () => { setModaleRubrique(false); rubrique.reset(); },
              })}
            >
              Enregistrer
            </Button>
          </div>
        </Modal>
      )}
    </AuthLayout>
  );
}
