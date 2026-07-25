import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtXOF = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v || 0);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—';

// ─── KpiCard ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue:   { bg: 'bg-purple-50',   icon: 'bg-purple-100',   text: 'text-purple-700' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100',  text: 'text-green-700' },
    amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100',  text: 'text-amber-700' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100', text: 'text-purple-700' },
    teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-100',   text: 'text-teal-700' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100',    text: 'text-red-700' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`${c.bg} rounded-xl p-5 border border-white shadow-sm`}>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${c.text} mt-1`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {trend != null && (
        <p className={`text-xs font-medium mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs période précédente
        </p>
      )}
    </div>
  );
}

// ─── AreaChart SVG natif ──────────────────────────────────────────────────────
function AreaChart({ data, xKey, yKey, color = '#1e3a5f', label }) {
  if (!data?.length) return <div className="text-center text-gray-400 py-8 text-sm">Aucune donnée</div>;
  const max = Math.max(...data.map(d => d[yKey] || 0), 1);
  const W = 600, H = 140, PL = 40, PR = 10, PT = 10, PB = 30;
  const iW = W - PL - PR, iH = H - PT - PB;
  const stepX = iW / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => ({ x: PL + i * stepX, y: PT + iH - ((d[yKey] || 0) / max) * iH, v: d[yKey], l: d[xKey] }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${PT + iH} L ${pts[0].x} ${PT + iH} Z`;
  const gId = `g_${Math.random().toString(36).slice(2)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 300 }}>
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(t => (
        <line key={t} x1={PL} y1={PT + iH * t} x2={W - PR} y2={PT + iH * t} stroke="#e5e7eb" strokeWidth="1" />
      ))}
      <path d={areaD} fill={`url(#${gId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="9" fill="#374151" fontWeight="600">{p.v}</text>
          {(i === 0 || i === data.length - 1 || i % 2 === 0) && (
            <text x={p.x} y={H - 5} textAnchor="middle" fontSize="9" fill="#9ca3af">{p.l}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ─── BarChart groupé ──────────────────────────────────────────────────────────
function GroupedBarChart({ data, xKey, series }) {
  if (!data?.length) return <div className="text-center text-gray-400 py-8 text-sm">Aucune donnée</div>;
  const maxVal = Math.max(...data.flatMap(d => series.map(s => d[s.key] || 0)), 1);
  const W = 600, H = 160, PL = 30, PR = 10, PT = 10, PB = 25;
  const iW = W - PL - PR, iH = H - PT - PB;
  const groupW = iW / data.length;
  const barW = (groupW - 8) / series.length - 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 300 }}>
      {[0, 0.5, 1].map(t => (
        <line key={t} x1={PL} y1={PT + iH * t} x2={W - PR} y2={PT + iH * t} stroke="#e5e7eb" strokeWidth="1" />
      ))}
      {data.map((d, gi) => (
        <g key={gi}>
          {series.map((s, si) => {
            const val = d[s.key] || 0;
            const bH = (val / maxVal) * iH;
            const x = PL + gi * groupW + 4 + si * (barW + 2);
            const y = PT + iH - bH;
            return (
              <g key={si}>
                <rect x={x} y={y} width={barW} height={bH} fill={s.color} rx="3" />
                {val > 0 && (
                  <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="9" fill={s.color} fontWeight="700">{val}</text>
                )}
              </g>
            );
          })}
          <text x={PL + gi * groupW + groupW / 2} y={H - 5} textAnchor="middle" fontSize="9" fill="#9ca3af">
            {d[xKey]}
          </text>
        </g>
      ))}
      {/* Légende */}
      {series.map((s, i) => (
        <g key={i} transform={`translate(${PL + i * 80}, ${H - 5})`}>
          <rect width="8" height="8" fill={s.color} rx="2" />
          <text x="11" y="8" fontSize="9" fill="#6b7280">{s.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── PieChart SVG natif ───────────────────────────────────────────────────────
function PieChart({ data, labelKey, valueKey, colors: colorList }) {
  if (!data?.length) return <div className="text-center text-gray-400 py-8 text-sm">Aucune donnée</div>;
  const total = data.reduce((s, d) => s + (d[valueKey] || 0), 0);
  const CX = 80, CY = 80, R = 70;
  let angle = -Math.PI / 2;
  const COLORS = colorList || ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];

  const slices = data.map((d, i) => {
    const val  = d[valueKey] || 0;
    const frac = total > 0 ? val / total : 0;
    const a0   = angle;
    const a1   = angle + frac * 2 * Math.PI;
    angle = a1;
    const x0 = CX + R * Math.cos(a0), y0 = CY + R * Math.sin(a0);
    const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
    const large = frac > 0.5 ? 1 : 0;
    return { d: `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`, color: COLORS[i % COLORS.length], label: d[labelKey], val, pct: Math.round(frac * 100) };
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="w-40 h-40 flex-shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="2" />
        ))}
      </svg>
      <div className="flex-1 space-y-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-gray-700 font-medium">{s.label}</span>
            </div>
            <span className="text-gray-500 font-semibold">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Funnel ───────────────────────────────────────────────────────────────────
function FunnelChart({ data }) {
  if (!data?.length) return null;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((stage, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-32 truncate text-right">{stage.stage}</span>
          <div className="flex-1 relative h-7">
            <div
              className="h-7 rounded transition-all"
              style={{
                width: `${Math.max((stage.count / maxCount) * 100, 4)}%`,
                backgroundColor: `hsl(${210 - i * 25}, 70%, ${40 + i * 5}%)`,
              }}
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white">
              {stage.count}
            </span>
          </div>
          {i > 0 && (
            <span className="text-xs text-gray-400 w-10">{stage.conversion}%</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function CrmAnalytics() {
  const [data, setData]   = useState(null);
  const [period, setPeriod] = useState(6);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = new Date();
      start.setMonth(start.getMonth() - period);
      const res = await axios.get('/superadmin/crm/analytics', {
        params: { start: start.toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
      });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [period]);

  // Données mockées pour la prévisualisation
  const MOCK = {
    total_pipeline: 12_500_000,
    mrr_current: 3_750_000,
    mrr_forecast: 4_312_500,
    deals_won: 8,
    deals_lost: 3,
    avg_conversion_days: 42,
    conversion_rates: [
      { stage: 'Nouveau lead', count: 120, conversion: 100 },
      { stage: 'Contacté', count: 85, conversion: 70.8 },
      { stage: 'Démo planifiée', count: 48, conversion: 56.5 },
      { stage: 'Proposition', count: 32, conversion: 66.7 },
      { stage: 'Négociation', count: 18, conversion: 56.3 },
      { stage: 'Gagné', count: 8, conversion: 44.4 },
    ],
    top_sources: [
      { source: 'web', count: 45 },
      { source: 'referral', count: 28 },
      { source: 'event', count: 21 },
      { source: 'cold', count: 18 },
      { source: 'partner', count: 8 },
    ],
    new_leads_by_week: [
      { week: '02/06', count: 5 }, { week: '09/06', count: 8 }, { week: '16/06', count: 12 },
      { week: '23/06', count: 7 }, { week: '30/06', count: 15 }, { week: '07/07', count: 11 },
      { week: '14/07', count: 9 }, { week: '21/07', count: 14 },
    ],
    deals_by_month: [
      { month: 'Fév', won: 2, lost: 1 }, { month: 'Mar', won: 3, lost: 0 },
      { month: 'Avr', won: 1, lost: 2 }, { month: 'Mai', won: 4, lost: 1 },
      { month: 'Jun', won: 2, lost: 0 }, { month: 'Jul', won: 8, lost: 3 },
    ],
    top_deals: [
      { id: 1, title: 'ERP Banque CI', contact: { company_name: 'Banque Nationale CI' }, stage: { name: 'Négociation', color: '#f59e0b' }, value: 2_400_000, probability: 70, close_date_expected: '2026-08-15' },
      { id: 2, title: 'Système GRH', contact: { company_name: 'Ministère de la Santé' }, stage: { name: 'Démo planifiée', color: '#3b82f6' }, value: 1_800_000, probability: 40, close_date_expected: '2026-09-01' },
      { id: 3, title: 'SECRETIS Enterprise', contact: { company_name: 'ONG Green Africa' }, stage: { name: 'Proposition', color: '#8b5cf6' }, value: 1_200_000, probability: 55, close_date_expected: '2026-08-30' },
    ],
  };

  const d = data || MOCK;

  return (
    <>
      <Head title="Analytiques CRM — SuperAdmin IBIG Soft" />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-purple-900 text-white px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Analytiques CRM — IBIG Soft</h1>
              <p className="text-purple-200 text-xs mt-0.5">Vue commerciale consolidée</p>
            </div>
            <div className="flex items-center gap-3">
              {loading && <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />}
              <select
                value={period}
                onChange={e => setPeriod(Number(e.target.value))}
                className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm"
              >
                <option value={3}>3 mois</option>
                <option value={6}>6 mois</option>
                <option value={12}>12 mois</option>
              </select>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

          {/* ── KPIs ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard label="Pipeline total"    value={fmtXOF(d.total_pipeline)} color="blue" />
            <KpiCard label="MRR actuel"        value={fmtXOF(d.mrr_current)}   color="green" trend={15} />
            <KpiCard label="MRR prévu (+3m)"   value={fmtXOF(d.mrr_forecast)}  color="teal" />
            <KpiCard label="Deals gagnés"      value={d.deals_won}              color="green" />
            <KpiCard label="Deals perdus"      value={d.deals_lost}             color="red" />
            <KpiCard label="Délai moyen"       value={`${d.avg_conversion_days}j`} sub="Lead → Client" color="purple" />
          </div>

          {/* ── Graphiques principaux ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Nouveaux leads par semaine */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Nouveaux leads par semaine</h2>
              <p className="text-xs text-gray-400 mb-4">8 dernières semaines</p>
              <AreaChart data={d.new_leads_by_week} xKey="week" yKey="count" color="#1e3a5f" />
            </div>

            {/* Deals gagnés / perdus par mois */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Deals gagnés / perdus</h2>
              <p className="text-xs text-gray-400 mb-4">6 derniers mois</p>
              <GroupedBarChart
                data={d.deals_by_month}
                xKey="month"
                series={[
                  { key: 'won',  label: 'Gagnés', color: '#16a34a' },
                  { key: 'lost', label: 'Perdus',  color: '#ef4444' },
                ]}
              />
            </div>
          </div>

          {/* ── Funnel + Sources ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Funnel de conversion */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Funnel de conversion</h2>
              <p className="text-xs text-gray-400 mb-6">Taux entre chaque étape</p>
              <FunnelChart data={d.conversion_rates} />
            </div>

            {/* Sources de leads */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Sources de leads</h2>
              <PieChart
                data={d.top_sources}
                labelKey="source"
                valueKey="count"
              />
            </div>
          </div>

          {/* ── Top 10 deals en cours ─────────────────────────────────────── */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Top deals en cours</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider bg-gray-50">
                    <th className="px-6 py-3 text-left font-semibold">Société</th>
                    <th className="px-6 py-3 text-left font-semibold">Deal</th>
                    <th className="px-6 py-3 text-left font-semibold">Étape</th>
                    <th className="px-6 py-3 text-right font-semibold">Valeur</th>
                    <th className="px-6 py-3 text-right font-semibold">Proba</th>
                    <th className="px-6 py-3 text-right font-semibold">Clôture prévue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.top_deals?.map(deal => (
                    <tr key={deal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{deal.contact?.company_name}</td>
                      <td className="px-6 py-4 text-gray-600">{deal.title}</td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: (deal.stage?.color || '#6b7280') + '20', color: deal.stage?.color || '#6b7280' }}
                        >
                          {deal.stage?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-purple-900">{fmtXOF(deal.value)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${deal.probability || 0}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{deal.probability}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">{fmtDate(deal.close_date_expected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </main>
      </div>
    </>
  );
}
export { CrmAnalytics };
