/**
 * SuperAdmin/Metrics.jsx — Tableau de bord financier et produit
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes props Inertia (`kpis`, `mrr_history`,
 * `growth_history`, `revenue_by_plan`, `cohorts`, `computed_at`),
 * même rafraîchissement automatique toutes les 5 minutes, même export
 * (`route('superadmin.metrics.export')`).
 *
 * Corrections d'affichage :
 *   - le `min-h-screen bg-slate-50 p-6` interne doublait le fond et le
 *     padding déjà fournis par `SuperAdminLayout` ;
 *   - les drapeaux emoji de la répartition géographique sont remplacés par
 *     le code pays ISO (aucune icône emoji dans le design system).
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Head } from '@inertiajs/react'
import {
  LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  BarChart3, CircleDollarSign, Activity, TrendingUp, TrendingDown,
  Users, Building2, Download, RefreshCw,
} from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Card, StatCard,
  cx, SURFACE, BORDER, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, TH, NUM,
} from '@/Components/UI'

/* ─── Palette des graphiques ───────────────────────────────────────────────── */

const C = {
  accent:   '#9333EA',
  info:     '#0EA5E9',
  warning:  '#F59E0B',
  success:  '#10B981',
  danger:   '#EF4444',
  neutral:  '#94A3B8',
}

const AXIS_COLOR = C.neutral
const axisProps = {
  tick: { fontSize: 11, fill: AXIS_COLOR },
  tickLine: false,
  axisLine: { stroke: AXIS_COLOR, strokeOpacity: 0.35 },
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const fmt = n => new Intl.NumberFormat('fr-FR').format(Math.round(n ?? 0))

const fmtK = n => {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

const fmtFcfa = n => {
  const v = Math.round(n ?? 0)
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} M FCFA`
  return `${fmt(v)} FCFA`
}

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className={cx(SURFACE, 'border', BORDER, 'rounded-lg px-3 py-2 text-xs shadow-lg')}>
      <p className={cx('mb-1 font-semibold', TEXT_TITLE)}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
          <span className={TEXT_MUTED}>{p.name} :</span>
          <span className={cx('font-semibold', TEXT_TITLE, NUM)}>
            {currency ? fmtFcfa(p.value) : fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── Rétention ────────────────────────────────────────────────────────────── */

const RETENTION_SCALE = [
  { min: 90, color: '#047857', label: '≥ 90 %' },
  { min: 75, color: '#10B981', label: '75–90 %' },
  { min: 60, color: '#F59E0B', label: '60–75 %' },
  { min: 40, color: '#EA580C', label: '40–60 %' },
  { min: 0,  color: '#DC2626', label: '< 40 %' },
]

function RetentionCell({ value }) {
  if (value == null) {
    return <td className={cx('p-2 text-center text-xs', TEXT_FAINT)}>—</td>
  }
  const scale = RETENTION_SCALE.find(s => value >= s.min) ?? RETENTION_SCALE[RETENTION_SCALE.length - 1]
  return (
    <td className="p-2 text-center">
      <span
        className={cx('inline-block rounded px-1.5 py-0.5 text-xs font-semibold text-white', NUM)}
        style={{ background: scale.color }}
      >
        {value} %
      </span>
    </td>
  )
}

/* ─── Pays OHADA ───────────────────────────────────────────────────────────── */

const OHADA_NAMES = {
  CI: "Côte d'Ivoire", SN: 'Sénégal', CM: 'Cameroun', BJ: 'Bénin',
  BF: 'Burkina Faso', ML: 'Mali', NE: 'Niger', TG: 'Togo',
  GN: 'Guinée', CG: 'Congo', GA: 'Gabon', CD: 'RD Congo',
  MG: 'Madagascar', GW: 'Guinée-Bissau', KM: 'Comores',
}

const PLAN_LABELS = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise', trial: 'Essai', on_premise: 'On-Premise' }
const PIE_COLORS = [C.accent, C.info, C.warning, C.success, C.neutral]
const PERIODS = ['M+0', 'M+1', 'M+3', 'M+6', 'M+12']

function EmptyChart({ label }) {
  return (
    <div className={cx('flex h-40 items-center justify-center rounded-lg border border-dashed text-sm', BORDER, TEXT_MUTED)}>
      {label}
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function Metrics({
  kpis = {},
  mrr_history = [],
  growth_history = [],
  revenue_by_plan = [],
  cohorts = [],
  computed_at,
}) {
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh] = useState(computed_at)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      window.location.reload()
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const id = setInterval(handleRefresh, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [handleRefresh])

  const handleExport = () => {
    window.open(route('superadmin.metrics.export'), '_blank')
  }

  const planTotal = revenue_by_plan.reduce((s, r) => s + (r.revenue ?? 0), 0)

  return (
    <SuperAdminLayout title="Métriques SaaS">
      <Head title="Métriques SaaS — SECRETIS" />

      <PageHeader
        icon={BarChart3}
        title="Métriques SaaS"
        subtitle={
          lastRefresh
            ? `Tableau de bord financier et produit · calculé à ${new Date(lastRefresh).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            : 'Tableau de bord financier et produit de la plateforme.'
        }
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'Métriques' }]}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={handleExport}>
              Exporter CSV
            </Button>
            <Button variant="primary" icon={RefreshCw} loading={refreshing} onClick={handleRefresh}>
              Actualiser
            </Button>
          </>
        }
      />

      <div className="space-y-6">

        {/* ── Indicateurs financiers ──────────────────────────────────────── */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={CircleDollarSign} tone="accent" label="MRR (mensuel)"
            value={fmtFcfa(kpis.mrr)} delta={kpis.mrr_growth} deltaGood="up"
          />
          <StatCard icon={CircleDollarSign} tone="accent" label="ARR (annuel)" value={fmtFcfa(kpis.arr)} />
          <StatCard
            icon={Activity}
            tone={(kpis.nrr ?? 0) >= 100 ? 'success' : 'danger'}
            label="NRR" value={kpis.nrr ?? 0} unit="%"
            hint="Net Revenue Retention"
          />
          <StatCard
            icon={TrendingUp} tone="warning" label="Conversion essai → payant"
            value={kpis.trial_conversion_rate ?? 0} unit="%" hint="30 derniers jours"
          />
          <StatCard
            icon={TrendingDown}
            tone={(kpis.churn_rate ?? 0) > 5 ? 'danger' : 'success'}
            label="Churn mensuel" value={kpis.churn_rate ?? 0} unit="%"
            hint="Licences annulées ce mois"
          />
        </section>

        {/* ── Indicateurs produit ─────────────────────────────────────────── */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={Users} tone="accent" label="DAU" value={fmt(kpis.dau)} hint="Actifs aujourd'hui" />
          <StatCard icon={Users} tone="info" label="MAU" value={fmt(kpis.mau)} hint="Actifs sur 30 jours" />
          <StatCard icon={Activity} tone="warning" label="DAU / MAU" value={kpis.dau_mau_ratio ?? 0} unit="%" hint="Récurrence d'usage" />
          <StatCard icon={Building2} tone="success" label="Organisations actives" value={fmt(kpis.active_organizations)} hint="Licences en cours" />
        </section>

        {/* ── Évolution du MRR ────────────────────────────────────────────── */}
        <Card
          title="Évolution du MRR — 12 mois"
          subtitle="MRR total, nouveau MRR (nouveaux clients) et MRR perdu (annulations)"
        >
          {mrr_history.length === 0 ? (
            <EmptyChart label="Aucune donnée MRR disponible." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mrr_history} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.2} vertical={false} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis tickFormatter={fmtK} {...axisProps} />
                  <Tooltip content={<ChartTooltip currency />} cursor={{ stroke: AXIS_COLOR, strokeOpacity: 0.3 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }} />
                  <Line dataKey="mrr"         name="MRR total"   stroke={C.accent}  strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  <Line dataKey="new_mrr"     name="Nouveau MRR" stroke={C.success} strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  <Line dataKey="churned_mrr" name="MRR perdu"   stroke={C.danger}  strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* ── Croissance ──────────────────────────────────────────────────── */}
        <Card
          title="Croissance — organisations et utilisateurs"
          subtitle="Évolution du parc sur 12 mois"
        >
          {growth_history.length === 0 ? (
            <EmptyChart label="Aucune donnée de croissance disponible." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growth_history} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="metricsGradOrgs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.accent} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.accent} stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="metricsGradUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.info} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.info} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.2} vertical={false} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: AXIS_COLOR, strokeOpacity: 0.3 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }} />
                  <Area dataKey="organizations" name="Organisations" stroke={C.accent} fill="url(#metricsGradOrgs)"  strokeWidth={2} dot={false} />
                  <Area dataKey="users"         name="Utilisateurs"  stroke={C.info}   fill="url(#metricsGradUsers)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* ── Plans + géographie ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          <Card title="Revenu par plan" subtitle="MRR mensuel par niveau d'abonnement">
            {revenue_by_plan.length === 0 ? (
              <EmptyChart label="Aucune donnée de plan." />
            ) : (
              <div className="flex flex-wrap items-center gap-6">
                <div className="h-48 w-48 shrink-0">
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
                        contentStyle={{
                          background: 'rgba(22,32,50,0.96)', border: '1px solid #1E3048',
                          borderRadius: 8, fontSize: 12, color: '#fff',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <ul className="min-w-[200px] flex-1 space-y-2">
                  {revenue_by_plan.map((item, i) => {
                    const pct = planTotal > 0 ? Math.round((item.revenue / planTotal) * 100) : 0
                    return (
                      <li key={item.plan} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className={cx('flex-1', TEXT_BODY)}>{PLAN_LABELS[item.plan] ?? item.plan}</span>
                        <span className={cx('font-semibold', TEXT_TITLE, NUM)}>{pct} %</span>
                        <span className={cx('text-xs', TEXT_FAINT, NUM)}>({item.count} clients)</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </Card>

          <Card title="Répartition géographique" subtitle="Clients par pays de la zone OHADA">
            <ul className="max-h-52 space-y-1 overflow-y-auto">
              {Object.entries(OHADA_NAMES).map(([code, name]) => (
                <li
                  key={code}
                  className="flex items-center gap-3 border-b border-gray-100 py-1.5 last:border-0 dark:border-[#1E3048]"
                >
                  <span className={cx('w-8 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-center font-mono text-xs dark:bg-white/[0.06]', TEXT_MUTED)}>
                    {code}
                  </span>
                  <span className={cx('flex-1 text-sm', TEXT_BODY)}>{name}</span>
                  <span className={cx('text-xs font-semibold', TEXT_MUTED, NUM)}>—</span>
                </li>
              ))}
            </ul>
            <p className={cx('mt-3 text-xs', TEXT_FAINT)}>
              Les données géographiques seront disponibles après l'ajout du champ pays côté organisation.
            </p>
          </Card>
        </div>

        {/* ── Cohortes ────────────────────────────────────────────────────── */}
        <Card
          title="Rétention par cohorte"
          subtitle="Part d'organisations encore actives à chaque période depuis leur souscription"
          footer={
            <div className={cx('flex flex-wrap items-center gap-4 text-xs', TEXT_MUTED)}>
              {RETENTION_SCALE.map(s => (
                <span key={s.label} className="flex items-center gap-1.5">
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          }
        >
          {cohorts.length === 0 ? (
            <EmptyChart label="Pas encore de données de cohorte." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className={cx('border-b', BORDER)}>
                    <th scope="col" className={cx('whitespace-nowrap pb-2 pr-4 text-left', TH)}>Cohorte</th>
                    <th scope="col" className={cx('px-2 pb-2 text-right', TH)}>Départ</th>
                    {PERIODS.map(p => (
                      <th key={p} scope="col" className={cx('px-2 pb-2 text-center', TH)}>{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map(row => (
                    <tr key={row.cohort} className="border-b border-gray-100 last:border-0 dark:border-[#1E3048]">
                      <td className={cx('whitespace-nowrap py-1.5 pr-4 font-medium', TEXT_BODY)}>{row.cohort}</td>
                      <td className={cx('px-2 py-1.5 text-right font-semibold', TEXT_TITLE, NUM)}>{row.initial}</td>
                      {PERIODS.map(p => <RetentionCell key={p} value={row.periods?.[p]} />)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </SuperAdminLayout>
  )
}

export { Metrics };
