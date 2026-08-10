/**
 * SuperAdmin/CohortAnalysis.jsx — Rétention des organisations par cohorte
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : même prop Inertia `cohorts`, même état local
 * `selectedCell`, même destination `router.visit` pour le détail.
 */

import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, X, ArrowRight } from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Card,
  cx, SURFACE, SURFACE_SUNK, BORDER, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TH, NUM, FOCUS_RING,
} from '@/Components/UI';

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */
const MOCK_COHORTS = [
  { cohort: 'Jan 26', initial: 5, periods: { 'M+0': 100, 'M+1': 80, 'M+3': 80, 'M+6': 60, 'M+12': null } },
  { cohort: 'Fév 26', initial: 4, periods: { 'M+0': 100, 'M+1': 75, 'M+3': 50, 'M+6': null, 'M+12': null } },
  { cohort: 'Mar 26', initial: 6, periods: { 'M+0': 100, 'M+1': 83.3, 'M+3': null, 'M+6': null, 'M+12': null } },
  { cohort: 'Avr 26', initial: 3, periods: { 'M+0': 100, 'M+1': 100, 'M+3': null, 'M+6': null, 'M+12': null } },
  { cohort: 'Mai 26', initial: 5, periods: { 'M+0': 100, 'M+1': null, 'M+3': null, 'M+6': null, 'M+12': null } },
  { cohort: 'Jul 25', initial: 8, periods: { 'M+0': 100, 'M+1': 87.5, 'M+3': 75, 'M+6': 62.5, 'M+12': 50 } },
  { cohort: 'Aoû 25', initial: 6, periods: { 'M+0': 100, 'M+1': 83.3, 'M+3': 66.7, 'M+6': 50, 'M+12': 33.3 } },
  { cohort: 'Sep 25', initial: 7, periods: { 'M+0': 100, 'M+1': 85.7, 'M+3': 71.4, 'M+6': 57.1, 'M+12': null } },
  { cohort: 'Oct 25', initial: 5, periods: { 'M+0': 100, 'M+1': 80, 'M+3': 60, 'M+6': 60, 'M+12': null } },
  { cohort: 'Nov 25', initial: 4, periods: { 'M+0': 100, 'M+1': 75, 'M+3': 75, 'M+6': null, 'M+12': null } },
  { cohort: 'Déc 25', initial: 3, periods: { 'M+0': 100, 'M+1': 100, 'M+3': 66.7, 'M+6': null, 'M+12': null } },
];

const PERIODS = ['M+0', 'M+1', 'M+3', 'M+6', 'M+12'];

/* Axes et grilles neutres : lisibles en thème clair comme en thème sombre. */
const AXIS_COLOR = '#94A3B8';
const axisProps = {
  tick: { fontSize: 10, fill: AXIS_COLOR },
  tickLine: { stroke: AXIS_COLOR },
  axisLine: { stroke: AXIS_COLOR, strokeOpacity: 0.35 },
};

/* Échelle de rétention — même sémantique en clair et en sombre. */
const SCALE = [
  { min: 80, label: '≥ 80 %',  cls: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30' },
  { min: 60, label: '60–79 %', cls: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/20 dark:text-sky-200 dark:border-sky-500/30' },
  { min: 40, label: '40–59 %', cls: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30' },
  { min: 0,  label: '< 40 %',  cls: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30' },
];

const NA_CLS = 'bg-gray-50 text-gray-300 border-gray-100 dark:bg-white/[0.03] dark:text-gray-600 dark:border-[#1E3048]';

function retentionClass(pct) {
  if (pct === null || pct === undefined) return NA_CLS;
  return (SCALE.find(s => pct >= s.min) ?? SCALE[SCALE.length - 1]).cls;
}

const average = (cohorts, period) => {
  const vals = cohorts.map(c => c.periods?.[period]).filter(v => v !== null && v !== undefined);
  return vals.length ? `${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)} %` : 'N/A';
};

/* ─── Courbes de rétention ─────────────────────────────────────────────────── */

const CURVE_COLORS = ['#9333EA', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];

function RetentionCurves({ cohorts }) {
  const complete  = cohorts.filter(c => c.periods?.['M+3'] !== null && c.periods?.['M+3'] !== undefined);
  const displayed = complete.slice(-5);

  const chartData = PERIODS.map(p => {
    const row = { period: p };
    displayed.forEach(c => { row[c.cohort] = c.periods?.[p] ?? null; });
    return row;
  });

  return (
    <Card
      title="Courbes de rétention par cohorte"
      subtitle="Part d'organisations encore actives à chaque période (5 dernières cohortes)"
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.2} vertical={false} />
          <XAxis dataKey="period" {...axisProps} tick={{ fontSize: 11, fill: AXIS_COLOR }} />
          <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} {...axisProps} width={38} />
          <Tooltip
            formatter={v => (v !== null && v !== undefined ? `${v} %` : 'N/A')}
            contentStyle={{
              background: 'rgba(22,32,50,0.96)', border: '1px solid #1E3048',
              borderRadius: 8, fontSize: 12, color: '#fff',
            }}
            labelStyle={{ color: '#94A3B8' }}
            cursor={{ stroke: AXIS_COLOR, strokeOpacity: 0.3 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: AXIS_COLOR }} />
          {displayed.map((c, i) => (
            <Line
              key={c.cohort}
              type="monotone"
              dataKey={c.cohort}
              stroke={CURVE_COLORS[i % CURVE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function CohortAnalysis({ cohorts: propCohorts }) {
  const cohorts = propCohorts ?? MOCK_COHORTS;
  const [selectedCell, setSelectedCell] = useState(null);

  const sorted = [...cohorts].reverse();

  return (
    <SuperAdminLayout title="Analyse de cohortes">
      <Head title="Analyse de cohortes — SuperAdmin IBIG Soft" />

      <PageHeader
        icon={Users}
        title="Analyse de cohortes"
        subtitle="Chaque ligne correspond à un mois de souscription, chaque colonne au taux d'organisations encore actives."
        breadcrumbs={[
          { label: 'Console', href: '/superadmin' },
          { label: 'Métriques SaaS', href: '/superadmin/saas/dashboard' },
          { label: 'Cohortes' },
        ]}
        meta={
          <div className={cx('flex flex-wrap items-center gap-3 text-xs', TEXT_BODY)}>
            {SCALE.map(s => (
              <span key={s.label} className="inline-flex items-center gap-1.5">
                <span className={cx('inline-block h-3.5 w-3.5 rounded border', s.cls)} />
                {s.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className={cx('inline-block h-3.5 w-3.5 rounded border', NA_CLS)} />
              N/A
            </span>
          </div>
        }
      />

      <div className="space-y-6">

        {/* ── Matrice de rétention ──────────────────────────────────────────── */}
        <div className={cx(SURFACE, 'border', BORDER, 'overflow-hidden rounded-xl shadow-sm')}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full border-collapse text-sm">
              <caption className={cx('px-4 py-2 text-left text-xs', TEXT_MUTED)}>
                Taux de rétention par cohorte et par période
              </caption>
              <thead className={cx(SURFACE_SUNK)}>
                <tr className={cx('border-b', BORDER)}>
                  <th scope="col" className={cx('px-4 py-3 text-left', TH)} style={{ width: '140px' }}>Cohorte</th>
                  <th scope="col" className={cx('px-4 py-3 text-right', TH)} style={{ width: '90px' }}>Initial</th>
                  {PERIODS.map(p => (
                    <th key={p} scope="col" className={cx('px-3 py-3 text-center', TH)} style={{ minWidth: '84px' }}>
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1E3048]">
                {sorted.map((row) => (
                  <tr key={row.cohort} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                    <td className={cx('px-4 py-3 font-medium', TEXT_TITLE)}>{row.cohort}</td>
                    <td className={cx('px-4 py-3 text-right', TEXT_BODY, NUM)}>{row.initial}</td>
                    {PERIODS.map(p => {
                      const pct = row.periods?.[p];
                      const has = pct !== null && pct !== undefined;
                      const isSelected = selectedCell?.cohort === row.cohort && selectedCell?.period === p;
                      return (
                        <td key={p} className="px-1.5 py-1.5">
                          <button
                            type="button"
                            disabled={!has}
                            onClick={() => has && setSelectedCell(
                              isSelected ? null : { cohort: row.cohort, period: p, pct, initial: row.initial },
                            )}
                            className={cx(
                              'w-full rounded-lg border px-1 py-2 text-xs font-semibold transition-all',
                              NUM, retentionClass(pct),
                              has ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
                              isSelected && 'ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-[#162032]',
                              FOCUS_RING,
                            )}
                          >
                            {has ? `${pct} %` : '—'}
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

        {/* ── Détail de la cellule sélectionnée ─────────────────────────────── */}
        {selectedCell && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 dark:border-purple-500/30 dark:bg-purple-500/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200">
                  Cohorte {selectedCell.cohort} — {selectedCell.period}
                </h3>
                <p className="mt-1 text-sm text-purple-800 dark:text-purple-300">
                  <span className={cx('font-semibold', NUM)}>
                    {Math.round(selectedCell.initial * selectedCell.pct / 100)}
                  </span>{' '}
                  organisations actives sur{' '}
                  <span className={cx('font-semibold', NUM)}>{selectedCell.initial}</span> initiales
                  {' '}({selectedCell.pct} % de rétention).
                </p>
              </div>
              <Button
                variant="ghost" size="sm" iconOnly icon={X}
                title="Fermer le détail"
                onClick={() => setSelectedCell(null)}
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              iconRight={ArrowRight}
              onClick={() => router.visit(`/superadmin/organisations?cohort=${selectedCell.cohort}&period=${selectedCell.period}`)}
            >
              Voir les organisations
            </Button>
          </div>
        )}

        {/* ── Courbes ───────────────────────────────────────────────────────── */}
        <RetentionCurves cohorts={cohorts} />

        {/* ── Moyennes ──────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: 'Rétention M+1 (moyenne)',  period: 'M+1',  desc: 'Après 1 mois de souscription' },
            { label: 'Rétention M+6 (moyenne)',  period: 'M+6',  desc: 'Après 6 mois de souscription' },
            { label: 'Rétention M+12 (moyenne)', period: 'M+12', desc: 'Fidélisation à un an' },
          ].map(m => (
            <div key={m.period} className={cx(SURFACE, 'border', BORDER, 'rounded-xl p-5 text-center shadow-sm')}>
              <p className={cx('mb-1 text-xs font-medium uppercase tracking-wide', TEXT_MUTED)}>{m.label}</p>
              <p className={cx('text-3xl font-semibold tracking-tight', TEXT_TITLE, NUM)}>
                {average(cohorts, m.period)}
              </p>
              <p className={cx('mt-1 text-xs', TEXT_MUTED)}>{m.desc}</p>
            </div>
          ))}
        </section>

      </div>
    </SuperAdminLayout>
  );
}

export { CohortAnalysis };
