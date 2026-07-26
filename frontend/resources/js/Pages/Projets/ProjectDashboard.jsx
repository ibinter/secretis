import React, { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Badge Santé ──────────────────────────────────────────────────────────────

function HealthBadge({ health }) {
  const map = {
    on_track:  { label: 'En bonne voie',  bg: 'bg-green-100 dark:bg-green-900/40',  text: 'text-green-700 dark:text-green-300',  dot: 'bg-green-500' },
    at_risk:   { label: 'À risque',        bg: 'bg-amber-100 dark:bg-amber-900/40',  text: 'text-amber-700 dark:text-amber-300',  dot: 'bg-amber-500' },
    off_track: { label: 'Hors piste',      bg: 'bg-red-100 dark:bg-red-900/40',     text: 'text-red-700 dark:text-red-300',     dot: 'bg-red-500'   },
  };
  const s = map[health] || map.on_track;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${s.bg} ${s.text}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot} animate-pulse`} />
      {s.label}
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ title, value, subtitle, icon, color = 'blue' }) {
  const colors = {
    blue:   'from-purple-500 to-purple-600',
    green:  'from-green-500 to-green-600',
    amber:  'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
    red:    'from-red-500 to-red-600',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white text-xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max = 100, color = '#3B82F6', className = '' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden ${className}`}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

// ── S-Curve (AreaChart SVG) ───────────────────────────────────────────────────

function SCurve({ data }) {
  if (!data || data.length === 0) return null;

  const W = 100, H = 100;
  const pts = data.filter((p) => p.planned !== null);
  if (pts.length < 2) return null;

  const toPath = (key) => {
    const validPts = pts.filter((p) => p[key] !== null && p[key] !== undefined);
    if (validPts.length === 0) return '';
    return validPts.map((p, i) => {
      const x = (i / (pts.length - 1)) * W;
      const y = H - p[key];
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const plannedPath = toPath('planned');
  const actualPath  = toPath('actual');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36" preserveAspectRatio="none">
      <defs>
        <linearGradient id="plannedGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Aire planifiée */}
      <path d={`${plannedPath} L ${W} ${H} L 0 ${H} Z`} fill="url(#plannedGrad)" />
      <path d={plannedPath} fill="none" stroke="#3B82F6" strokeWidth="1.5" />
      {/* Aire réelle */}
      {actualPath && (
        <>
          <path d={`${actualPath} L ${W} ${H} L 0 ${H} Z`} fill="url(#actualGrad)" />
          <path d={actualPath} fill="none" stroke="#22C55E" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}

// ── Milestone Item ────────────────────────────────────────────────────────────

function MilestoneItem({ milestone }) {
  const statusIcons = {
    completed:   '✅',
    missed:      '❌',
    in_progress: '🔄',
    pending:     '⏳',
  };
  const statusColors = {
    completed:   'text-green-600',
    missed:      'text-red-600',
    in_progress: 'text-purple-600',
    pending:     'text-gray-500',
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-xl">{statusIcons[milestone.status] || '⏳'}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${statusColors[milestone.status]}`}>{milestone.name}</p>
        <p className="text-xs text-gray-400">{fmtDate(milestone.due_date)}</p>
        <ProgressBar value={milestone.completion_percent} className="mt-1" color={milestone.color} />
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0">
        {milestone.completion_percent}%
      </span>
    </div>
  );
}

// ── Risk Row ─────────────────────────────────────────────────────────────────

function RiskRow({ risk }) {
  const levelColors = {
    low:    'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    high:   'bg-red-100 text-red-700',
  };
  const score = { low: 1, medium: 2, high: 3 };
  const severity = score[risk.probability] * score[risk.impact];
  const severityColor = severity >= 6 ? 'text-red-600 font-bold' : severity >= 3 ? 'text-amber-600 font-semibold' : 'text-green-600';

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="py-2 px-3 text-sm text-gray-800 dark:text-gray-200">{risk.title}</td>
      <td className="py-2 px-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${levelColors[risk.probability]}`}>
          {risk.probability === 'high' ? 'Élevée' : risk.probability === 'medium' ? 'Moyenne' : 'Faible'}
        </span>
      </td>
      <td className="py-2 px-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${levelColors[risk.impact]}`}>
          {risk.impact === 'high' ? 'Élevé' : risk.impact === 'medium' ? 'Moyen' : 'Faible'}
        </span>
      </td>
      <td className={`py-2 px-3 text-sm ${severityColor}`}>{severity}/9</td>
      <td className="py-2 px-3 text-sm text-gray-500">{risk.owner?.name || '—'}</td>
    </tr>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ProjectDashboard() {
  const { project, dashboard } = usePage().props;
  const d = dashboard;

  return (
    <AppLayout>
      <Head title={`Dashboard — ${project.name}`} />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                <HealthBadge health={d.project.health} />
              </div>
              {project.client && (
                <p className="text-sm text-gray-500">Client : <span className="font-medium">{project.client.name}</span></p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {fmtDate(d.project.start_date)} → {fmtDate(d.project.end_date)}
                {d.project.days_remaining !== null && (
                  <span className={`ml-2 font-medium ${d.project.days_remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    ({d.project.days_remaining < 0 ? `${Math.abs(d.project.days_remaining)}j de retard` : `${d.project.days_remaining}j restants`})
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/projets/${project.id}/gantt`}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm hover:bg-purple-700 transition-colors">
                📊 Gantt
              </Link>
              <Link href={`/projets/${project.id}/feuille-de-temps`}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                ⏱ Temps
              </Link>
            </div>
          </div>

          {/* Barre progression globale */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Progression globale</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{d.project.completion_percent}%</span>
            </div>
            <ProgressBar value={d.project.completion_percent} color={
              d.project.health === 'on_track' ? '#22C55E' :
              d.project.health === 'at_risk'  ? '#F59E0B' : '#EF4444'
            } />
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Budget consommé"
            value={`${d.budget.percent}%`}
            subtitle={`${fmt(d.budget.spent, d.budget.currency)} / ${fmt(d.budget.planned, d.budget.currency)}`}
            icon="💰" color={d.budget.percent > 100 ? 'red' : d.budget.percent > 85 ? 'amber' : 'green'}
          />
          <KpiCard
            title="Tâches terminées"
            value={`${d.tasks.completed}/${d.tasks.total}`}
            subtitle={`${d.tasks.in_progress} en cours · ${d.tasks.overdue} en retard`}
            icon="✅" color="blue"
          />
          <KpiCard
            title="Heures saisies"
            value={`${d.total_hours_logged}h`}
            subtitle={`${d.members.active} membres actifs (7j)`}
            icon="⏱" color="purple"
          />
          <KpiCard
            title="Risques ouverts"
            value={d.risks.open}
            subtitle={`${d.risks.high} à impact élevé`}
            icon="⚠️" color={d.risks.high > 0 ? 'red' : d.risks.open > 0 ? 'amber' : 'green'}
          />
        </div>

        {/* ── S-Curve + Milestones ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* S-Curve */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Courbe d'avancement</h2>
            <div className="flex gap-4 text-xs mb-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-purple-500 inline-block" /> Planifié
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-green-500 inline-block" /> Réel
              </span>
            </div>
            <SCurve data={d.scurve} />
          </div>

          {/* Milestones */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">
              Milestones ({d.milestones.length})
            </h2>
            <div className="max-h-64 overflow-y-auto">
              {d.milestones.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Aucun milestone défini</p>
              )}
              {d.milestones.map((m) => <MilestoneItem key={m.id} milestone={m} />)}
            </div>
          </div>
        </div>

        {/* ── Risques + Alertes planning ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table risques */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">
              Risques ouverts ({d.risks.open})
            </h2>
            {d.risks.items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucun risque ouvert 🎉</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400">
                      <th className="pb-2 px-3">Risque</th>
                      <th className="pb-2 px-3">Prob.</th>
                      <th className="pb-2 px-3">Impact</th>
                      <th className="pb-2 px-3">Score</th>
                      <th className="pb-2 px-3">Resp.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.risks.items.slice(0, 5).map((r) => <RiskRow key={r.id} risk={r} />)}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Alertes planning */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">
              Alertes planning ({d.schedule_risks.length})
            </h2>
            {d.schedule_risks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Planning nominal ✅</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {d.schedule_risks.map((r) => (
                  <div key={r.task_id}
                    className={`flex items-start gap-2 p-3 rounded-xl text-sm
                      ${r.risk_type === 'overdue' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}`}>
                    <span className="text-base">{r.risk_type === 'overdue' ? '🔴' : '🟡'}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{r.task_name}</p>
                      <p className="text-xs text-gray-500">
                        {r.risk_type === 'overdue'
                          ? `En retard de ${r.days_overdue} jour(s)`
                          : `À risque — ${r.progress}% terminé`}
                        {r.assignees.length > 0 && ` · ${r.assignees.join(', ')}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Équipe ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">
            Équipe ({d.members.total} membres · {d.members.active} actifs)
          </h2>
          <div className="flex flex-wrap gap-3">
            {d.members.list.map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm">
                {m.avatar ? (
                  <img src={m.avatar} alt={m.name} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{m.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
export { ProjectDashboard };
