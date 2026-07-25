import React, { useState, useEffect, useCallback } from 'react'
import { Head } from '@inertiajs/react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Palette brand ────────────────────────────────────────────────────────────
const C = {
  primary:   '#9333EA',
  secondary: '#7e22ce',
  accent:    '#F39C12',
  success:   '#1E8449',
  danger:    '#C0392B',
  muted:     '#64748B',
  newMrr:    '#22C55E',
  churnMrr:  '#EF4444',
  expMrr:    '#3B82F6',
}

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ic = {
  TrendUp:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
  TrendDown:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17H5m0 0V9m0 8l8-8 4 4 6-6"/></svg>,
  Users:      () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Building:   () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
  DollarSign: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Download:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>,
  Refresh:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  Activity:   () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt   = n => new Intl.NumberFormat('fr-FR').format(Math.round(n ?? 0))
const fmtK  = n => {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return String(n)
}
const fmtFcfa = n => {
  const v = Math.round(n ?? 0)
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + ' M FCFA'
  return fmt(v) + ' FCFA'
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, trend, trendDir, accentColor }) {
  const trendPositive = trendDir === 'up'
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg" style={{ background: `${accentColor}18` }}>
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
        {trend != null && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            trendPositive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {trendPositive ? <Ic.TrendUp /> : <Ic.TrendDown />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</div>}
      </div>
    </div>
  )
}

// ─── Tooltip personnalisé ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-500 dark:text-slate-400">{p.name} :</span>
          <span className="font-semibold text-slate-800 dark:text-white">
            {currency ? fmtFcfa(p.value) : fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-slate-800 dark:text-white">{title}</h2>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Heatmap cellule rétention ────────────────────────────────────────────────
function RetentionCell({ value }) {
  if (value == null) return <td className="p-2 text-center text-xs text-slate-300 dark:text-slate-600">—</td>
  const pct = value / 100
  const bg = pct >= 0.9 ? '#1E8449'
           : pct >= 0.75 ? '#27AE60'
           : pct >= 0.6 ? '#F39C12'
           : pct >= 0.4 ? '#E67E22'
           : '#C0392B'
  return (
    <td className="p-2 text-center">
      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold text-white tabular-nums"
            style={{ background: bg }}>
        {value}%
      </span>
    </td>
  )
}

// ─── Composant pays OHADA ─────────────────────────────────────────────────────
const OHADA_FLAGS = {
  'CI': '🇨🇮', 'SN': '🇸🇳', 'CM': '🇨🇲', 'BJ': '🇧🇯', 'BF': '🇧🇫',
  'ML': '🇲🇱', 'NE': '🇳🇪', 'TG': '🇹🇬', 'GN': '🇬🇳', 'CG': '🇨🇬',
  'GA': '🇬🇦', 'CD': '🇨🇩', 'MG': '🇲🇬', 'GW': '🇬🇼', 'KM': '🇰🇲',
}
const OHADA_NAMES = {
  'CI': 'Côte d\'Ivoire', 'SN': 'Sénégal', 'CM': 'Cameroun', 'BJ': 'Bénin',
  'BF': 'Burkina Faso', 'ML': 'Mali', 'NE': 'Niger', 'TG': 'Togo',
  'GN': 'Guinée', 'CG': 'Congo', 'GA': 'Gabon', 'CD': 'RD Congo',
  'MG': 'Madagascar', 'GW': 'Guinée-Bissau', 'KM': 'Comores',
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Metrics({ kpis = {}, mrr_history = [], growth_history = [], revenue_by_plan = [], cohorts = [], computed_at }) {
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(computed_at)

  // Auto-refresh toutes les 5 minutes
  useEffect(() => {
    const id = setInterval(handleRefresh, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      // Reload Inertia page
      window.location.reload()
    } finally {
      setRefreshing(false)
    }
  }, [])

  const handleExport = () => {
    window.open(route('superadmin.metrics.export'), '_blank')
  }

  // Couleurs PieChart
  const PIE_COLORS = [C.primary, C.secondary, C.accent, C.success, C.muted]

  const PLAN_LABELS = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise', trial: 'Essai', on_premise: 'On-Premise' }

  return (
    <SuperAdminLayout>
      <Head title="Métriques SaaS — SECRETIS" />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">

        {/* ── En-tête page ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Métriques SaaS</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Tableau de bord financier et produit — IBIG SECRETIS
              {lastRefresh && (
                <span className="ml-2 text-xs text-slate-400">
                  · Calculé {new Date(lastRefresh).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Ic.Download />
              Exporter CSV
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60"
              style={{ background: C.secondary }}
            >
              <span className={refreshing ? 'animate-spin' : ''}><Ic.Refresh /></span>
              {refreshing ? 'Actualisation…' : 'Actualiser'}
            </button>
          </div>
        </div>

        {/* ── Rangée 1 : KPIs financiers ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
          <KpiCard
            icon={<Ic.DollarSign />}
            label="MRR (mensuel)"
            value={fmtFcfa(kpis.mrr)}
            trend={kpis.mrr_growth}
            trendDir={kpis.mrr_growth >= 0 ? 'up' : 'down'}
            accentColor={C.secondary}
          />
          <KpiCard
            icon={<Ic.DollarSign />}
            label="ARR (annuel)"
            value={fmtFcfa(kpis.arr)}
            accentColor={C.primary}
          />
          <KpiCard
            icon={<Ic.Activity />}
            label="NRR"
            value={`${kpis.nrr ?? 0}%`}
            sub="Net Revenue Retention"
            trendDir={kpis.nrr >= 100 ? 'up' : 'down'}
            accentColor={kpis.nrr >= 100 ? C.success : C.danger}
          />
          <KpiCard
            icon={<Ic.TrendUp />}
            label="Conversion Essai→Payant"
            value={`${kpis.trial_conversion_rate ?? 0}%`}
            sub="30 derniers jours"
            accentColor={C.accent}
          />
          <KpiCard
            icon={<Ic.TrendDown />}
            label="Churn mensuel"
            value={`${kpis.churn_rate ?? 0}%`}
            sub="Licences annulées ce mois"
            trendDir={kpis.churn_rate > 5 ? 'down' : 'up'}
            accentColor={C.danger}
          />
        </div>

        {/* ── Rangée 2 : KPIs produit ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <KpiCard
            icon={<Ic.Users />}
            label="DAU"
            value={fmt(kpis.dau)}
            sub="Utilisateurs actifs aujourd'hui"
            accentColor={C.secondary}
          />
          <KpiCard
            icon={<Ic.Users />}
            label="MAU"
            value={fmt(kpis.mau)}
            sub="Utilisateurs actifs 30 jours"
            accentColor={C.primary}
          />
          <KpiCard
            icon={<Ic.Activity />}
            label="DAU / MAU"
            value={`${kpis.dau_mau_ratio ?? 0}%`}
            sub="Stickiness ratio"
            accentColor={C.accent}
          />
          <KpiCard
            icon={<Ic.Building />}
            label="Orgs actives"
            value={fmt(kpis.active_organizations)}
            sub="Licences en cours"
            accentColor={C.success}
          />
        </div>

        {/* ── Section MRR History ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <SectionHeader
            title="Évolution du MRR — 12 mois"
            sub="MRR total, nouveau MRR (nouveaux clients) et MRR churné (annulations)"
          />
          {mrr_history.length === 0 ? (
            <EmptyChart label="Aucune donnée MRR disponible." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mrr_history} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.muted }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false}
                    tickFormatter={v => fmtK(v)} />
                  <Tooltip content={<CustomTooltip currency />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="mrr" name="MRR Total" stroke={C.secondary} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  <Line dataKey="new_mrr" name="Nouveau MRR" stroke={C.newMrr} strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  <Line dataKey="churned_mrr" name="MRR Churné" stroke={C.churnMrr} strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Section Croissance ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <SectionHeader
            title="Croissance — Organisations & Utilisateurs"
            sub="Évolution du nombre d'organisations et d'utilisateurs sur 12 mois"
          />
          {growth_history.length === 0 ? (
            <EmptyChart label="Aucune donnée de croissance disponible." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growth_history} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="gradOrgs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.primary} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={C.primary} stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.accent} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={C.accent} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.muted }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area dataKey="organizations" name="Organisations" stroke={C.primary} fill="url(#gradOrgs)" strokeWidth={2} dot={false} />
                  <Area dataKey="users" name="Utilisateurs" stroke={C.accent} fill="url(#gradUsers)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Grille : Répartition plans + Pays ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Répartition par plan */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <SectionHeader title="Revenu par plan" sub="MRR mensuel par niveau d'abonnement" />
            {revenue_by_plan.length === 0 ? (
              <EmptyChart label="Aucune donnée de plan." />
            ) : (
              <div className="flex gap-6 items-center">
                <div className="h-48 w-48 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenue_by_plan}
                        dataKey="revenue"
                        nameKey="plan"
                        cx="50%" cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {revenue_by_plan.map((entry, i) => (
                          <Cell key={entry.plan} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, n) => [fmtFcfa(v), PLAN_LABELS[n] ?? n]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {revenue_by_plan.map((item, i) => {
                    const total = revenue_by_plan.reduce((s, r) => s + r.revenue, 0)
                    const pct = total > 0 ? Math.round((item.revenue / total) * 100) : 0
                    return (
                      <div key={item.plan} className="flex items-center gap-2 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-slate-600 dark:text-slate-400 flex-1">{PLAN_LABELS[item.plan] ?? item.plan}</span>
                        <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{pct}%</span>
                        <span className="text-xs text-slate-400">({item.count} clients)</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Répartition pays OHADA */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <SectionHeader title="Répartition géographique" sub="Clients par pays OHADA" />
            <div className="space-y-2 overflow-y-auto max-h-52">
              {Object.entries(OHADA_NAMES).map(([code, name]) => (
                <div key={code} className="flex items-center gap-3 py-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                  <span className="text-xl">{OHADA_FLAGS[code]}</span>
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{name}</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">—</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">* Données géographiques disponibles après implémentation du champ pays.</p>
          </div>
        </div>

        {/* ── Tableau cohortes de rétention ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <SectionHeader
            title="Analyse de rétention par cohorte"
            sub="Pourcentage d'organisations encore actives à chaque période depuis leur souscription"
          />
          {cohorts.length === 0 ? (
            <EmptyChart label="Pas encore de données de cohorte." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                    <th className="pb-2 pr-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">Cohorte</th>
                    <th className="pb-2 px-2 text-center font-semibold text-slate-600 dark:text-slate-400">Départ</th>
                    {['M+0', 'M+1', 'M+3', 'M+6', 'M+12'].map(p => (
                      <th key={p} className="pb-2 px-2 text-center font-semibold text-slate-600 dark:text-slate-400">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((row) => (
                    <tr key={row.cohort} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-1.5 pr-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.cohort}</td>
                      <td className="py-1.5 px-2 text-center font-semibold text-slate-800 dark:text-white tabular-nums">{row.initial}</td>
                      {['M+0', 'M+1', 'M+3', 'M+6', 'M+12'].map(p => (
                        <RetentionCell key={p} value={row.periods?.[p]} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
            <LegendDot color="#1E8449" label="≥ 90%" />
            <LegendDot color="#27AE60" label="75–90%" />
            <LegendDot color="#F39C12" label="60–75%" />
            <LegendDot color="#E67E22" label="40–60%" />
            <LegendDot color="#C0392B" label="< 40%" />
          </div>
        </div>

      </div>
    </SuperAdminLayout>
  )
}

function EmptyChart({ label }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
      {label}
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}
export { Metrics };
