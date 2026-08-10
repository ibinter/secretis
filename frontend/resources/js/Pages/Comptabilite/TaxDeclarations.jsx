/**
 * Comptabilite/TaxDeclarations.jsx — Déclarations fiscales OHADA
 *
 * Props Inertia :
 *   preview     : données calculées (TVA, IS, PATENTE, CNPS)
 *   history     : déclarations passées
 *   fiscalYears : exercices
 *   filters     : filtres actifs
 *
 * Présentation migrée sur `@/Components/UI` + socle comptable partagé.
 * Le payload envoyé à `/comptabilite/declarations` est strictement inchangé.
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  DocumentTextIcon, PlusIcon, ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Card, EmptyState,
  cx, CONTROL, BORDER, SURFACE, SURFACE_SUNK,
  TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';
import { money, StatusBadge } from '@/Components/Comptabilite/accounting';

const TAX_TYPES = [
  { value: 'TVA',     label: 'TVA',     desc: 'Taxe sur la valeur ajoutée' },
  { value: 'IS',      label: 'IS',      desc: 'Impôt sur les sociétés' },
  { value: 'PATENTE', label: 'Patente', desc: 'Patente / Contribution forfaitaire' },
  { value: 'CNPS',    label: 'CNPS',    desc: 'Cotisations sociales' },
];

/* ─── Tuile de montant, alignée à droite ───────────────────────────────────── */

function AmountTile({ label, value, text, tone = 'neutral' }) {
  const toneClass = {
    neutral: TEXT_TITLE,
    danger:  'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
    success: 'text-emerald-600 dark:text-emerald-400',
  }[tone] ?? TEXT_TITLE;

  return (
    <div className={cx('rounded-lg border p-3', BORDER, SURFACE_SUNK)}>
      <p className={cx('text-xs', TEXT_MUTED)}>{label}</p>
      <p className={cx('mt-1 text-right text-base font-semibold whitespace-nowrap', NUM, toneClass)}>
        {text ?? money(value)}
      </p>
    </div>
  );
}

/* ─── Aperçus par type de déclaration ──────────────────────────────────────── */

function TvaPreview({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AmountTile label="TVA collectée"  value={data.tva_collectee} />
        <AmountTile label="TVA déductible" value={data.tva_deductible} />
        <AmountTile label="TVA nette due"  value={data.a_payer} tone="danger" />
      </div>

      {data.credit_report > 0 && (
        <p className={cx(
          'rounded-lg border px-3 py-2 text-sm',
          'border-sky-200 bg-sky-50 text-sky-700',
          'dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
        )}>
          Crédit de TVA à reporter :{' '}
          <span className={cx('font-semibold whitespace-nowrap', NUM)}>{money(data.credit_report)}</span>
        </p>
      )}

      <p className={cx('text-xs', TEXT_FAINT)}>
        Taux TVA : {(data.taux * 100).toFixed(0)} % · Comptes collecte : {data.breakdown?.comptes_collecte?.join(', ')}
        {' '}· Comptes déductible : {data.breakdown?.comptes_deductible?.join(', ')}
      </p>
    </div>
  );
}

function IsPreview({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AmountTile label="Chiffre d'affaires" value={data.chiffre_affaires} />
        <AmountTile label="Charges totales"    value={data.charges_totales} />
        <AmountTile label="Bénéfice fiscal"    value={data.benefice_fiscal} />
        <AmountTile label="Taux IS"            text={`${(data.taux_is * 100).toFixed(0)} %`} />
        <AmountTile label="IS calculé"         value={data.is_calcule} tone="danger" />
        <AmountTile label="IMF (minimum)"      value={data.imf} tone="warning" />
      </div>

      <div className={cx(
        'rounded-lg border px-3 py-2',
        'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10',
      )}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-red-700 dark:text-red-300">Montant à décaisser</span>
          <span className={cx('text-base font-semibold whitespace-nowrap text-red-700 dark:text-red-300', NUM)}>
            {money(data.montant_du)}
          </span>
        </div>
        {data.note && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{data.note}</p>}
      </div>
    </div>
  );
}

function CnpsPreview({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AmountTile label="Salaire brut"   value={data.salaire_brut} />
        <AmountTile label="Part patronale" value={data.cotisation_patronale} />
        <AmountTile label="Part salariale" value={data.cotisation_salariale} />
      </div>
      <div className={cx('flex items-baseline justify-between gap-3 rounded-lg border px-3 py-3', BORDER, SURFACE_SUNK)}>
        <span className={cx('text-sm font-medium', TEXT_TITLE)}>Total à verser à la CNPS</span>
        <span className={cx('text-lg font-semibold whitespace-nowrap', NUM, TEXT_TITLE)}>
          {money(data.total_a_verser)}
        </span>
      </div>
      {data.note && <p className={cx('text-xs', TEXT_FAINT)}>{data.note}</p>}
    </div>
  );
}

function PatentePreview({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AmountTile label="CA de référence"     value={data.chiffre_affaires} />
        <AmountTile label="Droit proportionnel" value={data.droit_proportionnel} />
        <AmountTile label="Droit fixe"          value={data.droit_fixe} />
      </div>
      <div className={cx('flex items-baseline justify-between gap-3 rounded-lg border px-3 py-3', BORDER, SURFACE_SUNK)}>
        <span className={cx('text-sm font-medium', TEXT_TITLE)}>Patente totale</span>
        <span className={cx('text-lg font-semibold whitespace-nowrap', NUM, TEXT_TITLE)}>
          {money(data.total)}
        </span>
      </div>
      {data.note && <p className={cx('text-xs', TEXT_FAINT)}>{data.note}</p>}
    </div>
  );
}

// ============================================================
// Page principale
// ============================================================
export default function TaxDeclarations({ preview, history, fiscalYears, filters }) {
  const [type, setType]   = useState(filters?.type || 'TVA');
  const [start, setStart] = useState(filters?.start || new Date().toISOString().slice(0, 7) + '-01');
  const [end, setEnd]     = useState(filters?.end   || new Date().toISOString().slice(0, 7) + '-28');
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    router.get('/comptabilite/declarations', { type, start, end });
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const payload = {
        declaration_type: type,
        period_start:     start,
        period_end:       end,
        base_amount:      preview.base_amount || preview.chiffre_affaires || preview.salaire_brut || 0,
        tax_rate:         preview.taux || preview.taux_is || 0,
        tax_amount:       preview.tva_collectee || preview.is_calcule || preview.total || preview.cotisation_patronale || 0,
        tax_credit:       preview.tva_deductible || 0,
        net_tax:          preview.a_payer || preview.montant_du || preview.total_a_verser || preview.total || 0,
      };
      await axios.post('/comptabilite/declarations', payload);
      toast.success('Déclaration enregistrée en brouillon');
      router.reload({ only: ['history'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (id) => {
    if (!confirm('Soumettre cette déclaration ?')) return;
    try {
      await axios.put(`/comptabilite/declarations/${id}/submit`);
      toast.success('Déclaration soumise');
      router.reload({ only: ['history'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const activeType = TAX_TYPES.find(t => t.value === type);

  return (
    <AuthLayout>
      <Head title="Déclarations fiscales OHADA" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={ReceiptPercentIcon}
          title="Déclarations fiscales"
          breadcrumbs={[{ label: 'Comptabilité', href: '/comptabilite' }, { label: 'Déclarations' }]}
          subtitle="Calcul automatique depuis les journaux SYSCOHADA — montants en FCFA (XOF)"
        />

        {/* Sélecteur type de déclaration */}
        <div className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {TAX_TYPES.map(t => {
            const active = type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                aria-pressed={active}
                className={cx(
                  'rounded-xl border p-4 text-left transition-colors',
                  active
                    ? 'border-purple-300 bg-purple-50 dark:border-purple-500/50 dark:bg-purple-500/10'
                    : cx(BORDER, SURFACE, 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'),
                  FOCUS_RING,
                )}
              >
                <p className={cx(
                  'text-sm font-semibold',
                  active ? 'text-purple-700 dark:text-purple-300' : TEXT_TITLE,
                )}>
                  {t.label}
                </p>
                <p className={cx('mt-0.5 text-xs', TEXT_MUTED)}>{t.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Calcul */}
          <Card
            className="lg:col-span-2"
            icon={DocumentTextIcon}
            title={`Calcul — ${activeType?.desc ?? type}`}
            subtitle="Choisissez une période puis lancez le calcul"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date" aria-label="Du"
                  className={cx(CONTROL, 'h-10 w-auto')}
                  value={start} onChange={e => setStart(e.target.value)}
                />
                <span className={cx('text-sm', TEXT_FAINT)}>→</span>
                <input
                  type="date" aria-label="Au"
                  className={cx(CONTROL, 'h-10 w-auto')}
                  value={end} onChange={e => setEnd(e.target.value)}
                />
                <Button variant="primary" onClick={refresh}>Calculer</Button>
              </div>
            }
          >
            {preview ? (
              <div className="space-y-4">
                {type === 'TVA'     && <TvaPreview data={preview} />}
                {type === 'IS'      && <IsPreview data={preview} />}
                {type === 'CNPS'    && <CnpsPreview data={preview} />}
                {type === 'PATENTE' && <PatentePreview data={preview} />}

                <div className="flex justify-end">
                  <Button variant="primary" icon={PlusIcon} loading={saving} onClick={handleSave}>
                    Sauvegarder en brouillon
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                compact
                variant="no-data"
                title="Aucun calcul lancé"
                description="Sélectionnez une période puis cliquez sur « Calculer » pour obtenir les montants déclarables."
              />
            )}
          </Card>

          {/* Historique */}
          <Card title="Historique" subtitle="Déclarations enregistrées">
            {history.length === 0 ? (
              <EmptyState
                compact
                icon={DocumentTextIcon}
                title="Aucune déclaration"
                description="Sauvegardez un calcul en brouillon pour le retrouver ici."
              />
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto">
                {history.map(decl => (
                  <li
                    key={decl.id}
                    className={cx('rounded-lg border p-3 transition-colors', BORDER,
                                  'hover:bg-gray-50 dark:hover:bg-white/[0.04]')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cx('text-xs font-semibold uppercase tracking-wide', TEXT_MUTED)}>
                        {decl.declaration_type}
                      </span>
                      <StatusBadge kind="declaration" status={decl.status} />
                    </div>
                    <p className={cx('mt-1 text-xs tabular-nums', TEXT_MUTED)}>
                      {decl.period_start} → {decl.period_end}
                    </p>
                    <p className={cx('mt-1 text-right text-sm font-semibold whitespace-nowrap', NUM, TEXT_TITLE)}>
                      {money(decl.net_tax)}
                    </p>
                    {decl.status === 'draft' && (
                      <div className="mt-2 flex justify-end">
                        <Button variant="subtle" size="xs" onClick={() => handleSubmit(decl.id)}>
                          Soumettre
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AuthLayout>
  );
}
export { TaxDeclarations };
