/**
 * Comptabilite/BalanceSheet.jsx — Bilan SYSCOHADA
 *
 * Props Inertia :
 *   data        : résultat SyscohadaService::generateBalanceSheet()
 *   fiscalYears : liste exercices
 *   selectedFY  : exercice sélectionné
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowDownTrayIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';

const fcfa = (v) => {
  if (v == null || v === 0) return '—';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.abs(Number(v))) + ' FCFA';
};

// Ligne bilan : 3 colonnes (Brut / Amort / Net) ou 1 colonne
function BilanRow({ label, brut, amort, net, value, isTotal, indent = 0, bold }) {
  const showTriple = brut !== undefined;
  const displayVal = showTriple ? net : value;
  const isEmpty    = displayVal == null || displayVal === 0;

  return (
    <tr className={`
      ${isTotal ? 'bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700' : ''}
      ${isEmpty && !isTotal ? 'opacity-50' : ''}
    `}>
      <td
        className={`px-3 py-1.5 text-sm ${bold || isTotal ? 'font-semibold' : 'font-normal'} text-gray-700 dark:text-gray-300`}
        style={{ paddingLeft: `${12 + indent * 16}px` }}
      >
        {label}
      </td>
      {showTriple ? (
        <>
          <td className="px-3 py-1.5 text-right text-xs font-mono text-gray-500 dark:text-gray-400">{fcfa(brut)}</td>
          <td className="px-3 py-1.5 text-right text-xs font-mono text-gray-400 dark:text-gray-500">{fcfa(amort)}</td>
          <td className={`px-3 py-1.5 text-right text-sm font-mono font-semibold ${bold || isTotal ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
            {fcfa(net)}
          </td>
        </>
      ) : (
        <td
          colSpan={3}
          className={`px-3 py-1.5 text-right text-sm font-mono ${bold || isTotal ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}
        >
          {fcfa(value)}
        </td>
      )}
    </tr>
  );
}

function BilanHeader({ cols }) {
  return (
    <thead className="bg-gray-100 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
      <tr>
        {cols.map((c, i) => (
          <th key={i} className={`px-3 py-2 ${i === 0 ? 'text-left' : 'text-right'}`}>{c}</th>
        ))}
      </tr>
    </thead>
  );
}

function BilanSection({ title }) {
  return (
    <tr className="bg-purple-600 dark:bg-purple-800">
      <td colSpan={4} className="px-3 py-2 font-bold text-white text-xs uppercase tracking-widest">
        {title}
      </td>
    </tr>
  );
}

export default function BalanceSheet({ data, fiscalYears, selectedFY }) {
  const [selectedId, setSelectedId] = useState(selectedFY?.id || '');

  const handleFYChange = (id) => {
    setSelectedId(id);
    router.get('/comptabilite/generale/bilan', { fiscal_year_id: id });
  };

  const exportPdf = () => {
    window.open(`/comptabilite/generale/balance-sheet/pdf?fiscal_year_id=${selectedId}`, '_blank');
  };

  const actif  = data?.actif;
  const passif = data?.passif;

  return (
    <AuthLayout>
      <Head title="Bilan SYSCOHADA" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bilan</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">SYSCOHADA Révisé 2017 — Présentation OHADA</p>
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
            Sélectionnez un exercice pour afficher le bilan
          </div>
        ) : (
          <>
            {/* Indicateur équilibre */}
            <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg ${
              data.is_balanced
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}>
              {data.is_balanced
                ? <CheckCircleIcon className="w-5 h-5" />
                : <ExclamationTriangleIcon className="w-5 h-5" />}
              <span className="text-sm font-medium">
                {data.is_balanced
                  ? `Bilan équilibré — Total Actif = Total Passif = ${fcfa(data.total_actif)}`
                  : `Bilan déséquilibré ! Écart : ${fcfa(data.ecart)}`}
              </span>
            </div>

            {/* Bilan côte à côte */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

              {/* === ACTIF === */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-purple-700 dark:bg-purple-800 px-4 py-3">
                  <h2 className="font-bold text-white uppercase tracking-widest text-sm">ACTIF</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <BilanHeader cols={['Désignation', 'Brut', 'Amort/Prov', 'Net']} />
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      <BilanSection title="ACTIF IMMOBILISÉ" />
                      <BilanRow label="Immob. incorporelles" indent={1}
                        brut={actif.immobilisations.incorporelles.brut}
                        amort={actif.immobilisations.incorporelles.amort}
                        net={actif.immobilisations.incorporelles.net} />
                      <BilanRow label="Terrains" indent={1}
                        brut={actif.immobilisations.terrains.brut}
                        amort={actif.immobilisations.terrains.amort}
                        net={actif.immobilisations.terrains.net} />
                      <BilanRow label="Bâtiments" indent={1}
                        brut={actif.immobilisations.batiments.brut}
                        amort={actif.immobilisations.batiments.amort}
                        net={actif.immobilisations.batiments.net} />
                      <BilanRow label="Autres immob. corporelles" indent={1}
                        brut={actif.immobilisations.autres_corporelles.brut}
                        amort={actif.immobilisations.autres_corporelles.amort}
                        net={actif.immobilisations.autres_corporelles.net} />
                      <BilanRow label="Immob. financières" indent={1}
                        brut={actif.immobilisations.financieres.brut}
                        amort={actif.immobilisations.financieres.amort}
                        net={actif.immobilisations.financieres.net} />
                      <BilanRow label="TOTAL ACTIF IMMOBILISÉ" isTotal bold
                        brut={actif.immobilisations.total_brut}
                        amort={actif.immobilisations.total_amort}
                        net={actif.immobilisations.total_net} />

                      <BilanSection title="ACTIF CIRCULANT" />
                      <BilanRow label="Stocks (30-38)" indent={1} value={actif.circulant.stocks} />
                      <BilanRow label="Créances clients (411-416)" indent={1} value={actif.circulant.creances_clients} />
                      <BilanRow label="Autres créances" indent={1} value={actif.circulant.autres_creances} />
                      <BilanRow label="TOTAL ACTIF CIRCULANT" isTotal bold value={actif.circulant.total} />

                      <BilanSection title="TRÉSORERIE-ACTIF" />
                      <BilanRow label="Banques et caisses (51-57)" indent={1} value={actif.tresorerie} />

                      {/* Total général actif */}
                      <tr className="bg-purple-700 dark:bg-purple-800">
                        <td className="px-3 py-3 font-bold text-white text-sm uppercase tracking-wide">
                          TOTAL ACTIF
                        </td>
                        <td colSpan={3} className="px-3 py-3 text-right font-bold text-white text-base font-mono">
                          {fcfa(actif.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* === PASSIF === */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-orange-600 dark:bg-orange-700 px-4 py-3">
                  <h2 className="font-bold text-white uppercase tracking-widest text-sm">PASSIF</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <BilanHeader cols={['Désignation', 'Exercice N', '', '']} />
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      <BilanSection title="CAPITAUX PROPRES ET RESSOURCES ASSIMILÉES" />
                      <BilanRow label="Capital social (101)" indent={1} value={passif.capitaux_propres.capital} />
                      <BilanRow label="Réserves (104-107)" indent={1} value={passif.capitaux_propres.reserves} />
                      <BilanRow label="Report à nouveau (110-119)" indent={1} value={passif.capitaux_propres.report_nouveau} />
                      <BilanRow label="Résultat net (120-129)" indent={1} value={passif.capitaux_propres.resultat} />
                      <BilanRow label="Subventions (130-131)" indent={1} value={passif.capitaux_propres.subventions} />
                      <BilanRow label="TOTAL CAPITAUX PROPRES" isTotal bold value={passif.capitaux_propres.total} />

                      <BilanRow label="Dettes financières (16-17)" value={passif.dettes_financieres} indent={1} />
                      <BilanRow label="Provisions pour risques (15)" value={passif.provisions} indent={1} />
                      <BilanRow label="TOTAL RESSOURCES DURABLES" isTotal bold value={passif.ressources_durables} />

                      <BilanSection title="PASSIF CIRCULANT" />
                      <BilanRow label="Fournisseurs (401-408)" indent={1} value={passif.passif_circulant.fournisseurs} />
                      <BilanRow label="Dettes fiscales et sociales" indent={1} value={passif.passif_circulant.dettes_fiscales} />
                      <BilanRow label="Autres dettes" indent={1} value={passif.passif_circulant.autres_dettes} />
                      <BilanRow label="TOTAL PASSIF CIRCULANT" isTotal bold value={passif.passif_circulant.total} />

                      <BilanSection title="TRÉSORERIE-PASSIF" />
                      <BilanRow label="Crédits de trésorerie (521-522)" indent={1} value={passif.tresorerie} />

                      {/* Total général passif */}
                      <tr className="bg-orange-600 dark:bg-orange-700">
                        <td className="px-3 py-3 font-bold text-white text-sm uppercase tracking-wide">
                          TOTAL PASSIF
                        </td>
                        <td colSpan={3} className="px-3 py-3 text-right font-bold text-white text-base font-mono">
                          {fcfa(passif.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Note de bas de page */}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
              Bilan établi selon les normes SYSCOHADA Révisé 2017 — Les montants sont en FCFA
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
export { BalanceSheet };
