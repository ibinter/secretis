/**
 * Projets/ProjectDashboard.jsx — Tableau de bord d'un projet
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique inchangée : mêmes props Inertia (`project`, `dashboard`), mêmes URL
 * de navigation (`/projets/{id}/gantt`, `/projets/{id}/feuille-de-temps`).
 */

import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import {
  FolderKanban, GanttChartSquare, Timer, Banknote, ListChecks,
  ShieldAlert, CheckCircle2, XCircle, Clock, AlertTriangle, Target,
} from 'lucide-react';
import { formatAmount } from '@/hooks/useCurrency';
import {
  PageHeader, Button, Badge, Card, StatCard, EmptyState,
  cx, SURFACE_SUNK, BORDER, DIVIDE,
  TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, TH, NUM,
} from '@/Components/UI';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n, currency = 'XOF') => formatAmount(Number(n ?? 0), currency, 'fr');

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Santé du projet ──────────────────────────────────────────────────────────

const HEALTH_CONFIG = {
  on_track:  { label: 'En bonne voie', tone: 'success' },
  at_risk:   { label: 'À risque',      tone: 'warning' },
  off_track: { label: 'Hors piste',    tone: 'danger'  },
};

const healthOf = (h) => HEALTH_CONFIG[h] ?? HEALTH_CONFIG.on_track;

function HealthBadge({ health }) {
  const cfg = healthOf(health);
  return <Badge variant={cfg.tone} size="md" dot>{cfg.label}</Badge>;
}

// ── Barre de progression fine ────────────────────────────────────────────────

const BAR_TONES = {
  accent:  'bg-purple-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  neutral: 'bg-gray-400',
};

function ProgressBar({ value, max = 100, tone = 'accent', className = '' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
      className={cx('h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]', className)}
    >
      <div className={cx('h-full rounded-full transition-all', BAR_TONES[tone] ?? BAR_TONES.accent)}
           style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Courbe d'avancement (S-curve) ────────────────────────────────────────────

function SCurve({ data }) {
  const pts = (data ?? []).filter((p) => p.planned !== null);
  if (pts.length < 2) {
    return (
      <p className={cx('py-10 text-center text-sm', TEXT_FAINT)}>
        Pas encore assez de points pour tracer la courbe.
      </p>
    );
  }

  const W = 100, H = 100;

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
    <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" preserveAspectRatio="none" role="img"
         aria-label="Courbe d'avancement planifié contre réel">
      <path d={plannedPath} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
            className="stroke-sky-500" strokeDasharray="4 3" />
      {actualPath && (
        <path d={actualPath} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
              className="stroke-emerald-500" />
      )}
    </svg>
  );
}

// ── Jalon ────────────────────────────────────────────────────────────────────

const MILESTONE_STATUS = {
  completed:   { label: 'Atteint',   tone: 'success', icon: CheckCircle2 },
  missed:      { label: 'Manqué',    tone: 'danger',  icon: XCircle },
  in_progress: { label: 'En cours',  tone: 'info',    icon: Clock },
  pending:     { label: 'À venir',   tone: 'neutral', icon: Target },
};

function MilestoneItem({ milestone }) {
  const cfg  = MILESTONE_STATUS[milestone.status] ?? MILESTONE_STATUS.pending;
  const Icon = cfg.icon;

  return (
    <li className="flex items-start gap-3 py-3">
      <Icon
        className={cx('mt-0.5 h-4 w-4 shrink-0', {
          success: 'text-emerald-600 dark:text-emerald-400',
          danger:  'text-red-600 dark:text-red-400',
          info:    'text-sky-600 dark:text-sky-400',
          neutral: TEXT_FAINT,
        }[cfg.tone])}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{milestone.name}</p>
        <p className={cx('text-xs', TEXT_MUTED, NUM)}>{fmtDate(milestone.due_date)}</p>
        <ProgressBar value={milestone.completion_percent} tone={cfg.tone === 'neutral' ? 'accent' : cfg.tone} className="mt-1.5" />
      </div>
      <span className={cx('shrink-0 text-sm font-medium', TEXT_BODY, NUM)}>
        {milestone.completion_percent} %
      </span>
    </li>
  );
}

// ── Ligne de risque ──────────────────────────────────────────────────────────

const RISK_LEVEL = { low: 'success', medium: 'warning', high: 'danger' };
const RISK_LABEL_F = { low: 'Faible', medium: 'Moyenne', high: 'Élevée' };
const RISK_LABEL_M = { low: 'Faible', medium: 'Moyen',   high: 'Élevé'  };

function RiskRow({ risk }) {
  const score    = { low: 1, medium: 2, high: 3 };
  const severity = (score[risk.probability] ?? 0) * (score[risk.impact] ?? 0);
  const severityClass = severity >= 6
    ? 'text-red-600 dark:text-red-400 font-semibold'
    : severity >= 3
      ? 'text-amber-600 dark:text-amber-400 font-medium'
      : 'text-emerald-600 dark:text-emerald-400';

  return (
    <tr className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]">
      <td className={cx('px-3 py-2.5 text-sm', TEXT_BODY)}>{risk.title}</td>
      <td className="px-3 py-2.5">
        <Badge variant={RISK_LEVEL[risk.probability] ?? 'neutral'}>
          {RISK_LABEL_F[risk.probability] ?? '—'}
        </Badge>
      </td>
      <td className="px-3 py-2.5">
        <Badge variant={RISK_LEVEL[risk.impact] ?? 'neutral'}>
          {RISK_LABEL_M[risk.impact] ?? '—'}
        </Badge>
      </td>
      <td className={cx('px-3 py-2.5 text-right text-sm whitespace-nowrap', NUM, severityClass)}>
        {severity}/9
      </td>
      <td className={cx('px-3 py-2.5 text-sm', TEXT_MUTED)}>{risk.owner?.name || '—'}</td>
    </tr>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ProjectDashboard() {
  const { project, dashboard } = usePage().props;
  const d = dashboard;

  const milestones    = d.milestones ?? [];
  const riskItems     = d.risks?.items ?? [];
  const scheduleRisks = d.schedule_risks ?? [];
  const members       = d.members?.list ?? [];

  const daysRemaining = d.project.days_remaining;
  const late          = daysRemaining !== null && daysRemaining !== undefined && daysRemaining < 0;

  const budgetPct  = d.budget.percent;
  const budgetTone = budgetPct > 100 ? 'danger' : budgetPct > 85 ? 'warning' : 'success';

  return (
    <AppLayout>
      <Head title={`Tableau de bord — ${project.name}`} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={FolderKanban}
          title={project.name}
          breadcrumbs={[
            { label: 'Projets', href: '/projets' },
            { label: project.name },
          ]}
          subtitle={
            <span className={NUM}>
              {fmtDate(d.project.start_date)} → {fmtDate(d.project.end_date)}
            </span>
          }
          meta={
            <>
              <HealthBadge health={d.project.health} />
              {project.client && (
                <span className={cx('text-sm', TEXT_MUTED)}>
                  Client : <span className={cx('font-medium', TEXT_BODY)}>{project.client.name}</span>
                </span>
              )}
              {daysRemaining !== null && daysRemaining !== undefined && (
                <Badge variant={late ? 'danger' : 'success'} className={NUM}>
                  {late ? `${Math.abs(daysRemaining)} j de retard` : `${daysRemaining} j restants`}
                </Badge>
              )}
            </>
          }
          actions={
            <>
              <Button as={Link} href={`/projets/${project.id}/gantt`} variant="primary" icon={GanttChartSquare}>
                Gantt
              </Button>
              <Button as={Link} href={`/projets/${project.id}/feuille-de-temps`} variant="secondary" icon={Timer}>
                Feuille de temps
              </Button>
            </>
          }
        />

        <div className="space-y-6">

          {/* Progression globale */}
          <Card>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className={cx('text-sm', TEXT_MUTED)}>Progression globale</span>
              <span className={cx('text-sm font-semibold', TEXT_TITLE, NUM)}>
                {d.project.completion_percent} %
              </span>
            </div>
            <ProgressBar value={d.project.completion_percent} tone={healthOf(d.project.health).tone} />
          </Card>

          {/* Indicateurs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Budget consommé"
              value={`${budgetPct} %`}
              icon={Banknote}
              tone={budgetTone}
              hint={`${fmt(d.budget.spent, d.budget.currency)} / ${fmt(d.budget.planned, d.budget.currency)}`}
            />
            <StatCard
              label="Tâches terminées"
              value={`${d.tasks.completed}/${d.tasks.total}`}
              icon={ListChecks}
              tone="info"
              hint={`${d.tasks.in_progress} en cours · ${d.tasks.overdue} en retard`}
            />
            <StatCard
              label="Heures saisies"
              value={d.total_hours_logged}
              unit="h"
              icon={Timer}
              tone="neutral"
              hint={`${d.members.active} membre${d.members.active > 1 ? 's' : ''} actif${d.members.active > 1 ? 's' : ''} (7 j)`}
            />
            <StatCard
              label="Risques ouverts"
              value={d.risks.open}
              icon={ShieldAlert}
              tone={d.risks.high > 0 ? 'danger' : d.risks.open > 0 ? 'warning' : 'success'}
              hint={`${d.risks.high} à impact élevé`}
            />
          </div>

          {/* Courbe + jalons */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card
              title="Courbe d'avancement"
              actions={
                <div className="flex items-center gap-4">
                  <span className={cx('inline-flex items-center gap-1.5 text-xs', TEXT_MUTED)}>
                    <span className="inline-block h-0.5 w-4 bg-sky-500" /> Planifié
                  </span>
                  <span className={cx('inline-flex items-center gap-1.5 text-xs', TEXT_MUTED)}>
                    <span className="inline-block h-0.5 w-4 bg-emerald-500" /> Réel
                  </span>
                </div>
              }
            >
              <SCurve data={d.scurve} />
            </Card>

            <Card padded={false} title="Jalons" subtitle={`${milestones.length} jalon${milestones.length > 1 ? 's' : ''}`}>
              {milestones.length === 0 ? (
                <EmptyState
                  compact
                  icon={Target}
                  title="Aucun jalon défini"
                  description="Les jalons rythment le projet et alimentent le diagramme de Gantt."
                />
              ) : (
                <ul className={cx('max-h-64 overflow-y-auto divide-y px-4 sm:px-6', DIVIDE)}>
                  {milestones.map((m) => <MilestoneItem key={m.id} milestone={m} />)}
                </ul>
              )}
            </Card>
          </div>

          {/* Risques + alertes planning */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            <Card padded={false} title="Risques ouverts" subtitle={`${d.risks.open} risque${d.risks.open > 1 ? 's' : ''}`}>
              {riskItems.length === 0 ? (
                <EmptyState
                  compact
                  icon={ShieldAlert}
                  title="Aucun risque ouvert"
                  description="Aucun risque n'est actuellement déclaré sur ce projet."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className={cx(SURFACE_SUNK, 'border-b', BORDER)}>
                      <tr>
                        <th scope="col" className={cx('px-3 py-2.5 text-left', TH)}>Risque</th>
                        <th scope="col" className={cx('px-3 py-2.5 text-left', TH)}>Probabilité</th>
                        <th scope="col" className={cx('px-3 py-2.5 text-left', TH)}>Impact</th>
                        <th scope="col" className={cx('px-3 py-2.5 text-right', TH)}>Score</th>
                        <th scope="col" className={cx('px-3 py-2.5 text-left', TH)}>Responsable</th>
                      </tr>
                    </thead>
                    <tbody className={cx('divide-y', DIVIDE)}>
                      {riskItems.slice(0, 5).map((r) => <RiskRow key={r.id} risk={r} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card padded={false} title="Alertes planning"
                  subtitle={`${scheduleRisks.length} alerte${scheduleRisks.length > 1 ? 's' : ''}`}>
              {scheduleRisks.length === 0 ? (
                <EmptyState
                  compact
                  icon={CheckCircle2}
                  title="Planning nominal"
                  description="Aucune tâche en retard ni à risque sur ce projet."
                />
              ) : (
                <ul className={cx('max-h-64 space-y-2 overflow-y-auto p-4 sm:p-6')}>
                  {scheduleRisks.map((r) => {
                    const overdue = r.risk_type === 'overdue';
                    return (
                      <li
                        key={r.task_id}
                        className={cx(
                          'flex items-start gap-2 rounded-lg border px-3 py-2.5',
                          overdue
                            ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
                            : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
                        )}
                      >
                        <AlertTriangle
                          className={cx('mt-0.5 h-4 w-4 shrink-0',
                            overdue ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{r.task_name}</p>
                          <p className={cx('text-xs', TEXT_MUTED)}>
                            <span className={NUM}>
                              {overdue
                                ? `En retard de ${r.days_overdue} jour(s)`
                                : `À risque — ${r.progress} % terminé`}
                            </span>
                            {(r.assignees ?? []).length > 0 && ` · ${r.assignees.join(', ')}`}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Équipe */}
          <Card
            title="Équipe"
            subtitle={`${d.members.total} membre${d.members.total > 1 ? 's' : ''} · ${d.members.active} actif${d.members.active > 1 ? 's' : ''}`}
          >
            {members.length === 0 ? (
              <EmptyState
                compact
                icon={FolderKanban}
                title="Aucun membre affecté"
                description="Affectez des collaborateurs au projet pour suivre leur charge et leurs saisies de temps."
              />
            ) : (
              <ul className="flex flex-wrap gap-3">
                {members.map((m) => (
                  <li key={m.id} className={cx('flex items-center gap-2.5 rounded-lg border px-3 py-2', BORDER, SURFACE_SUNK)}>
                    {m.avatar ? (
                      <img src={m.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{m.name}</p>
                      <p className={cx('truncate text-xs capitalize', TEXT_MUTED)}>{m.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
export { ProjectDashboard };
