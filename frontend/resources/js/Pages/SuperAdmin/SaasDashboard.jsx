/**
 * SuperAdmin/SaasDashboard.jsx — Métriques SaaS consolidées (IBIG Soft)
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes props Inertia (`kpis`, `monthly_trend`,
 * `churn_risk_orgs`, `top_organizations`), mêmes destinations `router.visit`.
 *
 * La barre de navigation violette qui était dupliquée en haut de page a été
 * retirée : `SuperAdminLayout` fournit déjà la navigation de la console.
 */

import React from 'react';
import { Head, router } from '@inertiajs/react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  CircleDollarSign, BarChart3, TrendingUp, LogOut, Users, Activity,
  ShieldCheck, ArrowRight, Gauge,
} from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, DataTable, EmptyState,
  cx, SURFACE, BORDER, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, NUM,
} from '@/Components/UI';

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */
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

/* ─── Formatage ────────────────────────────────────────────────────────────── */

const fmtXOF = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v ?? 0);

const fmtCompact = (v) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)} M XOF`
    : v >= 1_000 ? `${(v / 1_000).toFixed(0)} K XOF`
    : fmtXOF(v);

/* Axes et grilles neutres : lisibles en thème clair comme en thème sombre. */
const AXIS_COLOR = '#94A3B8';
const axisProps = {
  tick: { fontSize: 10, fill: AXIS_COLOR },
  tickLine: { stroke: AXIS_COLOR },
  axisLine: { stroke: AXIS_COLOR, strokeOpacity: 0.35 },
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={cx(SURFACE, 'border', BORDER, 'rounded-lg px-3 py-2 text-xs shadow-lg')}>
      <p className={cx('mb-1 font-semibold', TEXT_TITLE)}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
          <span className={TEXT_MUTED}>
            {p.name} :{' '}
            <span className={cx('font-semibold', TEXT_TITLE, NUM)}>
              {typeof p.value === 'number' && p.value > 100000 ? fmtCompact(p.value) : p.value}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

const PLAN_TONE = { enterprise: 'accent', pro: 'info', starter: 'neutral' };

const scoreTone = (s) => (s >= 70 ? 'success' : s >= 50 ? 'warning' : 'danger');

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function SaasDashboard({
  kpis: propKpis,
  monthly_trend: propTrend,
  churn_risk_orgs: propChurn,
  top_organizations: propTop,
}) {
  const kpis    = propKpis  ?? MOCK.kpis;
  const trend   = propTrend ?? MOCK.monthly_trend;
  const churn   = propChurn ?? MOCK.churn_risk_orgs;
  const topOrgs = propTop   ?? MOCK.top_organizations;

  const ratioTrend = trend.map(d => ({
    ...d,
    ratio: d.mau > 0 ? Math.round((d.dau / d.mau) * 1000) / 10 : 0,
  }));

  const topColumns = [
    {
      key: 'name',
      label: 'Organisation',
      render: (v) => (
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
            {String(v ?? '?').charAt(0).toUpperCase()}
          </span>
          <span className={cx('truncate font-medium', TEXT_TITLE)}>{v}</span>
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      nowrap: true,
      render: (v) => (
        <Badge variant={PLAN_TONE[v] ?? 'neutral'}>
          {v ? v.charAt(0).toUpperCase() + v.slice(1) : '—'}
        </Badge>
      ),
    },
    { key: 'mrr', label: 'MRR', numeric: true, nowrap: true, render: (v) => fmtXOF(v) },
    {
      key: 'health_score',
      label: 'Score santé',
      align: 'center',
      nowrap: true,
      render: (v) => <Badge variant={scoreTone(v)}>{v}/100</Badge>,
    },
    {
      key: 'months_active',
      label: 'Ancienneté',
      numeric: true,
      nowrap: true,
      render: (v) => `${v ?? 0} mois`,
    },
  ];

  return (
    <SuperAdminLayout title="Métriques SaaS">
      <Head title="SaaS Dashboard — SuperAdmin IBIG Soft" />

      <PageHeader
        icon={BarChart3}
        title="Métriques SaaS"
        subtitle="Revenus récurrents, engagement et risque de départ sur l'ensemble du parc."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'Métriques SaaS' }]}
        actions={
          <Button
            variant="secondary"
            iconRight={ArrowRight}
            onClick={() => router.visit('/superadmin/saas/mrr')}
          >
            Analyse MRR complète
          </Button>
        }
      />

      <div className="space-y-6">

        {/* ── Revenus ───────────────────────────────────────────────────────── */}
        <section>
          <h2 className={cx('mb-3 text-xs font-semibold uppercase tracking-wider', TEXT_MUTED)}>Revenus</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={CircleDollarSign} tone="success" label="MRR"
              value={fmtCompact(kpis.mrr ?? 0)}
              delta={kpis.mrr_growth} deltaGood="up"
            />
            <StatCard
              icon={BarChart3} tone="accent" label="ARR"
              value={fmtCompact(kpis.arr ?? 0)}
              hint="Revenu annuel récurrent"
            />
            <StatCard
              icon={TrendingUp} tone={(kpis.mrr_growth ?? 0) >= 0 ? 'success' : 'danger'}
              label="Croissance MRR"
              value={`${(kpis.mrr_growth ?? 0) > 0 ? '+' : ''}${kpis.mrr_growth ?? 0}`}
              unit="%"
              hint="vs mois précédent"
            />
            <StatCard
              icon={LogOut}
              tone={(kpis.churn_rate ?? 0) < 2 ? 'success' : (kpis.churn_rate ?? 0) < 5 ? 'warning' : 'danger'}
              label="Taux de churn"
              value={`${kpis.churn_rate ?? 0}`}
              unit="%"
              hint="Désabonnement mensuel"
            />
          </div>
        </section>

        {/* ── Engagement ────────────────────────────────────────────────────── */}
        <section>
          <h2 className={cx('mb-3 text-xs font-semibold uppercase tracking-wider', TEXT_MUTED)}>Engagement</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ShieldCheck} tone="accent" label="Organisations actives"
                      value={(kpis.active_orgs ?? 0).toLocaleString('fr-FR')} hint="Licences en cours" />
            <StatCard icon={Users} tone="info" label="MAU"
                      value={(kpis.mau ?? 0).toLocaleString('fr-FR')} hint="Actifs sur 30 jours" />
            <StatCard icon={Activity} tone="info" label="DAU"
                      value={(kpis.dau ?? 0).toLocaleString('fr-FR')} hint="Actifs aujourd'hui" />
            <StatCard
              icon={Gauge}
              tone={(kpis.dau_mau_ratio ?? 0) >= 20 ? 'success' : 'warning'}
              label="Ratio DAU / MAU"
              value={`${kpis.dau_mau_ratio ?? 0}`}
              unit="%"
              hint="Indice d'engagement"
            />
          </div>
        </section>

        {/* ── Graphiques ────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">

          <Card title="Évolution du MRR — 12 mois" subtitle="Revenu mensuel récurrent en XOF">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="saasMrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#9333EA" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#9333EA" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} {...axisProps} width={45} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: AXIS_COLOR, strokeOpacity: 0.3 }} />
                <Area type="monotone" dataKey="mrr" name="MRR" stroke="#9333EA"
                      fill="url(#saasMrrGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Nouvelles organisations vs perdues" subtitle="Acquisition et attrition mensuelles">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: AXIS_COLOR, fillOpacity: 0.12 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: AXIS_COLOR }} />
                <Bar dataKey="new_orgs"     name="Nouvelles" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="churned_orgs" name="Perdues"   fill="#EF4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Ratio DAU / MAU" subtitle="Récurrence d'usage — au-delà de 20 %, l'engagement est sain">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ratioTrend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis tickFormatter={v => `${v}%`} domain={[0, 50]} {...axisProps} width={38} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: AXIS_COLOR, strokeOpacity: 0.3 }} />
                <Line type="monotone" dataKey="ratio" name="DAU/MAU" stroke="#0EA5E9"
                      strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card
            title="Organisations à risque de départ"
            subtitle="Score de santé le plus bas du parc"
            padded={false}
            footer={
              churn.length > 0 ? (
                <Button
                  variant="ghost" size="sm" iconRight={ArrowRight}
                  onClick={() => router.visit('/superadmin/saas/health')}
                >
                  Voir tous les risques
                </Button>
              ) : null
            }
          >
            <div className="px-4 py-4 sm:px-6">
              {churn.length === 0 ? (
                <EmptyState
                  compact
                  icon={ShieldCheck}
                  title="Aucune organisation à risque élevé"
                  description="Tous les scores de santé sont au-dessus du seuil d'alerte."
                />
              ) : (
                <ul className="space-y-2">
                  {churn.map((org, i) => (
                    <li
                      key={org.organization_id ?? org.organization_name ?? i}
                      className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10"
                    >
                      <span className={cx(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-sm font-semibold text-red-700',
                        'dark:bg-red-500/20 dark:text-red-300', NUM,
                      )}>
                        {org.health_score}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{org.organization_name}</p>
                        <p className="mt-0.5 truncate text-xs text-red-700 dark:text-red-300">{org.churn_reason}</p>
                      </div>
                      <Button
                        variant="ghost" size="xs" iconRight={ArrowRight}
                        onClick={() => router.visit('/superadmin/saas/health')}
                      >
                        Voir
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </section>

        {/* ── Top clients ───────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={cx('text-base font-semibold', TEXT_TITLE)}>Top clients par MRR</h2>
            <span className={cx('text-xs', TEXT_BODY)}>
              Classement établi sur le revenu récurrent mensuel.
            </span>
          </div>

          <DataTable
            columns={topColumns}
            data={topOrgs}
            rowKey="name"
            pageSize={20}
            exportable
            filename="top-clients-mrr"
            emptyMessage="Aucun client facturé pour le moment."
          />
        </section>

      </div>
    </SuperAdminLayout>
  );
}

export { SaasDashboard };
