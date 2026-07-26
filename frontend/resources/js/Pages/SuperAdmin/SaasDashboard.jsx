import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── Données mock (remplacées par props Inertia en production) ────────────────
const MOCK = {
  kpis: {
    mrr: 6_850_000, arr: 82_200_000, mrr_growth: 12.4, churn_rate: 1.8,
    active_orgs: 47, mau: 1240, dau: 312, dau_mau_ratio: 25.2,
  },
  monthly_trend: [
    { month: 'Aoû 25', mrr: 3200000, active_orgs: 28, mau: 680, dau: 190, new_orgs: 4, churned_orgs: 1 },
    { month: 'Sep 25', mrr: 3650000, active_orgs: 31, mau: 780, dau: 210, new_orgs: 5, churned_orgs: 1 },
    { month: 'Oct 25', mrr: 4100000, active_orgs: 34, mau: 860, dau: 235, new_orgs: 4, churned_orgs: 1 },
    { month: 'Nov 25', mrr: 4500000, active_orgs: 36, mau: 940, dau: 255, new_orgs: 3, churned_orgs: 1 },
    { month: 'Déc 25', mrr: 4800000, active_orgs: 37, mau: 980, dau: 265, new_orgs: 2, churned_orgs: 1 },
    { month: 'Jan 26', mrr: 5100000, active_orgs: 39, mau: 1020, dau: 275, new_orgs: 3, churned_orgs: 1 },
    { month: 'Fév 26', mrr: 5400000, active_orgs: 40, mau: 1060, dau: 282, new_orgs: 2, churned_orgs: 1 },
    { month: 'Mar 26', mrr: 5700000, active_orgs: 41, mau: 1100, dau: 290, new_orgs: 2, churned_orgs: 1 },
    { month: 'Avr 26', mrr: 5950000, active_orgs: 42, mau: 1140, dau: 295, new_orgs: 2, churned_orgs: 1 },
    { month: 'Mai 26', mrr: 6200000, active_orgs: 44, mau: 1180, dau: 300, new_orgs: 3, churned_orgs: 1 },
    { month: 'Jui 26', mrr: 6550000, active_orgs: 45, mau: 1210, dau: 308, new_orgs: 2, churned_orgs: 1 },
    { month: 'Jul 26', mrr: 6850000, active_orgs: 47, mau: 1240, dau: 312, new_orgs: 3, churned_orgs: 1 },
  ],
  churn_risk_orgs: [
    { organization_name: 'Hôtel Ivoire Palace', health_score: 24, churn_risk: 'high', churn_reason: 'Inactivité prolongée' },
    { organization_name: 'Mairie de Bouaké',    health_score: 31, churn_risk: 'high', churn_reason: 'Faible adoption des modules' },
    { organization_name: 'ONG Espoir Sud',      health_score: 38, churn_risk: 'high', churn_reason: 'Tickets support non résolus' },
  ],
  top_organizations: [
    { name: 'Banque Nationale CI', plan: 'enterprise', mrr: 150000, health_score: 88, months_active: 18 },
    { name: 'ITIC Formations',     plan: 'enterprise', mrr: 150000, health_score: 82, months_active: 13 },
    { name: 'Cabinet Konan',       plan: 'pro',        mrr: 75000,  health_score: 71, months_active: 9  },
  ],
};

// ─── Formatage monnaie XOF ────────────────────────────────────────────────────
const fmtXOF = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v);

const fmtCompact = (v) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)} M XOF`
  : v >= 1_000 ? `${(v / 1_000).toFixed(0)} K XOF`
  : fmtXOF(v);

// ─── Tooltip custom ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name} : <strong>{
            typeof p.value === 'number' && p.value > 100000 ? fmtCompact(p.value) : p.value
          }</strong></span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, trend, accent = 'blue', icon }) {
  const acc = {
    blue:   { bg: 'bg-purple-50',   text: 'text-purple-900',   icon: 'bg-purple-100' },
    green:  { bg: 'bg-green-50',  text: 'text-green-800',  icon: 'bg-green-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-900', icon: 'bg-purple-100' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-800',  icon: 'bg-amber-100' },
    red:    { bg: 'bg-red-50',    text: 'text-red-800',    icon: 'bg-red-100' },
    teal:   { bg: 'bg-teal-50',   text: 'text-teal-800',   icon: 'bg-teal-100' },
  }[accent];

  return (
    <div className={`${acc.bg} rounded-xl p-5 border border-white shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${acc.text}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {icon && <div className={`p-2.5 rounded-lg ${acc.icon} flex-shrink-0 ml-3`}>{icon}</div>}
      </div>
      {trend !== undefined && (
        <p className={`text-xs mt-2 font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs mois précédent
        </p>
      )}
    </div>
  );
}

// ─── NavLink ──────────────────────────────────────────────────────────────────
function NavLink({ label, href, active }) {
  return (
    <button
      onClick={() => router.visit(href)}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-white/20 text-white'
          : 'text-purple-200 hover:text-white hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SaasDashboard({ kpis: propKpis, monthly_trend: propTrend, churn_risk_orgs: propChurn, top_organizations: propTop }) {
  const kpis   = propKpis       || MOCK.kpis;
  const trend  = propTrend      || MOCK.monthly_trend;
  const churn  = propChurn      || MOCK.churn_risk_orgs;
  const topOrgs = propTop       || MOCK.top_organizations;

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <>
      <Head title="SaaS Dashboard — SuperAdmin IBIG Soft" />

      <div className="min-h-screen bg-gray-50">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="bg-purple-900 text-white shadow-xl">
          <div className="max-w-screen-2xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center font-black text-xl border border-white/20">
                  IB
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold leading-tight">IBIG Soft</h1>
                    <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                      SUPER ADMIN
                    </span>
                  </div>
                  <p className="text-purple-200 text-xs">{today}</p>
                </div>
              </div>

              {/* Navigation SuperAdmin */}
              <nav className="hidden lg:flex items-center gap-1">
                <NavLink label="Dashboard SaaS" href="/superadmin/saas-dashboard" active />
                <NavLink label="MRR" href="/superadmin/metrics/mrr" />
                <NavLink label="Cohortes" href="/superadmin/metrics/cohorts" />
                <NavLink label="Santé orgs" href="/superadmin/metrics/health" />
                <NavLink label="Support" href="/superadmin/support" />
                <NavLink label="Feature Flags" href="/superadmin/feature-flags" />
                <NavLink label="Annonces" href="/superadmin/announcements" />
                <NavLink label="Monitoring" href="/superadmin/monitoring" />
                <NavLink label="Organisations" href="/superadmin/organizations" />
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">

          {/* ── KPI Row 1 : Revenus ─────────────────────────────────────── */}
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Revenus</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="MRR"
                value={fmtCompact(kpis.mrr)}
                trend={kpis.mrr_growth}
                accent="teal"
                icon={<svg className="w-5 h-5 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
              <KpiCard
                label="ARR"
                value={fmtCompact(kpis.arr)}
                sub="Revenu annuel récurrent"
                accent="blue"
                icon={<svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              />
              <KpiCard
                label="Croissance MRR"
                value={`${kpis.mrr_growth > 0 ? '+' : ''}${kpis.mrr_growth}%`}
                sub="vs mois précédent"
                accent={kpis.mrr_growth >= 0 ? 'green' : 'red'}
                icon={<svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
              />
              <KpiCard
                label="Churn Rate"
                value={`${kpis.churn_rate}%`}
                sub="Taux de désabonnement mensuel"
                accent={kpis.churn_rate < 2 ? 'green' : kpis.churn_rate < 5 ? 'amber' : 'red'}
                icon={<svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>}
              />
            </div>
          </section>

          {/* ── KPI Row 2 : Engagement ──────────────────────────────────── */}
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Engagement</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Orgs actives"   value={kpis.active_orgs}     sub="Licences en cours"            accent="blue"   />
              <KpiCard label="MAU"            value={kpis.mau.toLocaleString('fr-FR')} sub="Actifs dans les 30 derniers jours" accent="purple" />
              <KpiCard label="DAU"            value={kpis.dau.toLocaleString('fr-FR')} sub="Actifs aujourd'hui"               accent="green"  />
              <KpiCard label="DAU/MAU Ratio"  value={`${kpis.dau_mau_ratio}%`} sub="Indice d'engagement"       accent={kpis.dau_mau_ratio >= 20 ? 'green' : 'amber'} />
            </div>
          </section>

          {/* ── Graphiques ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* AreaChart : MRR 12 mois empilé par plan (ici global) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Évolution du MRR — 12 mois</h3>
              <p className="text-xs text-gray-400 mb-5">Revenue mensuel récurrent en XOF</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1e3a5f" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tickFormatter={v => `${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 10, fill: '#9ca3af' }} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="mrr" name="MRR" stroke="#1e3a5f" fill="url(#mrrGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* BarChart : Nouvelles orgs vs churned */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Nouvelles orgs vs Churned</h3>
              <p className="text-xs text-gray-400 mb-5">Acquisition et perte mensuelle d'organisations</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} width={25} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="new_orgs"     name="Nouvelles"   fill="#10b981" radius={[3,3,0,0]} />
                  <Bar dataKey="churned_orgs" name="Perdues"     fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* LineChart : DAU/MAU ratio */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Ratio DAU/MAU — Engagement</h3>
              <p className="text-xs text-gray-400 mb-5">Stickiness mensuel (20%+ = bon engagement)</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend.map(d => ({
                  ...d,
                  ratio: d.mau > 0 ? Math.round((d.dau / d.mau) * 1000) / 10 : 0,
                }))} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#9ca3af' }} width={35} domain={[0, 50]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="ratio" name="DAU/MAU" stroke="#8b5cf6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Cards : Métriques à surveiller */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Organisations à risque de churn</h3>
              {churn.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-10 h-10 mx-auto mb-2 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-green-600">Aucune organisation à risque élevé</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {churn.map((org, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-red-700 font-bold text-sm">{org.health_score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{org.organization_name}</p>
                        <p className="text-xs text-red-600 mt-0.5">{org.churn_reason}</p>
                      </div>
                      <button
                        onClick={() => router.visit('/superadmin/metrics/health')}
                        className="text-xs text-red-700 font-semibold hover:underline flex-shrink-0"
                      >
                        Voir →
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => router.visit('/superadmin/metrics/health')}
                    className="w-full text-center text-xs text-red-700 font-semibold hover:underline pt-1"
                  >
                    Voir tous les risques →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Top clients ─────────────────────────────────────────────── */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Top clients par MRR</h3>
              <button onClick={() => router.visit('/superadmin/metrics/mrr')} className="text-sm text-purple-700 font-semibold hover:underline">
                Analyse MRR complète →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3 text-left font-semibold">Organisation</th>
                    <th className="px-6 py-3 text-left font-semibold">Plan</th>
                    <th className="px-6 py-3 text-right font-semibold">MRR</th>
                    <th className="px-6 py-3 text-center font-semibold">Score santé</th>
                    <th className="px-6 py-3 text-left font-semibold">Ancienneté</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topOrgs.map((org, i) => {
                    const scoreColor = org.health_score >= 70 ? 'text-green-700 bg-green-50' : org.health_score >= 50 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
                    const planColors = { enterprise: 'bg-yellow-100 text-yellow-800', pro: 'bg-indigo-100 text-indigo-700', starter: 'bg-gray-100 text-gray-700' };
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-900 text-white rounded-lg flex items-center justify-center text-sm font-bold">{org.name.charAt(0)}</div>
                            <span className="font-medium text-gray-900 text-sm">{org.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${planColors[org.plan] || 'bg-gray-100 text-gray-700'}`}>
                            {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          {fmtXOF(org.mrr)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${scoreColor}`}>
                            {org.health_score}/100
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{org.months_active} mois</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

        </main>
      </div>
    </>
  );
}
export { SaasDashboard };
