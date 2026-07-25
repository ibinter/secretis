import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ─── Mock ─────────────────────────────────────────────────────────────────────
const MOCK_COHORTS = [
  { cohort: 'Jan 26', initial: 5, periods: { 'M+0': 100, 'M+1': 80, 'M+3': 80, 'M+6': 60, 'M+12': null } },
  { cohort: 'Fév 26', initial: 4, periods: { 'M+0': 100, 'M+1': 75, 'M+3': 50, 'M+6': null, 'M+12': null } },
  { cohort: 'Mar 26', initial: 6, periods: { 'M+0': 100, 'M+1': 83.3, 'M+3': null, 'M+6': null, 'M+12': null } },
  { cohort: 'Avr 26', initial: 3, periods: { 'M+0': 100, 'M+1': 100, 'M+3': null, 'M+6': null, 'M+12': null } },
  { cohort: 'Mai 26', initial: 5, periods: { 'M+0': 100, 'M+1': null, 'M+3': null, 'M+6': null, 'M+12': null } },
  // Données historiques
  { cohort: 'Jul 25', initial: 8, periods: { 'M+0': 100, 'M+1': 87.5, 'M+3': 75, 'M+6': 62.5, 'M+12': 50 } },
  { cohort: 'Aoû 25', initial: 6, periods: { 'M+0': 100, 'M+1': 83.3, 'M+3': 66.7, 'M+6': 50, 'M+12': 33.3 } },
  { cohort: 'Sep 25', initial: 7, periods: { 'M+0': 100, 'M+1': 85.7, 'M+3': 71.4, 'M+6': 57.1, 'M+12': null } },
  { cohort: 'Oct 25', initial: 5, periods: { 'M+0': 100, 'M+1': 80, 'M+3': 60, 'M+6': 60, 'M+12': null } },
  { cohort: 'Nov 25', initial: 4, periods: { 'M+0': 100, 'M+1': 75, 'M+3': 75, 'M+6': null, 'M+12': null } },
  { cohort: 'Déc 25', initial: 3, periods: { 'M+0': 100, 'M+1': 100, 'M+3': 66.7, 'M+6': null, 'M+12': null } },
];

const PERIODS = ['M+0', 'M+1', 'M+3', 'M+6', 'M+12'];

// ─── Couleur heatmap ──────────────────────────────────────────────────────────
function retentionColor(pct) {
  if (pct === null || pct === undefined) return { bg: 'bg-gray-50', text: 'text-gray-300', border: 'border-gray-100' };
  if (pct >= 80) return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
  if (pct >= 60) return { bg: 'bg-lime-100',  text: 'text-lime-800',  border: 'border-lime-200' };
  if (pct >= 40) return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' };
  return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
}

// ─── Graphique courbes de rétention ──────────────────────────────────────────
function RetentionCurves({ cohorts }) {
  // On ne prend que les cohortes avec suffisamment de données
  const complete = cohorts.filter(c => c.periods['M+3'] !== null);
  const periodLabels = ['M+0', 'M+1', 'M+3', 'M+6', 'M+12'];

  const chartData = periodLabels.map(p => {
    const row = { period: p };
    complete.slice(-5).forEach(c => { row[c.cohort] = c.periods[p]; });
    return row;
  });

  const COLORS = ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-1">Courbes de rétention par cohorte</h3>
      <p className="text-xs text-gray-400 mb-5">% d'organisations encore actives à chaque période (5 dernières cohortes)</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#9ca3af' }} width={35} />
          <Tooltip formatter={v => v !== null ? `${v}%` : 'N/A'} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {complete.slice(-5).map((c, i) => (
            <Line
              key={c.cohort}
              type="monotone"
              dataKey={c.cohort}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function CohortAnalysis({ cohorts: propCohorts }) {
  const cohorts = propCohorts || MOCK_COHORTS;
  const [selectedCell, setSelectedCell] = useState(null);

  // Trier les cohortes chronologiquement
  const sorted = [...cohorts].reverse();

  return (
    <>
      <Head title="Analyse de cohortes — SuperAdmin IBIG Soft" />
      <div className="min-h-screen bg-gray-50">

        {/* Header */}
        <header className="bg-purple-900 text-white shadow-lg">
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center gap-3">
            <button onClick={() => router.visit('/superadmin/saas-dashboard')} className="text-purple-200 hover:text-white text-sm">← Dashboard</button>
            <span className="text-purple-400">/</span>
            <h1 className="text-lg font-bold">Analyse de cohortes</h1>
            <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">SUPER ADMIN</span>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">

          {/* Légende */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Rétention par cohorte</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Chaque ligne = mois de souscription. Chaque colonne = % encore actifs à cette période.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-green-100 border border-green-200 inline-block" /><span>≥ 80%</span></div>
                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-lime-100 border border-lime-200 inline-block" /><span>60-79%</span></div>
                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-100 border border-amber-200 inline-block" /><span>40-59%</span></div>
                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-100 border border-red-200 inline-block" /><span>{'< 40%'}</span></div>
                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-gray-50 border border-gray-100 inline-block" /><span>N/A</span></div>
              </div>
            </div>
          </div>

          {/* Table Heatmap */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Cohorte</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Initial</th>
                    {PERIODS.map(p => (
                      <th key={p} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[80px]">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map((row, ri) => (
                    <tr key={ri} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900">{row.cohort}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{row.initial}</td>
                      {PERIODS.map(p => {
                        const pct = row.periods[p];
                        const c   = retentionColor(pct);
                        const isSelected = selectedCell?.cohort === row.cohort && selectedCell?.period === p;
                        return (
                          <td key={p} className="px-2 py-2">
                            <button
                              onClick={() => pct !== null && setSelectedCell(isSelected ? null : { cohort: row.cohort, period: p, pct, initial: row.initial })}
                              className={`w-full rounded-lg py-2 px-1 text-xs font-bold transition-all border ${c.bg} ${c.text} ${c.border}
                                ${pct !== null ? 'cursor-pointer hover:opacity-80 hover:shadow-sm' : 'cursor-default'}
                                ${isSelected ? 'ring-2 ring-purple-500 ring-offset-1' : ''}`}
                            >
                              {pct !== null ? `${pct}%` : '—'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Détail cellule sélectionnée */}
          {selectedCell && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-purple-900">
                    Cohorte {selectedCell.cohort} — {selectedCell.period}
                  </h3>
                  <p className="text-sm text-purple-700 mt-1">
                    <strong>{Math.round(selectedCell.initial * selectedCell.pct / 100)}</strong> organisations actives
                    sur <strong>{selectedCell.initial}</strong> initiales ({selectedCell.pct}% de rétention)
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="text-purple-400 hover:text-purple-600 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-purple-500 mt-2">
                Cliquez sur "Voir les organisations" pour accéder au détail des abonnés de cette cohorte.
              </p>
              <button
                onClick={() => router.visit(`/superadmin/organizations?cohort=${selectedCell.cohort}&period=${selectedCell.period}`)}
                className="mt-3 px-4 py-2 bg-purple-900 text-white text-sm font-medium rounded-lg hover:bg-purple-800"
              >
                Voir les organisations →
              </button>
            </div>
          )}

          {/* Courbes de rétention */}
          <RetentionCurves cohorts={cohorts} />

          {/* Métriques de résumé */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: 'Rétention M+1 (moy.)',
                value: (() => {
                  const vals = cohorts.map(c => c.periods['M+1']).filter(v => v !== null);
                  return vals.length ? `${(vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1)}%` : 'N/A';
                })(),
                desc: 'Après 1 mois de souscription',
                color: 'bg-purple-50 text-purple-900',
              },
              {
                label: 'Rétention M+6 (moy.)',
                value: (() => {
                  const vals = cohorts.map(c => c.periods['M+6']).filter(v => v !== null);
                  return vals.length ? `${(vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1)}%` : 'N/A';
                })(),
                desc: 'Après 6 mois de souscription',
                color: 'bg-purple-50 text-purple-900',
              },
              {
                label: 'Rétention M+12 (moy.)',
                value: (() => {
                  const vals = cohorts.map(c => c.periods['M+12']).filter(v => v !== null);
                  return vals.length ? `${(vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1)}%` : 'N/A';
                })(),
                desc: 'Après 12 mois (fidélisation annuelle)',
                color: 'bg-green-50 text-green-900',
              },
            ].map(m => (
              <div key={m.label} className={`${m.color} rounded-xl p-5 border border-white shadow-sm text-center`}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{m.label}</p>
                <p className="text-3xl font-bold">{m.value}</p>
                <p className="text-xs text-gray-400 mt-1">{m.desc}</p>
              </div>
            ))}
          </div>

        </main>
      </div>
    </>
  );
}
export { CohortAnalysis };
