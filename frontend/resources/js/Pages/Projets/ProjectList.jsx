/**
 * Projets/ProjectList.jsx — Portefeuille de projets
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique inchangée : mêmes props Inertia (`projects`), mêmes filtres locaux,
 * mêmes URL de navigation (`/projets/{id}`, `/projets/{id}/gantt`).
 */

import React, { useState, useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import {
  FolderKanban, Plus, Search, LayoutGrid, List, GanttChartSquare,
} from 'lucide-react';
import { formatAmount } from '@/hooks/useCurrency';
import {
  PageHeader, Button, Badge, StatCard, DataTable, EmptyState,
  cx, SURFACE, BORDER, CONTROL,
  TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const fmt = (n, cur = 'XOF') => formatAmount(Number(n ?? 0), cur, 'fr');

// ── Santé du projet — tons sémantiques ───────────────────────────────────────

const HEALTH_CONFIG = {
  on_track:  { label: 'En bonne voie', tone: 'success', dot: 'bg-emerald-500' },
  at_risk:   { label: 'À risque',      tone: 'warning', dot: 'bg-amber-500' },
  off_track: { label: 'Hors piste',    tone: 'danger',  dot: 'bg-red-500' },
};

const healthOf = (health) => HEALTH_CONFIG[health] ?? HEALTH_CONFIG.on_track;

function HealthDot({ health }) {
  const cfg = healthOf(health);
  return <span className={cx('inline-block h-2 w-2 shrink-0 rounded-full', cfg.dot)} title={cfg.label} />;
}

function HealthBadge({ health }) {
  const cfg = healthOf(health);
  return <Badge variant={cfg.tone} dot>{cfg.label}</Badge>;
}

// ── Barre de progression fine et sobre ───────────────────────────────────────

function ProgressBar({ value = 0, tone = 'accent', className = '' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const fill = {
    accent:  'bg-purple-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger:  'bg-red-500',
  }[tone] ?? 'bg-purple-500';

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx('h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]', className)}
    >
      <div className={cx('h-full rounded-full transition-all', fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Mini Gantt (4 semaines) ───────────────────────────────────────────────────

function MiniGantt({ project }) {
  const W = 160, H = 16;
  const today = new Date();
  const start = project.start_date ? new Date(project.start_date) : new Date(today.getFullYear(), today.getMonth(), 1);
  const end   = project.end_date   ? new Date(project.end_date)   : new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Fenêtre : 4 semaines depuis aujourd'hui
  const windowStart = new Date(today);
  const windowEnd   = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + 28);

  const toX = (d) => ((d - windowStart) / (windowEnd - windowStart)) * W;

  const barStart = Math.max(0, toX(start));
  const barEnd   = Math.min(W, toX(end));
  const barW     = Math.max(4, barEnd - barStart);
  const todayX   = Math.max(0, Math.min(W, toX(today)));

  const barClass = project.health === 'off_track'
    ? 'fill-red-400 dark:fill-red-500'
    : project.health === 'at_risk'
      ? 'fill-amber-400 dark:fill-amber-500'
      : 'fill-sky-400 dark:fill-sky-500';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[160px]" role="img"
         aria-label="Aperçu du planning sur quatre semaines">
      {/* Piste */}
      <rect x={0} y={4} width={W} height={8} rx={4} className="fill-gray-100 dark:fill-white/[0.08]" />
      {/* Barre projet */}
      {barStart < W && barEnd > 0 && (
        <rect x={barStart} y={4} width={barW} height={8} rx={4} className={barClass} opacity={0.45} />
      )}
      {/* Progression */}
      {barStart < W && (
        <rect x={barStart} y={4} width={barW * ((project.completion_percent || 0) / 100)} height={8} rx={4}
              className={barClass} />
      )}
      {/* Aujourd'hui */}
      <line x1={todayX} y1={0} x2={todayX} y2={H} strokeWidth={1.5} strokeDasharray="3 2"
            className="stroke-purple-500" />
    </svg>
  );
}

// ── Budget ────────────────────────────────────────────────────────────────────

function BudgetBar({ spent, planned, currency }) {
  if (!planned || planned === 0) {
    return <p className={cx('text-xs', TEXT_FAINT)}>Pas de budget défini</p>;
  }
  const pct  = Math.min(100, (spent / planned) * 100);
  const raw  = (spent / planned) * 100;
  const tone = raw > 100 ? 'danger' : raw > 85 ? 'warning' : 'success';

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className={cx('text-xs font-medium', TEXT_BODY, NUM)}>{fmt(spent, currency)}</span>
        <span className={cx('text-xs', TEXT_MUTED, NUM)}>{Math.round(raw)} %</span>
      </div>
      <ProgressBar value={pct} tone={tone} />
      <p className={cx('text-xs', TEXT_FAINT, NUM)}>sur {fmt(planned, currency)}</p>
    </div>
  );
}

// ── Carte projet ──────────────────────────────────────────────────────────────

function ProjectCard({ project }) {
  return (
    <article className={cx('flex flex-col rounded-xl border p-5 shadow-sm transition-colors',
      SURFACE, BORDER, 'hover:border-purple-200 dark:hover:border-purple-500/40')}>

      {/* Titre + santé */}
      <header className="mb-3 flex items-start justify-between gap-3">
        <Link
          href={`/projets/${project.id}`}
          className={cx('min-w-0 flex-1 truncate rounded text-base font-semibold tracking-tight transition-colors',
            TEXT_TITLE, 'hover:text-purple-600 dark:hover:text-purple-400', FOCUS_RING)}
        >
          {project.name}
        </Link>
        <HealthBadge health={project.health} />
      </header>

      {/* Contexte */}
      <dl className={cx('mb-4 space-y-1 text-xs', TEXT_MUTED)}>
        {project.client && (
          <div className="flex gap-1.5">
            <dt>Client :</dt>
            <dd className={cx('truncate font-medium', TEXT_BODY)}>{project.client.name}</dd>
          </div>
        )}
        {project.manager && (
          <div className="flex gap-1.5">
            <dt>Manager :</dt>
            <dd className={cx('truncate font-medium', TEXT_BODY)}>{project.manager.name}</dd>
          </div>
        )}
        <div className={NUM}>{fmtDate(project.start_date)} → {fmtDate(project.end_date)}</div>
      </dl>

      {/* Progression tâches */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className={cx('text-xs', TEXT_MUTED)}>Tâches</span>
          <span className={cx('text-xs font-medium', TEXT_BODY, NUM)}>
            {project.completed_tasks_count || 0} / {project.tasks_count || 0}
            <span className={cx('ml-1.5', TEXT_FAINT)}>({project.completion_percent || 0} %)</span>
          </span>
        </div>
        <ProgressBar value={project.completion_percent} />
      </div>

      {/* Budget */}
      <div className="mb-4">
        <BudgetBar
          spent={project.budget_spent} planned={project.budget_planned}
          currency={project.budget_currency || 'XOF'}
        />
      </div>

      {/* Mini Gantt */}
      <div className="mb-4">
        <p className={cx('mb-1.5 text-[11px] font-semibold uppercase tracking-wider', TEXT_MUTED)}>
          4 prochaines semaines
        </p>
        <MiniGantt project={project} />
      </div>

      {/* Liens */}
      <div className={cx('mt-auto flex gap-2 border-t pt-3', BORDER)}>
        <Button as={Link} href={`/projets/${project.id}`} variant="secondary" size="sm" className="flex-1">
          Tableau de bord
        </Button>
        <Button as={Link} href={`/projets/${project.id}/gantt`} variant="subtle" size="sm"
                icon={GanttChartSquare} className="flex-1">
          Gantt
        </Button>
      </div>
    </article>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ProjectList() {
  const { projects } = usePage().props;

  const [viewMode, setViewMode]         = useState('cards'); // 'cards' | 'list'
  const [search, setSearch]             = useState('');
  const [filterHealth, setFilterHealth] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = useMemo(() => {
    return (projects || []).filter((p) => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.manager?.name?.toLowerCase().includes(search.toLowerCase());
      const matchHealth = filterHealth === 'all' || p.health === filterHealth;
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchSearch && matchHealth && matchStatus;
    });
  }, [projects, search, filterHealth, filterStatus]);

  const counts = useMemo(() => ({
    on_track:  (projects || []).filter((p) => p.health === 'on_track').length,
    at_risk:   (projects || []).filter((p) => p.health === 'at_risk').length,
    off_track: (projects || []).filter((p) => p.health === 'off_track').length,
  }), [projects]);

  const total      = (projects || []).length;
  const isFiltered = Boolean(search) || filterHealth !== 'all' || filterStatus !== 'all';

  const resetFilters = () => { setSearch(''); setFilterHealth('all'); setFilterStatus('all'); };

  /* ─── Colonnes de la vue liste ───────────────────────────────────────────── */

  const columns = [
    {
      key: 'name',
      label: 'Projet',
      render: (v, p) => (
        <div className="flex min-w-0 items-center gap-2">
          <HealthDot health={p.health} />
          <Link
            href={`/projets/${p.id}`}
            className={cx('truncate rounded font-medium transition-colors',
              TEXT_TITLE, 'hover:text-purple-600 dark:hover:text-purple-400', FOCUS_RING)}
          >
            {v}
          </Link>
        </div>
      ),
    },
    { key: 'client',  label: 'Client',  render: (_v, p) => p.client?.name  || <span className={TEXT_FAINT}>—</span> },
    { key: 'manager', label: 'Manager', render: (_v, p) => p.manager?.name || <span className={TEXT_FAINT}>—</span> },
    {
      key: 'completion_percent',
      label: 'Progression',
      width: '160px',
      render: (v) => (
        <div className="flex items-center gap-2">
          <ProgressBar value={v || 0} className="max-w-24" />
          <span className={cx('w-10 shrink-0 text-right text-xs', TEXT_MUTED, NUM)}>{v || 0} %</span>
        </div>
      ),
    },
    {
      key: 'end_date',
      label: 'Échéance',
      nowrap: true,
      className: NUM,
      render: (v) => fmtDate(v),
    },
    {
      key: 'health',
      label: 'Santé',
      nowrap: true,
      render: (v) => <HealthBadge health={v} />,
    },
  ];

  const emptyState = isFiltered ? (
    <EmptyState
      variant="no-results"
      title="Aucun projet ne correspond"
      description="Aucun projet ne satisfait ces critères. Élargissez la recherche ou réinitialisez les filtres."
      action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
    />
  ) : (
    <EmptyState
      icon={FolderKanban}
      title="Aucun projet pour le moment"
      description="Créez votre premier projet pour suivre son avancement, son budget et sa charge de travail."
      hints={[
        'Chaque projet dispose d’un Gantt et d’une feuille de temps.',
        'La santé (bonne voie / à risque / hors piste) est recalculée automatiquement.',
      ]}
      action={
        <Button as={Link} href="/projets/creer" variant="primary" icon={Plus}>
          Nouveau projet
        </Button>
      }
    />
  );

  return (
    <AppLayout>
      <Head title="Gestion de projets" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={FolderKanban}
          title="Projets"
          breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Projets' }]}
          subtitle={`${total} projet${total !== 1 ? 's' : ''} au total`}
          actions={
            <Button as={Link} href="/projets/creer" variant="primary" icon={Plus}>
              Nouveau projet
            </Button>
          }
        />

        {/* Résumé santé — tuiles cliquables servant de filtre rapide */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { key: 'on_track',  label: 'En bonne voie', tone: 'success' },
            { key: 'at_risk',   label: 'À risque',      tone: 'warning' },
            { key: 'off_track', label: 'Hors piste',    tone: 'danger'  },
          ].map((item) => (
            <StatCard
              key={item.key}
              label={item.label}
              value={counts[item.key]}
              tone={item.tone}
              active={filterHealth === item.key}
              onClick={() => setFilterHealth(filterHealth === item.key ? 'all' : item.key)}
              hint={filterHealth === item.key ? 'Filtre actif' : undefined}
            />
          ))}
        </div>

        {/* Filtres */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un projet, un client, un manager…"
              className={cx(CONTROL, 'h-10 pl-9')}
            />
          </div>

          <label className="sr-only" htmlFor="project-status">Filtrer par statut</label>
          <select
            id="project-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={cx(CONTROL, 'h-10 w-auto min-w-[170px]')}
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="paused">En pause</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
          </select>

          {isFiltered && (
            <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
          )}

          {/* Bascule de vue */}
          <div className={cx('ml-auto flex overflow-hidden rounded-lg border', BORDER)}>
            {[
              { key: 'cards', icon: LayoutGrid, label: 'Vue cartes' },
              { key: 'list',  icon: List,       label: 'Vue liste' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setViewMode(key)}
                title={label}
                aria-label={label}
                aria-pressed={viewMode === key}
                className={cx(
                  'inline-flex h-10 w-10 items-center justify-center transition-colors',
                  viewMode === key
                    ? 'bg-purple-600 text-white'
                    : cx(SURFACE, TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                  FOCUS_RING,
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        {viewMode === 'cards' ? (
          filtered.length === 0 ? (
            <div className={cx('rounded-xl border border-dashed', BORDER)}>{emptyState}</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
          )
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            rowKey="id"
            pageSize={15}
            empty={emptyState}
            actions={(p) => (
              <>
                <Button as={Link} href={`/projets/${p.id}`} variant="ghost" size="sm">
                  Détail
                </Button>
                <Button as={Link} href={`/projets/${p.id}/gantt`} variant="ghost" size="sm"
                        iconOnly icon={GanttChartSquare} title="Diagramme de Gantt" />
              </>
            )}
          />
        )}
      </div>
    </AppLayout>
  );
}
export { ProjectList };
