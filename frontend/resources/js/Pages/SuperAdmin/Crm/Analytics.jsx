/**
 * SuperAdmin/Crm/Analytics.jsx — Vue commerciale consolidée
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : même appel réseau
 * (`GET /superadmin/crm/analytics?start&end`), même état `period`,
 * mêmes données de repli.
 *
 * Les graphiques restent des SVG natifs ; leurs axes et grilles utilisent
 * désormais des gris neutres lisibles en thème sombre comme en thème clair.
 */

import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { BarChart3, Loader2 } from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Card, StatCard, DataTable,
  cx, CONTROL, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const fmtXOF = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—';

/* Gris neutre : lisible sur fond clair comme sur fond sombre. */
const NEUTRAL = '#94A3B8';

const PALETTE = ['#9333EA', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316', '#64748B'];

const SOURCE_LABELS = {
  web: 'Web', referral: 'Référence', partner: 'Partenaire',
  event: 'Événement', cold: 'Prospection froide', social: 'Réseaux sociaux', inbound: 'Inbound',
};

/* ─── Courbe (SVG natif) ───────────────────────────────────────────────────── */

function AreaChart({ data, xKey, yKey, color = '#9333EA' }) {
  if (!data?.length) {
    return <p className={cx('py-8 text-center text-sm', TEXT_MUTED)}>Aucune donnée</p>;
  }
  const max = Math.max(...data.map(d => d[yKey] || 0), 1);
  const W = 600, H = 150, PL = 40, PR = 10, PT = 16, PB = 30;
  const iW = W - PL - PR, iH = H - PT - PB;
  const stepX = iW / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => ({
    x: PL + i * stepX,
    y: PT + iH - ((d[yKey] || 0) / max) * iH,
    v: d[yKey],
    l: d[xKey],
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${PT + iH} L ${pts[0].x} ${PT + iH} Z`;
  const gId = `crmAreaGrad_${yKey}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 300 }} role="img" aria-label="Évolution">
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {[0, 0.5, 1].map(t => (
        <line
          key={t}
          x1={PL} y1={PT + iH * t} x2={W - PR} y2={PT + iH * t}
          stroke={NEUTRAL} strokeOpacity="0.25" strokeWidth="1"
        />
      ))}

      <path d={areaD} fill={`url(#${gId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="9" fill={NEUTRAL} fontWeight="600">{p.v}</text>
          {(i === 0 || i === data.length - 1 || i % 2 === 0) && (
            <text x={p.x} y={H - 5} textAnchor="middle" fontSize="9" fill={NEUTRAL}>{p.l}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ─── Barres groupées (SVG natif) ──────────────────────────────────────────── */

function GroupedBarChart({ data, xKey, series }) {
  if (!data?.length) {
    return <p className={cx('py-8 text-center text-sm', TEXT_MUTED)}>Aucune donnée</p>;
  }
  const maxVal = Math.max(...data.flatMap(d => series.map(s => d[s.key] || 0)), 1);
  const W = 600, H = 170, PL = 30, PR = 10, PT = 16, PB = 38;
  const iW = W - PL - PR, iH = H - PT - PB;
  const groupW = iW / data.length;
  const barW = (groupW - 8) / series.length - 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 300 }} role="img" aria-label="Comparaison mensuelle">
      {[0, 0.5, 1].map(t => (
        <line
          key={t}
          x1={PL} y1={PT + iH * t} x2={W - PR} y2={PT + iH * t}
          stroke={NEUTRAL} strokeOpacity="0.25" strokeWidth="1"
        />
      ))}

      {data.map((d, gi) => (
        <g key={gi}>
          {series.map((s, si) => {
            const val = d[s.key] || 0;
            const bH  = (val / maxVal) * iH;
            const x   = PL + gi * groupW + 4 + si * (barW + 2);
            const y   = PT + iH - bH;
            return (
              <g key={si}>
                <rect x={x} y={y} width={barW} height={bH} fill={s.color} rx="3" />
                {val > 0 && (
                  <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="9" fill={s.color} fontWeight="700">
                    {val}
                  </text>
                )}
              </g>
            );
          })}
          <text x={PL + gi * groupW + groupW / 2} y={PT + iH + 14} textAnchor="middle" fontSize="9" fill={NEUTRAL}>
            {d[xKey]}
          </text>
        </g>
      ))}

      {series.map((s, i) => (
        <g key={i} transform={`translate(${PL + i * 80}, ${H - 8})`}>
          <rect width="8" height="8" fill={s.color} rx="2" />
          <text x="12" y="8" fontSize="9" fill={NEUTRAL}>{s.label}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Camembert (SVG natif) ────────────────────────────────────────────────── */

function PieChart({ data, labelKey, valueKey, labelMap }) {
  if (!data?.length) {
    return <p className={cx('py-8 text-center text-sm', TEXT_MUTED)}>Aucune donnée</p>;
  }
  const total = data.reduce((s, d) => s + (d[valueKey] || 0), 0);
  const CX = 80, CY = 80, R = 70;
  let angle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const val  = d[valueKey] || 0;
    const frac = total > 0 ? val / total : 0;
    const a0   = angle;
    const a1   = angle + frac * 2 * Math.PI;
    angle = a1;
    const x0 = CX + R * Math.cos(a0), y0 = CY + R * Math.sin(a0);
    const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
    const large = frac > 0.5 ? 1 : 0;
    return {
      d: `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`,
      color: PALETTE[i % PALETTE.length],
      label: labelMap?.[d[labelKey]] ?? d[labelKey],
      val,
      pct: Math.round(frac * 100),
    };
  });

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0" role="img" aria-label="Répartition par source">
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="currentColor" strokeWidth="2" className="text-white dark:text-[#162032]" />
        ))}
      </svg>
      <ul className="min-w-[180px] flex-1 space-y-1.5">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className={cx('font-medium', TEXT_BODY)}>{s.label}</span>
            </span>
            <span className={cx('font-semibold', TEXT_MUTED, NUM)}>{s.pct} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Entonnoir ────────────────────────────────────────────────────────────── */

function FunnelChart({ data }) {
  if (!data?.length) return null;
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="space-y-2">
      {data.map((stage, i) => (
        <div key={stage.stage ?? i} className="flex items-center gap-3">
          <span className={cx('w-32 shrink-0 truncate text-right text-xs', TEXT_MUTED)}>{stage.stage}</span>
          <div className="relative h-7 flex-1">
            <div
              className="h-7 rounded transition-all"
              style={{
                width: `${Math.max((stage.count / maxCount) * 100, 6)}%`,
                backgroundColor: PALETTE[i % PALETTE.length],
              }}
            />
            <span className={cx('absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-white', NUM)}>
              {stage.count}
            </span>
          </div>
          <span className={cx('w-12 text-right text-xs', TEXT_FAINT, NUM)}>
            {i > 0 ? `${stage.conversion} %` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Données de repli (conservées) ────────────────────────────────────────── */

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
    { id: 1, title: 'ERP Banque CI', contact: { company_name: 'Banque Nationale CI' }, stage: { name: 'Négociation', color: '#F59E0B' }, value: 2_400_000, probability: 70, close_date_expected: '2026-08-15' },
    { id: 2, title: 'Système GRH', contact: { company_name: 'Ministère de la Santé' }, stage: { name: 'Démo planifiée', color: '#0EA5E9' }, value: 1_800_000, probability: 40, close_date_expected: '2026-09-01' },
    { id: 3, title: 'SECRETIS Enterprise', contact: { company_name: 'ONG Green Africa' }, stage: { name: 'Proposition', color: '#9333EA' }, value: 1_200_000, probability: 55, close_date_expected: '2026-08-30' },
  ],
};

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function CrmAnalytics() {
  const [data, setData]       = useState(null);
  const [period, setPeriod]   = useState(6);
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

  useEffect(() => { fetchData(); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = data ?? MOCK;

  const dealColumns = [
    {
      key: 'contact',
      label: 'Société',
      render: (_v, deal) => (
        <span className={cx('font-medium', TEXT_TITLE)}>{deal.contact?.company_name ?? '—'}</span>
      ),
      noExport: true,
    },
    { key: 'title', label: 'Opportunité' },
    {
      key: 'stage',
      label: 'Étape',
      nowrap: true,
      render: (_v, deal) => (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${deal.stage?.color || '#64748B'}22`,
            color: deal.stage?.color || '#64748B',
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: deal.stage?.color || '#64748B' }} />
          {deal.stage?.name ?? '—'}
        </span>
      ),
      noExport: true,
    },
    { key: 'value', label: 'Valeur', numeric: true, nowrap: true, render: (v) => fmtXOF(v) },
    {
      key: 'probability',
      label: 'Probabilité',
      align: 'right',
      nowrap: true,
      render: (v) => (
        <span className="inline-flex items-center justify-end gap-2">
          <span className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-white/10">
            <span
              className="block h-1.5 rounded-full bg-purple-600"
              style={{ width: `${Math.min(100, Math.max(0, v || 0))}%` }}
            />
          </span>
          <span className={cx('text-xs', TEXT_BODY, NUM)}>{v ?? 0} %</span>
        </span>
      ),
    },
    {
      key: 'close_date_expected',
      label: 'Clôture prévue',
      align: 'right',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED, NUM),
      render: (v) => fmtDate(v),
    },
  ];

  return (
    <SuperAdminLayout title="Analytiques CRM">
      <Head title="Analytiques CRM — SuperAdmin IBIG Soft" />

      <PageHeader
        icon={BarChart3}
        title="Analytiques CRM"
        subtitle="Vue commerciale consolidée : pipeline, conversion et origine des leads."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'CRM' }, { label: 'Analytiques' }]}
        actions={
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-purple-600 dark:text-purple-400" />}
            <select
              value={period}
              onChange={e => setPeriod(Number(e.target.value))}
              aria-label="Période d'analyse"
              className={cx(CONTROL, 'h-10 w-auto min-w-[130px]')}
            >
              <option value={3}>3 mois</option>
              <option value={6}>6 mois</option>
              <option value={12}>12 mois</option>
            </select>
          </div>
        }
      />

      <div className="space-y-6">

        {/* ── Indicateurs ─────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard tone="accent"  label="Pipeline total"  value={fmtXOF(d.total_pipeline)} />
          <StatCard tone="success" label="MRR actuel"      value={fmtXOF(d.mrr_current)} delta={15} deltaGood="up" />
          <StatCard tone="info"    label="MRR prévu (+3 m)" value={fmtXOF(d.mrr_forecast)} />
          <StatCard tone="success" label="Opportunités gagnées" value={d.deals_won ?? 0} />
          <StatCard tone="danger"  label="Opportunités perdues" value={d.deals_lost ?? 0} />
          <StatCard tone="neutral" label="Délai moyen" value={d.avg_conversion_days ?? 0} unit="j" hint="Lead → client" />
        </section>

        {/* ── Graphiques ──────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card title="Nouveaux leads par semaine" subtitle="8 dernières semaines">
            <AreaChart data={d.new_leads_by_week} xKey="week" yKey="count" color="#9333EA" />
          </Card>

          <Card title="Opportunités gagnées et perdues" subtitle="6 derniers mois">
            <GroupedBarChart
              data={d.deals_by_month}
              xKey="month"
              series={[
                { key: 'won',  label: 'Gagnées', color: '#10B981' },
                { key: 'lost', label: 'Perdues', color: '#EF4444' },
              ]}
            />
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card title="Entonnoir de conversion" subtitle="Taux de passage entre chaque étape">
            <FunnelChart data={d.conversion_rates} />
          </Card>

          <Card title="Origine des leads" subtitle="Répartition par canal d'acquisition">
            <PieChart data={d.top_sources} labelKey="source" valueKey="count" labelMap={SOURCE_LABELS} />
          </Card>
        </section>

        {/* ── Top opportunités ────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className={cx('text-base font-semibold', TEXT_TITLE)}>Principales opportunités en cours</h2>
          <DataTable
            columns={dealColumns}
            data={d.top_deals ?? []}
            rowKey="id"
            pageSize={10}
            emptyMessage="Aucune opportunité en cours."
          />
        </section>

      </div>
    </SuperAdminLayout>
  );
}

export { CrmAnalytics };
