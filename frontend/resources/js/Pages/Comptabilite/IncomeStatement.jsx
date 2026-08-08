/**
 * Comptabilite/IncomeStatement.jsx — Compte de résultat SYSCOHADA
 *
 * Props Inertia :
 *   data        : résultat du SyscohadaService::generateIncomeStatement()
 *   fiscalYears : liste exercices
 *   selectedFY  : exercice courant
 *
 * Présentation migrée sur `@/Components/UI` + socle comptable partagé.
 * Aucun solde n'est recalculé : tous les montants proviennent de `data`.
 * Convention comptable conservée : un montant négatif s'affiche entre
 * parenthèses, et en rouge sémantique sur les soldes de gestion.
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  ArrowDownTrayIcon, ChevronDownIcon, ChevronRightIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Card, StatCard, EmptyState,
  cx, CONTROL, SURFACE_SUNK, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI';
import {
  amount, money, balanceTone, TABLE_HEAD, TH_CELL, TFOOT,
} from '@/Components/Comptabilite/accounting';

/** Montant de compte de résultat : négatif entre parenthèses. */
const cr = (v) => {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const a = amount(Math.abs(Number(v)));
  return Number(v) < 0 ? `(${a})` : a;
};

const pct = (v, base) => {
  if (!base || base === 0) return '—';
  return (Math.abs(v / base) * 100).toFixed(1) + ' %';
};

// Ligne du tableau CR
function CRRow({ label, value, base, isTotal, indent = 0, bold, highlight }) {
  const strong = bold || isTotal;

  return (
    <tr className={cx(
      isTotal && cx(SURFACE_SUNK, 'border-y border-gray-200 dark:border-[#1E3048]'),
      highlight && !isTotal && 'bg-gray-50/60 dark:bg-white/[0.02]',
    )}>
      <td
        className={cx('py-2 pr-4 text-sm', strong ? cx('font-semibold', TEXT_TITLE) : TEXT_MUTED)}
        style={{ paddingLeft: `${16 + indent * 20}px` }}
      >
        {label}
      </td>
      <td className={cx(
        'px-4 py-2 text-right whitespace-nowrap', NUM,
        strong && 'font-semibold',
        highlight ? balanceTone(value) : TEXT_TITLE,
      )}>
        {cr(value)}
      </td>
      <td className={cx('px-4 py-2 text-right text-xs whitespace-nowrap', NUM, TEXT_FAINT)}>
        {pct(value, base)}
      </td>
    </tr>
  );
}

// Section pliable
function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <tr className={cx(SURFACE_SUNK, 'cursor-pointer select-none')} onClick={() => setOpen(o => !o)}>
        <td colSpan={3} className="px-4 py-2.5">
          <span className={cx('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider', TEXT_MUTED)}>
            {open ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
            {title}
          </span>
        </td>
      </tr>
      {open && children}
    </>
  );
}

export default function IncomeStatement({ data, fiscalYears, selectedFY }) {
  const [selectedId, setSelectedId] = useState(selectedFY?.id || '');

  const handleFYChange = (id) => {
    setSelectedId(id);
    router.get('/comptabilite/compte-de-resultat', { fiscal_year_id: id });
  };

  const exportPdf = () => {
    window.open(`/comptabilite/compte-de-resultat/pdf?fiscal_year_id=${selectedId}`, '_blank');
  };

  const ca = data?.chiffre_affaires || 0;

  // Données pour graphique
  const chartData = data ? [
    { name: 'CA', valeur: data.chiffre_affaires },
    { name: 'VA', valeur: data.valeur_ajoutee },
    { name: 'EBE', valeur: data.ebe },
    { name: 'REX', valeur: data.rex },
    { name: 'RAO', valeur: data.rao },
    { name: 'RNE', valeur: data.resultat_net },
  ] : [];

  return (
    <AuthLayout>
      <Head title="Compte de résultat SYSCOHADA" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={ChartBarIcon}
          title="Compte de résultat"
          breadcrumbs={[{ label: 'Comptabilité', href: '/comptabilite' }, { label: 'Compte de résultat' }]}
          subtitle="SYSCOHADA Révisé 2017 (BCEAO) — montants en FCFA (XOF)"
          actions={
            <>
              <select
                className={cx(CONTROL, 'h-10 w-auto min-w-[200px]')}
                value={selectedId}
                onChange={e => handleFYChange(e.target.value)}
                aria-label="Exercice fiscal"
              >
                <option value="">Sélectionner un exercice</option>
                {fiscalYears.map(fy => (
                  <option key={fy.id} value={fy.id}>{fy.name}</option>
                ))}
              </select>
              {data && (
                <Button variant="secondary" icon={ArrowDownTrayIcon} onClick={exportPdf}>
                  PDF
                </Button>
              )}
            </>
          }
        />

        {!data ? (
          <EmptyState
            bordered
            icon={ChartBarIcon}
            title="Aucun exercice sélectionné"
            description="Choisissez un exercice fiscal pour afficher le compte de résultat et les soldes intermédiaires de gestion."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

            {/* Tableau CR */}
            <Card
              className="xl:col-span-2"
              flush
              title={selectedFY?.name ?? 'Exercice'}
              subtitle={data.period?.end ? `Exercice clos le ${data.period.end}` : undefined}
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className={TABLE_HEAD}>
                    <tr>
                      <th scope="col" className={cx(TH_CELL, 'text-left')}>Intitulé</th>
                      <th scope="col" className={cx(TH_CELL, 'text-right w-44')}>Exercice N</th>
                      <th scope="col" className={cx(TH_CELL, 'text-right w-24')}>% CA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#1E3048]">

                    <Section title="Produits d'activités ordinaires">
                      <CRRow label="Ventes de marchandises et services (701-707)" value={data.chiffre_affaires} base={ca} />
                      <CRRow label="Autres produits (71, 72, 75)" value={data.autres_produits} base={ca} indent={1} />
                      <CRRow label="Production de l'exercice" value={data.production_exercice} base={ca} isTotal />
                    </Section>

                    <Section title="Charges d'activités ordinaires">
                      <CRRow label="Achats de marchandises (601-608)" value={-data.achats_consommes} base={ca} indent={1} />
                      <CRRow label="Transports (611-618)" value={-data.transports} base={ca} indent={1} />
                      <CRRow label="Services extérieurs A (621-628)" value={-data.services_ext_a} base={ca} indent={1} />
                      <CRRow label="Services extérieurs B (631-638)" value={-data.services_ext_b} base={ca} indent={1} />
                      <CRRow label="Consommations intermédiaires" value={-data.consommations_intermediaires} base={ca} isTotal />
                    </Section>

                    {/* SIG */}
                    <tr className={SURFACE_SUNK}>
                      <td colSpan={3} className={cx('px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider', TEXT_MUTED)}>
                        Soldes intermédiaires de gestion
                      </td>
                    </tr>

                    <CRRow label="Valeur ajoutée (VA)" value={data.valeur_ajoutee} base={ca} isTotal highlight bold />
                    <CRRow label="Charges de personnel (661-668)" value={-data.charges_personnel} base={ca} indent={1} />
                    <CRRow label="Impôts et taxes (641-648)" value={-data.impots_taxes} base={ca} indent={1} />
                    <CRRow label="Excédent brut d'exploitation (EBE)" value={data.ebe} base={ca} isTotal highlight bold />
                    <CRRow label="Reprises d'amortissements (781-782)" value={data.reprises} base={ca} indent={1} />
                    <CRRow label="Dotations amortissements (681-682)" value={-data.dotations_amort} base={ca} indent={1} />
                    <CRRow label="Autres charges (651-658)" value={-data.autres_charges} base={ca} indent={1} />
                    <CRRow label="Résultat d'exploitation (REX)" value={data.rex} base={ca} isTotal highlight bold />

                    <Section title="Résultat financier">
                      <CRRow label="Revenus financiers (771-778)" value={data.produits_financiers} base={ca} indent={1} />
                      <CRRow label="Frais financiers (671-678)" value={-data.charges_financieres} base={ca} indent={1} />
                      <CRRow label="Résultat financier" value={data.resultat_financier} base={ca} isTotal highlight bold />
                    </Section>

                    <CRRow label="Résultat des activités ordinaires (RAO)" value={data.rao} base={ca} isTotal highlight bold />

                    <Section title="Éléments hors activités ordinaires (HAO)" defaultOpen={false}>
                      <CRRow label="Produits HAO (82, 84, 86, 88)" value={data.produits_hao} base={ca} indent={1} />
                      <CRRow label="Charges HAO (81, 83, 85, 87)" value={-data.charges_hao} base={ca} indent={1} />
                      <CRRow label="Résultat HAO" value={data.resultat_hao} base={ca} isTotal />
                    </Section>

                    <CRRow label="Impôts sur le résultat (695)" value={-data.impots_sur_resultat} base={ca} />
                  </tbody>

                  <tfoot className={TFOOT}>
                    <tr>
                      <td className={cx('px-4 py-4 text-sm font-semibold uppercase tracking-wide', TEXT_TITLE)}>
                        Résultat net de l'exercice
                      </td>
                      <td className={cx(
                        'px-4 py-4 text-right text-base font-semibold whitespace-nowrap',
                        NUM, balanceTone(data.resultat_net),
                      )}>
                        {cr(data.resultat_net)}
                      </td>
                      <td className={cx('px-4 py-4 text-right text-sm whitespace-nowrap', NUM, TEXT_MUTED)}>
                        {pct(data.resultat_net, ca)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            {/* Graphique + KPI */}
            <div className="space-y-4">
              <StatCard
                label="Chiffre d'affaires"
                value={amount(data.chiffre_affaires)} unit="FCFA"
                hint={`${pct(data.chiffre_affaires, ca)} du CA`}
              />
              <StatCard
                label="Valeur ajoutée"
                value={amount(data.valeur_ajoutee)} unit="FCFA"
                hint={`${pct(data.valeur_ajoutee, ca)} du CA`}
              />
              <StatCard
                label="EBE"
                value={amount(data.ebe)} unit="FCFA"
                hint={`${pct(data.ebe, ca)} du CA`}
              />
              <StatCard
                label="Résultat net"
                unit="FCFA"
                tone={data.resultat_net < 0 ? 'danger' : 'neutral'}
                value={<span className={balanceTone(data.resultat_net)}>{cr(data.resultat_net)}</span>}
                hint={`${pct(data.resultat_net, ca)} du CA`}
              />

              <Card title="Soldes intermédiaires">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-white/10" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400" />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={v => `${(v / 1000000).toFixed(0)}M`}
                      stroke="currentColor"
                      className="text-gray-400"
                    />
                    <Tooltip formatter={v => money(v)} contentStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="#9CA3AF" />
                    <Bar dataKey="valeur" fill="#9333EA" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
export { IncomeStatement };
