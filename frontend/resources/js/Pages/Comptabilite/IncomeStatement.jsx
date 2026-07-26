/**
 * Comptabilite/IncomeStatement.jsx — Compte de résultat SYSCOHADA
 *
 * Props Inertia :
 *   data        : résultat du SyscohadaService::generateIncomeStatement()
 *   fiscalYears : liste exercices
 *   selectedFY  : exercice courant
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { ArrowDownTrayIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';

const fcfa = (v) => {
  if (v == null) return '—';
  const abs = Math.abs(Number(v));
  const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(abs);
  return (v < 0 ? '(' + fmt + ')' : fmt) + ' FCFA';
};

const pct = (v, base) => {
  if (!base || base === 0) return '—';
  return (Math.abs(v / base) * 100).toFixed(1) + ' %';
};

// Ligne du tableau CR
function CRRow({ label, value, base, isTotal, indent = 0, bold, positive, negative, highlight }) {
  const isPositive = value >= 0;
  const valueColor = highlight
    ? (isPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')
    : 'text-gray-800 dark:text-gray-200';

  return (
    <tr className={`
      ${isTotal ? 'bg-gray-50 dark:bg-gray-800/50 border-t border-b border-gray-200 dark:border-gray-700' : ''}
      ${highlight ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}
    `}>
      <td className={`px-4 py-2 ${bold || isTotal ? 'font-semibold' : 'font-normal'} text-gray-700 dark:text-gray-300`}
        style={{ paddingLeft: `${16 + indent * 20}px` }}>
        {label}
      </td>
      <td className={`px-4 py-2 text-right font-mono ${valueColor} ${bold || isTotal ? 'font-semibold' : ''}`}>
        {fcfa(value)}
      </td>
      <td className="px-4 py-2 text-right text-xs text-gray-400 dark:text-gray-500 font-mono">
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
      <tr className="bg-gray-100 dark:bg-gray-800 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}>
        <td colSpan={3} className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide text-xs flex items-center gap-2">
          {open ? <ChevronDownIcon className="w-4 h-4 inline" /> : <ChevronRightIcon className="w-4 h-4 inline" />}
          {title}
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
    router.get('/comptabilite/generale/compte-de-resultat', { fiscal_year_id: id });
  };

  const exportPdf = () => {
    window.open(`/comptabilite/generale/income-statement/pdf?fiscal_year_id=${selectedId}`, '_blank');
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Compte de résultat</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">SYSCOHADA Révisé 2017 (BCEAO)</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="input-sm" value={selectedId}
              onChange={e => handleFYChange(e.target.value)}>
              <option value="">Sélectionner un exercice</option>
              {fiscalYears.map(fy => (
                <option key={fy.id} value={fy.id}>{fy.name}</option>
              ))}
            </select>
            {data && (
              <button onClick={exportPdf} className="btn-secondary flex items-center gap-2 text-sm">
                <ArrowDownTrayIcon className="w-4 h-4" /> PDF
              </button>
            )}
          </div>
        </div>

        {!data ? (
          <div className="text-center py-24 text-gray-400 dark:text-gray-500">
            Sélectionnez un exercice fiscal pour afficher le compte de résultat
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Tableau CR */}
            <div className="xl:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
                  {selectedFY?.name} — Exercice clos le {data.period?.end}
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left">Intitulé</th>
                      <th className="px-4 py-2 text-right">Exercice N</th>
                      <th className="px-4 py-2 text-right">% CA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">

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
                    <tr className="bg-indigo-50 dark:bg-indigo-900/20">
                      <td className="px-4 py-3 font-bold text-indigo-700 dark:text-indigo-300 text-sm uppercase tracking-wide" colSpan={3}>
                        Soldes intermédiaires de gestion
                      </td>
                    </tr>

                    <CRRow label="VALEUR AJOUTÉE (VA)" value={data.valeur_ajoutee} base={ca} isTotal highlight bold />
                    <CRRow label="Charges de personnel (661-668)" value={-data.charges_personnel} base={ca} indent={1} />
                    <CRRow label="Impôts et taxes (641-648)" value={-data.impots_taxes} base={ca} indent={1} />
                    <CRRow label="EXCÉDENT BRUT D'EXPLOITATION (EBE)" value={data.ebe} base={ca} isTotal highlight bold />
                    <CRRow label="Reprises d'amortissements (781-782)" value={data.reprises} base={ca} indent={1} />
                    <CRRow label="Dotations amortissements (681-682)" value={-data.dotations_amort} base={ca} indent={1} />
                    <CRRow label="Autres charges (651-658)" value={-data.autres_charges} base={ca} indent={1} />
                    <CRRow label="RÉSULTAT D'EXPLOITATION (REX)" value={data.rex} base={ca} isTotal highlight bold />

                    <Section title="Résultat financier">
                      <CRRow label="Revenus financiers (771-778)" value={data.produits_financiers} base={ca} indent={1} />
                      <CRRow label="Frais financiers (671-678)" value={-data.charges_financieres} base={ca} indent={1} />
                      <CRRow label="RÉSULTAT FINANCIER" value={data.resultat_financier} base={ca} isTotal highlight bold />
                    </Section>

                    <CRRow label="RÉSULTAT DES ACTIVITÉS ORDINAIRES (RAO)" value={data.rao} base={ca} isTotal bold highlight />

                    <Section title="Éléments hors activités ordinaires (HAO)" defaultOpen={false}>
                      <CRRow label="Produits HAO (82, 84, 86, 88)" value={data.produits_hao} base={ca} indent={1} />
                      <CRRow label="Charges HAO (81, 83, 85, 87)" value={-data.charges_hao} base={ca} indent={1} />
                      <CRRow label="RÉSULTAT HAO" value={data.resultat_hao} base={ca} isTotal />
                    </Section>

                    <CRRow label="Impôts sur le résultat (695)" value={-data.impots_sur_resultat} base={ca} />

                    <tr className={`border-t-2 border-gray-800 dark:border-gray-200 ${data.resultat_net >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <td className="px-4 py-4 font-bold text-lg text-gray-900 dark:text-gray-100 uppercase">
                        RÉSULTAT NET DE L'EXERCICE
                      </td>
                      <td className={`px-4 py-4 text-right font-bold text-lg font-mono ${data.resultat_net >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {fcfa(data.resultat_net)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-500">
                        {pct(data.resultat_net, ca)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Graphique + KPI */}
            <div className="space-y-4">
              {/* KPI cards */}
              {[
                { label: 'Chiffre d\'affaires', value: data.chiffre_affaires, color: 'text-purple-600' },
                { label: 'Valeur ajoutée',      value: data.valeur_ajoutee, color: 'text-indigo-600' },
                { label: 'EBE',                 value: data.ebe, color: 'text-purple-600' },
                { label: 'Résultat net',        value: data.resultat_net,
                  color: data.resultat_net >= 0 ? 'text-green-600' : 'text-red-600' },
              ].map(k => (
                <div key={k.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{k.label}</p>
                  <p className={`text-xl font-bold mt-1 font-mono ${k.color}`}>{fcfa(k.value)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{pct(k.value, ca)} du CA</p>
                </div>
              ))}

              {/* Graphique SIG */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                  Soldes intermédiaires
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
                    <Tooltip formatter={v => fcfa(v)} />
                    <ReferenceLine y={0} stroke="#9ca3af" />
                    <Bar dataKey="valeur" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
export { IncomeStatement };
