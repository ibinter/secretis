import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

// ─── Mock ─────────────────────────────────────────────────────────────────────
const MOCK_HISTORY = [
  { month: 'Jan 26', mrr: 5100000, new_mrr: 300000, expansion_mrr: 75000, churned_mrr: 75000 },
  { month: 'Fév 26', mrr: 5400000, new_mrr: 225000, expansion_mrr: 150000, churned_mrr: 75000 },
  { month: 'Mar 26', mrr: 5700000, new_mrr: 225000, expansion_mrr: 75000, churned_mrr: 0 },
  { month: 'Avr 26', mrr: 5950000, new_mrr: 150000, expansion_mrr: 150000, churned_mrr: 50000 },
  { month: 'Mai 26', mrr: 6200000, new_mrr: 225000, expansion_mrr: 100000, churned_mrr: 75000 },
  { month: 'Jui 26', mrr: 6550000, new_mrr: 300000, expansion_mrr: 150000, churned_mrr: 100000 },
  { month: 'Jul 26', mrr: 6850000, new_mrr: 225000, expansion_mrr: 150000, churned_mrr: 75000 },
];

const MOCK_BREAKDOWN = {
  mrr: 6850000, arr: 82200000, new_mrr: 225000, expansion_mrr: 150000,
  churned_mrr: 75000, net_new_mrr: 300000,
  by_plan: { starter: 375000, pro: 2250000, enterprise: 4050000, on_premise: 175000 },
};

const MOCK_FORECASTS = {
  bear: [{ month: 'Aoû 26', mrr: 7030000 }, { month: 'Sep 26', mrr: 7213000 }, { month: 'Oct 26', mrr: 7400000 }, { month: 'Nov 26', mrr: 7590000 }, { month: 'Déc 26', mrr: 7785000 }, { month: 'Jan 27', mrr: 7985000 }],
  base: [{ month: 'Aoû 26', mrr: 7193000 }, { month: 'Sep 26', mrr: 7553000 }, { month: 'Oct 26', mrr: 7930000 }, { month: 'Nov 26', mrr: 8328000 }, { month: 'Déc 26', mrr: 8744000 }, { month: 'Jan 27', mrr: 9181000 }],
  bull: [{ month: 'Aoû 26', mrr: 7356000 }, { month: 'Sep 26', mrr: 7896000 }, { month: 'Oct 26', mrr: 8481000 }, { month: 'Nov 26', mrr: 9107000 }, { month: 'Déc 26', mrr: 9780000 }, { month: 'Jan 27', mrr: 10503000 }],
};

const MOCK_TOP_ORGS = [
  { name: 'Banque Nationale CI', plan: 'enterprise', mrr: 150000, health_score: 88, months_active: 18 },
  { name: 'ITIC Formations',     plan: 'enterprise', mrr: 150000, health_score: 82, months_active: 13 },
  { name: 'Groupe Nanan Invest', plan: 'enterprise', mrr: 150000, health_score: 74, months_active: 20 },
  { name: 'Cabinet Konan',       plan: 'pro',        mrr: 75000,  health_score: 71, months_active: 9  },
  { name: 'Pharmaci Pro',        plan: 'pro',        mrr: 75000,  health_score: 67, months_active: 21 },
];

const fmtXOF = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v);
const fmtM = (v) =>
  v >= 1_000_000 ? `${(v/1_000_000).toFixed(2)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v);

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name} : <strong>{fmtM(p.value)} XOF</strong></span>
        </div>
      ))}
    </div>
  );
}

// ─── Waterfall MRR ────────────────────────────────────────────────────────────
function WaterfallMrr({ breakdown }) {
  const start   = breakdown.mrr - breakdown.net_new_mrr;
  const items = [
    { name: 'MRR début',    value: start,                 type: 'base',      color: '#64748b' },
    { name: '+ New',        value: breakdown.new_mrr,     type: 'positive',  color: '#10b981' },
    { name: '+ Expansion',  value: breakdown.expansion_mrr, type: 'positive', color: '#3b82f6' },
    { name: '- Churn',      value: -breakdown.churned_mrr, type: 'negative', color: '#ef4444' },
    { name: 'MRR fin',      value: breakdown.mrr,         type: 'total',     color: '#1e3a5f' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-1">Waterfall MRR — Ce mois</h3>
      <p className="text-xs text-gray-400 mb-5">Décomposition du mouvement MRR</p>
      <div className="flex items-end gap-3 h-48 px-2">
        {items.map((item, i) => {
          const maxVal = breakdown.mrr;
          const heightPct = Math.abs(item.value) / maxVal;
          const barH = Math.max(8, Math.round(heightPct * 160));
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-gray-700">{fmtM(Math.abs(item.value))}</span>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{ height: barH, background: item.color, opacity: item.type === 'negative' ? 0.85 : 1 }}
              />
              <span className="text-[10px] text-gray-500 text-center leading-tight">{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function MrrAnalysis({ breakdown: propBd, forecasts: propFc, mrr_history: propHist, top_orgs: propTop }) {
  const breakdown = propBd   || MOCK_BREAKDOWN;
  const forecasts = propFc   || MOCK_FORECASTS;
  const history   = propHist || MOCK_HISTORY;
  const topOrgs   = propTop  || MOCK_TOP_ORGS;

  const [scenario, setScenario] = useState('base');

  // Fusion historique + prévisions pour le graphique de forecast
  const forecastData = forecasts[scenario] || [];

  const planColors = { starter: '#64748b', pro: '#6366f1', enterprise: '#f59e0b', on_premise: '#8b5cf6' };
  const planLabels = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise', on_premise: 'On-Premise' };
  const planData   = Object.entries(breakdown.by_plan || {}).map(([plan, mrr]) => ({
    plan: planLabels[plan] || plan,
    mrr,
    color: planColors[plan] || '#64748b',
  }));

  return (
    <>
      <Head title="Analyse MRR — SuperAdmin IBIG Soft" />
      <div className="min-h-screen bg-gray-50">

        {/* Header */}
        <header className="bg-purple-900 text-white shadow-lg">
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.visit('/superadmin/saas-dashboard')} className="text-purple-200 hover:text-white text-sm flex items-center gap-1">← Dashboard SaaS</button>
              <span className="text-purple-400">/</span>
              <h1 className="text-lg font-bold">Analyse MRR</h1>
              <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">SUPER ADMIN</span>
            </div>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">

          {/* KPIs MRR */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'MRR',            value: fmtM(breakdown.mrr) + ' XOF',            color: 'text-purple-900 bg-purple-50' },
              { label: 'ARR',            value: fmtM(breakdown.arr) + ' XOF',            color: 'text-teal-800 bg-teal-50' },
              { label: 'New MRR',        value: '+' + fmtM(breakdown.new_mrr) + ' XOF',  color: 'text-green-800 bg-green-50' },
              { label: 'Expansion MRR',  value: '+' + fmtM(breakdown.expansion_mrr) + ' XOF', color: 'text-purple-700 bg-purple-50' },
              { label: 'Churned MRR',    value: '-' + fmtM(breakdown.churned_mrr) + ' XOF',  color: 'text-red-700 bg-red-50' },
              { label: 'Net New MRR',    value: (breakdown.net_new_mrr >= 0 ? '+' : '') + fmtM(breakdown.net_new_mrr) + ' XOF', color: breakdown.net_new_mrr >= 0 ? 'text-green-800 bg-green-50' : 'text-red-700 bg-red-50' },
            ].map(k => (
              <div key={k.label} className={`${k.color} rounded-xl p-4 border border-white shadow-sm text-center`}>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Waterfall + Plan breakdown */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <WaterfallMrr breakdown={breakdown} />

            {/* BarChart par plan */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-1">MRR par plan</h3>
              <p className="text-xs text-gray-400 mb-5">Répartition du revenu par niveau d'abonnement</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={planData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtM} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis type="category" dataKey="plan" tick={{ fontSize: 11, fill: '#374151' }} width={80} />
                  <Tooltip formatter={(v) => fmtXOF(v)} content={<CustomTooltip />} />
                  <Bar dataKey="mrr" name="MRR" radius={[0,4,4,0]} isAnimationActive>
                    {planData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Évolution MRR historique */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Évolution MRR — 7 mois</h3>
            <p className="text-xs text-gray-400 mb-5">Décomposition New + Expansion - Churn</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={history} margin={{ top: 5, right: 5, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 10, fill: '#9ca3af' }} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="new_mrr"       name="New MRR"       fill="#10b981" radius={[3,3,0,0]} stackId="a" />
                <Bar dataKey="expansion_mrr" name="Expansion MRR" fill="#3b82f6" radius={[3,3,0,0]} stackId="a" />
                <Bar dataKey="churned_mrr"   name="Churned MRR"   fill="#ef4444" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Prévisions 6 mois */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-gray-900">Prévisions MRR — 6 mois</h3>
                <p className="text-xs text-gray-400 mt-0.5">Basé sur le taux de croissance des 6 derniers mois</p>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                {['bear', 'base', 'bull'].map(s => (
                  <button
                    key={s}
                    onClick={() => setScenario(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      scenario === s ? 'bg-white shadow text-purple-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {s === 'bear' ? 'Pessimiste' : s === 'base' ? 'Réaliste' : 'Optimiste'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={forecastData} margin={{ top: 5, right: 5, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 10, fill: '#9ca3af' }} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  name="MRR prévu"
                  stroke={scenario === 'bear' ? '#ef4444' : scenario === 'base' ? '#3b82f6' : '#10b981'}
                  strokeWidth={2.5}
                  strokeDasharray="6 3"
                  dot={{ r: 4, fill: 'white', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top 20 clients */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Top clients par MRR</h3>
              <p className="text-xs text-gray-400 mt-0.5">Organisations générant le plus de revenus récurrents</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3 text-left font-semibold">#</th>
                    <th className="px-6 py-3 text-left font-semibold">Organisation</th>
                    <th className="px-6 py-3 text-left font-semibold">Plan</th>
                    <th className="px-6 py-3 text-right font-semibold">MRR</th>
                    <th className="px-6 py-3 text-center font-semibold">Health Score</th>
                    <th className="px-6 py-3 text-left font-semibold">Ancienneté</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topOrgs.map((org, i) => {
                    const planColors2 = { enterprise: 'bg-yellow-100 text-yellow-800', pro: 'bg-indigo-100 text-indigo-700', starter: 'bg-gray-100 text-gray-700' };
                    const sc = org.health_score >= 70 ? 'text-green-700 bg-green-50' : org.health_score >= 50 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-sm text-gray-400 font-medium">{i + 1}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-900 text-white rounded-lg flex items-center justify-center text-sm font-bold">{org.name.charAt(0)}</div>
                            <span className="font-medium text-gray-900 text-sm">{org.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${planColors2[org.plan] || 'bg-gray-100 text-gray-700'}`}>
                            {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">{fmtXOF(org.mrr)}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${sc}`}>{org.health_score}/100</span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">{org.months_active} mois</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}
export { MrrAnalysis };
