/**
 * SuperAdmin/MrrAnalysis.jsx — Analyse détaillée du revenu récurrent
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes props Inertia (`breakdown`, `forecasts`,
 * `mrr_history`, `top_orgs`), même état local `scenario`.
 *
 * Corrections d'affichage : import `ReferenceLine` inutilisé supprimé,
 * axes et grilles neutres pour rester lisibles en thème sombre.
 */

import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { CircleDollarSign } from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Badge, Card, DataTable,
  cx, SURFACE, BORDER, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */
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

/* ─── Formatage ────────────────────────────────────────────────────────────── */

const fmtXOF = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v ?? 0);

const fmtM = (v) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M`
    : v >= 1000 ? `${(v / 1000).toFixed(0)}K`
    : String(v ?? 0);

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
    <div className={cx(SURFACE, 'border', BORDER, 'min-w-[160px] rounded-lg px-3 py-2 text-xs shadow-lg')}>
      <p className={cx('mb-1 font-semibold', TEXT_TITLE)}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="mb-0.5 flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
          <span className={TEXT_MUTED}>
            {p.name} : <span className={cx('font-semibold', TEXT_TITLE, NUM)}>{fmtM(p.value)} XOF</span>
          </span>
        </div>
      ))}
    </div>
  );
}

const PLAN_COLORS = { starter: '#64748B', pro: '#0EA5E9', enterprise: '#9333EA', on_premise: '#F59E0B' };
const PLAN_LABELS = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise', on_premise: 'On-Premise' };
const PLAN_TONE   = { enterprise: 'accent', pro: 'info', starter: 'neutral', on_premise: 'warning' };

const SCENARIOS = [
  { key: 'bear', label: 'Pessimiste', stroke: '#EF4444' },
  { key: 'base', label: 'Réaliste',   stroke: '#0EA5E9' },
  { key: 'bull', label: 'Optimiste',  stroke: '#10B981' },
];

const scoreTone = (s) => (s >= 70 ? 'success' : s >= 50 ? 'warning' : 'danger');

/* ─── Waterfall MRR ────────────────────────────────────────────────────────── */

function WaterfallMrr({ breakdown }) {
  const start = (breakdown.mrr ?? 0) - (breakdown.net_new_mrr ?? 0);
  const items = [
    { name: 'MRR début',   value: start,                         color: '#64748B' },
    { name: '+ New',       value: breakdown.new_mrr ?? 0,        color: '#10B981' },
    { name: '+ Expansion', value: breakdown.expansion_mrr ?? 0,  color: '#0EA5E9' },
    { name: '− Churn',     value: -(breakdown.churned_mrr ?? 0), color: '#EF4444' },
    { name: 'MRR fin',     value: breakdown.mrr ?? 0,            color: '#9333EA' },
  ];
  const maxVal = breakdown.mrr || 1;

  return (
    <Card title="Décomposition du MRR — ce mois" subtitle="Mouvement du revenu récurrent sur la période">
      <div className="flex h-48 items-end gap-3 px-2">
        {items.map((item) => {
          const barH = Math.max(8, Math.round((Math.abs(item.value) / maxVal) * 160));
          return (
            <div key={item.name} className="flex flex-1 flex-col items-center gap-1">
              <span className={cx('text-xs font-semibold', TEXT_TITLE, NUM)}>{fmtM(Math.abs(item.value))}</span>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{ height: barH, background: item.color }}
              />
              <span className={cx('text-center text-[10px] leading-tight', TEXT_MUTED)}>{item.name}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ─── Tuile chiffre ────────────────────────────────────────────────────────── */

function MetricTile({ label, value, tone = 'neutral' }) {
  const toneText = {
    neutral: TEXT_TITLE,
    success: 'text-emerald-700 dark:text-emerald-300',
    danger:  'text-red-700 dark:text-red-300',
    accent:  'text-purple-700 dark:text-purple-300',
    info:    'text-sky-700 dark:text-sky-300',
  }[tone] ?? TEXT_TITLE;

  return (
    <div className={cx(SURFACE, 'border', BORDER, 'rounded-xl p-4 text-center shadow-sm')}>
      <p className={cx('mb-1 text-xs font-medium uppercase tracking-wide', TEXT_MUTED)}>{label}</p>
      <p className={cx('text-lg font-semibold tracking-tight', toneText, NUM)}>{value}</p>
    </div>
  );
}

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function MrrAnalysis({
  breakdown: propBd,
  forecasts: propFc,
  mrr_history: propHist,
  top_orgs: propTop,
}) {
  const breakdown = propBd   ?? MOCK_BREAKDOWN;
  const forecasts = propFc   ?? MOCK_FORECASTS;
  const history   = propHist ?? MOCK_HISTORY;
  const topOrgs   = propTop  ?? MOCK_TOP_ORGS;

  const [scenario, setScenario] = useState('base');

  const forecastData  = forecasts[scenario] ?? [];
  const scenarioMeta  = SCENARIOS.find(s => s.key === scenario) ?? SCENARIOS[1];

  const planData = Object.entries(breakdown.by_plan ?? {}).map(([plan, mrr]) => ({
    plan:  PLAN_LABELS[plan] ?? plan,
    mrr,
    color: PLAN_COLORS[plan] ?? '#64748B',
  }));

  const topColumns = [
    {
      key: '__rank',
      label: '#',
      width: '56px',
      numeric: true,
      render: (_v, _row, i) => <span className={TEXT_FAINT}>{i + 1}</span>,
      noExport: true,
    },
    {
      key: 'name',
      label: 'Organisation',
      render: (v) => (
        <div className="flex min-w-0 items-center gap-3">
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
    { key: 'months_active', label: 'Ancienneté', numeric: true, nowrap: true, render: (v) => `${v ?? 0} mois` },
  ];

  return (
    <SuperAdminLayout title="Analyse MRR">
      <Head title="Analyse MRR — SuperAdmin IBIG Soft" />

      <PageHeader
        icon={CircleDollarSign}
        title="Analyse MRR"
        subtitle="Décomposition, historique et prévisions du revenu récurrent mensuel."
        breadcrumbs={[
          { label: 'Console', href: '/superadmin' },
          { label: 'Métriques SaaS', href: '/superadmin/saas/dashboard' },
          { label: 'Analyse MRR' },
        ]}
      />

      <div className="space-y-6">

        {/* ── Chiffres clés ─────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricTile label="MRR"           value={`${fmtM(breakdown.mrr)} XOF`} tone="accent" />
          <MetricTile label="ARR"           value={`${fmtM(breakdown.arr)} XOF`} tone="accent" />
          <MetricTile label="New MRR"       value={`+${fmtM(breakdown.new_mrr)} XOF`} tone="success" />
          <MetricTile label="Expansion MRR" value={`+${fmtM(breakdown.expansion_mrr)} XOF`} tone="info" />
          <MetricTile label="Churned MRR"   value={`−${fmtM(breakdown.churned_mrr)} XOF`} tone="danger" />
          <MetricTile
            label="Net New MRR"
            value={`${(breakdown.net_new_mrr ?? 0) >= 0 ? '+' : '−'}${fmtM(Math.abs(breakdown.net_new_mrr ?? 0))} XOF`}
            tone={(breakdown.net_new_mrr ?? 0) >= 0 ? 'success' : 'danger'}
          />
        </section>

        {/* ── Waterfall + répartition par plan ──────────────────────────────── */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <WaterfallMrr breakdown={breakdown} />

          <Card title="MRR par plan" subtitle="Répartition du revenu par niveau d'abonnement">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={planData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.2} horizontal={false} />
                <XAxis type="number" tickFormatter={fmtM} {...axisProps} />
                <YAxis type="category" dataKey="plan" {...axisProps} tick={{ fontSize: 11, fill: AXIS_COLOR }} width={86} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: AXIS_COLOR, fillOpacity: 0.12 }} />
                <Bar dataKey="mrr" name="MRR" radius={[0, 4, 4, 0]}>
                  {planData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* ── Historique ────────────────────────────────────────────────────── */}
        <Card title="Évolution du MRR" subtitle="Décomposition New + Expansion − Churn">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={history} margin={{ top: 5, right: 5, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis tickFormatter={fmtM} {...axisProps} width={50} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: AXIS_COLOR, fillOpacity: 0.12 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: AXIS_COLOR }} />
              <Bar dataKey="new_mrr"       name="New MRR"       fill="#10B981" radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="expansion_mrr" name="Expansion MRR" fill="#0EA5E9" radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="churned_mrr"   name="Churned MRR"   fill="#EF4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* ── Prévisions ────────────────────────────────────────────────────── */}
        <Card
          title="Prévisions MRR — 6 mois"
          subtitle="Extrapolation du taux de croissance des 6 derniers mois"
          actions={
            <div
              role="tablist"
              aria-label="Scénario de prévision"
              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/[0.06]"
            >
              {SCENARIOS.map(s => (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={scenario === s.key}
                  onClick={() => setScenario(s.key)}
                  className={cx(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    scenario === s.key
                      ? cx(SURFACE, 'shadow-sm', TEXT_TITLE)
                      : cx(TEXT_MUTED, 'hover:text-gray-700 dark:hover:text-gray-200'),
                    FOCUS_RING,
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={forecastData} margin={{ top: 5, right: 5, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis tickFormatter={fmtM} {...axisProps} width={55} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: AXIS_COLOR, strokeOpacity: 0.3 }} />
              <Line
                type="monotone"
                dataKey="mrr"
                name="MRR prévu"
                stroke={scenarioMeta.stroke}
                strokeWidth={2.5}
                strokeDasharray="6 3"
                dot={{ r: 4, fill: scenarioMeta.stroke, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* ── Top clients ───────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div>
            <h2 className={cx('text-base font-semibold', TEXT_TITLE)}>Top clients par MRR</h2>
            <p className={cx('mt-0.5 text-sm', TEXT_MUTED)}>
              Organisations générant le plus de revenus récurrents.
            </p>
          </div>

          <DataTable
            columns={topColumns}
            data={topOrgs}
            rowKey="name"
            pageSize={20}
            searchable
            exportable
            filename="top-clients-mrr"
            emptyMessage="Aucune organisation facturée sur la période."
          />
        </section>

      </div>
    </SuperAdminLayout>
  );
}

export { MrrAnalysis };
