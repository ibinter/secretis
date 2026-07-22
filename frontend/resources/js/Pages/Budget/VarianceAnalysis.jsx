/**
 * Budget/VarianceAnalysis.jsx — Analyse des écarts Budget vs Réel
 *
 * Props Inertia :
 *   budget       : Budget avec lignes et département
 *   departments  : [{ id, name }]
 */

import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
  ArrowDownTrayIcon, FunnelIcon, ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AuthLayout from '@/Layouts/AuthLayout';

const fcfa = (v) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.abs(v));

// Couleur selon écart
function varianceColor(line) {
  const pct = line.variance_pct ?? 0;
  if (line.is_income) {
    // Produit : favorable si réalisation >= budget
    if (pct >= 95) return 'bg-green-50 text-green-800';
    if (pct >= 80) return 'bg-orange-50 text-orange-700';
    return 'bg-red-50 text-red-700';
  } else {
    // Charge : favorable si consommation <= 105%
    if (pct <= 105) return 'bg-green-50 text-green-700';
    if (pct <= 115) return 'bg-orange-50 text-orange-700';
    return 'bg-red-50 text-red-700';
  }
}

function StatusBadge({ line }) {
  const pct = line.consumption_pct ?? 0;
  if (pct >= 100) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Dépassé</span>;
  if (pct >= 80)  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">À risque</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">OK</span>;
}

export default function VarianceAnalysis({ budget, departments }) {
  const [analysis, setAnalysis]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [period, setPeriod]       = useState('ytd');       // ytd | q1 | q2 | q3 | q4
  const [deptFilter, setDeptFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [expandedLine, setExpandedLine] = useState(null);
  const [comments, setComments]   = useState({});

  useEffect(() => {
    loadAnalysis();
  }, []);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/budget/${budget.id}/variance`);
      setAnalysis(data);
    } catch {
      toast.error('Impossible de charger l\'analyse des écarts.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = () => {
    window.location.href = `/budget/${budget.id}/variance-pdf`;
  };

  if (loading) {
    return (
      <AuthLayout>
        <div className="p-10 text-center text-gray-400">Chargement de l'analyse...</div>
      </AuthLayout>
    );
  }

  // Filtre des lignes
  let lines = analysis?.lines ?? [];
  if (deptFilter) lines = lines.filter((l) => String(l.department_id) === deptFilter);
  if (catFilter)  lines = lines.filter((l) => l.category === catFilter);

  const summary = analysis?.summary ?? {};

  // Colonnes selon période
  const getPeriodValues = (l) => {
    if (period === 'ytd') return { budgeted: l.budgeted, actual: l.actual_ytd };
    const q = period; // 'q1' | 'q2' | 'q3' | 'q4'
    return { budgeted: l[`budgeted_${q}`] ?? 0, actual: l[`actual_${q}`] ?? 0 };
  };

  return (
    <AuthLayout>
      <Head title={`Analyse écarts — ${budget.name}`} />

      <div className="p-6 space-y-6">

        {/* En-tête */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <a href="/budget" className="text-xs text-gray-400 hover:text-gray-600">← Budgets</a>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Analyse des écarts</h1>
            <p className="text-sm text-gray-500">{budget.name} · {budget.type}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              <ArrowDownTrayIcon className="h-4 w-4" /> Export PDF
            </button>
            <a
              href={`/budget/${budget.id}/export`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Export CSV
            </a>
          </div>
        </div>

        {/* KPI résumé */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Budget total charges', value: fcfa(summary.total_budget) + ' FCFA', sub: '' },
            { label: 'Réel YTD',             value: fcfa(summary.total_actual) + ' FCFA', sub: '' },
            {
              label: 'Écart',
              value: (summary.total_variance >= 0 ? '+ ' : '− ') + fcfa(summary.total_variance) + ' FCFA',
              sub: '',
              color: summary.total_variance >= 0 ? 'text-green-600' : 'text-red-500',
            },
            {
              label: 'Taux d\'exécution',
              value: (summary.consumption_pct ?? 0).toFixed(1) + '%',
              sub: `${summary.alerts_count ?? 0} alertes`,
              color: (summary.consumption_pct ?? 0) >= 100 ? 'text-red-500' : (summary.consumption_pct ?? 0) >= 80 ? 'text-orange-500' : 'text-green-600',
            },
          ].map(({ label, value, sub, color = 'text-gray-900' }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className={`text-lg font-bold ${color}`}>{value}</div>
              {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <FunnelIcon className="h-4 w-4 text-gray-400" />

          {/* Période */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {[
              { v: 'ytd', l: 'YTD' },
              { v: 'q1', l: 'T1' },
              { v: 'q2', l: 'T2' },
              { v: 'q3', l: 'T3' },
              { v: 'q4', l: 'T4' },
            ].map(({ v, l }) => (
              <button
                key={v}
                onClick={() => setPeriod(v)}
                className={`px-3 py-1.5 transition ${period === v ? 'bg-[#1A3A5C] text-white' : 'hover:bg-gray-50 text-gray-600'}`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Département */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-gray-200 text-xs px-3 py-1.5 focus:outline-none"
          >
            <option value="">Tous les départements</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          {/* Catégorie */}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="rounded-lg border border-gray-200 text-xs px-3 py-1.5 focus:outline-none"
          >
            <option value="">Toutes les catégories</option>
            {['personnel', 'fonctionnement', 'investissement', 'impots', 'autres'].map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>

          <span className="ml-auto text-xs text-gray-400">{lines.length} ligne(s)</span>
        </div>

        {/* Tableau d'analyse */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left border-b border-gray-100">
                  <th className="px-4 py-2.5 font-medium">Compte</th>
                  <th className="px-4 py-2.5 font-medium">Libellé</th>
                  <th className="px-4 py-2.5 font-medium">Catégorie</th>
                  <th className="px-4 py-2.5 font-medium text-right">Budgété</th>
                  <th className="px-4 py-2.5 font-medium text-right">Réel</th>
                  <th className="px-4 py-2.5 font-medium text-right">Écart</th>
                  <th className="px-4 py-2.5 font-medium text-center">%</th>
                  <th className="px-4 py-2.5 font-medium text-center">Statut</th>
                  <th className="px-4 py-2.5 font-medium text-center">Cmnt.</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                      Aucune ligne à afficher.
                    </td>
                  </tr>
                )}
                {lines.map((line) => {
                  const { budgeted, actual } = getPeriodValues(line);
                  const variance = budgeted - actual;
                  const pct      = budgeted !== 0 ? ((actual / budgeted) * 100).toFixed(1) : '—';
                  const rowClass = varianceColor(line);
                  const isExpanded = expandedLine === line.id;

                  return (
                    <>
                      <tr
                        key={line.id}
                        className={`border-t border-gray-50 hover:opacity-90 cursor-pointer transition ${rowClass}`}
                        onClick={() => setExpandedLine(isExpanded ? null : line.id)}
                      >
                        <td className="px-4 py-2 font-mono">{line.account_number}</td>
                        <td className="px-4 py-2">{line.account_name}</td>
                        <td className="px-4 py-2 capitalize">{line.category}</td>
                        <td className="px-4 py-2 text-right">{fcfa(budgeted)}</td>
                        <td className="px-4 py-2 text-right font-medium">{fcfa(actual)}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {variance >= 0 ? '+ ' : '− '}{fcfa(variance)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center font-semibold">{pct}%</td>
                        <td className="px-4 py-2 text-center"><StatusBadge line={line} /></td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedLine(isExpanded ? null : line.id); }}
                            className="text-gray-400 hover:text-[#1A3A5C] transition"
                          >
                            <ChatBubbleLeftIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Panneau commentaire & détail */}
                      {isExpanded && (
                        <tr key={`${line.id}-detail`}>
                          <td colSpan={9} className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                            <div className="flex flex-col gap-2">
                              <div className="text-xs text-gray-500">
                                Département : <strong>{line.department ?? '—'}</strong>
                                {' · '}
                                Nature : <strong>{line.is_income ? 'Produit' : 'Charge'}</strong>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">
                                  Commentaire / Explication de l'écart
                                </label>
                                <textarea
                                  rows={2}
                                  value={comments[line.id] ?? ''}
                                  onChange={(e) => setComments({ ...comments, [line.id]: e.target.value })}
                                  placeholder="Ex : Dépassement dû à un appel d'offres exceptionnel..."
                                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A3A5C] resize-none"
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Consolidation par catégorie */}
        {analysis?.by_category && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Consolidation par catégorie</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {Object.entries(analysis.by_category).map(([cat, data]) => {
                const pct = data.variance_pct ?? 0;
                return (
                  <div key={cat} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-700 capitalize mb-2">{cat}</div>
                    <div className="text-sm font-bold text-gray-900">{fcfa(data.budgeted)} FCFA</div>
                    <div className="text-xs text-gray-500 mt-0.5">Réel : {fcfa(data.actual)} FCFA</div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: pct >= 100 ? '#E74C3C' : pct >= 80 ? '#F39C12' : '#27AE60',
                        }}
                      />
                    </div>
                    <div className="text-xs text-right mt-1 font-medium" style={{
                      color: pct >= 100 ? '#E74C3C' : pct >= 80 ? '#F39C12' : '#27AE60',
                    }}>
                      {pct.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </AuthLayout>
  );
}
