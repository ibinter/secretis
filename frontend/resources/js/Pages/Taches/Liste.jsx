/**
 * Taches/Liste.jsx — Vue liste des tâches SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`
 * (PageHeader / StatCard / DataTable / Badge / Button / EmptyState).
 *
 * Fonctionnalités préservées à l'identique :
 *   - Recherche (debounced), filtre « en retard », filtres avancés
 *   - Tri par colonne, sélection multiple + suppression groupée
 *   - Changement de statut inline, pagination, modal création/édition, bascule Kanban
 *
 * Props Inertia :
 *   - tasks   : LengthAwarePaginator (data = formatTask())
 *   - stats   : { total, todo, in_progress, review, done, overdue }
 *   - filters : { status, priority, assignee, project_id, due_from, due_to, search, overdue }
 */

import { useState, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AppLayout from '@/Layouts/AppLayout';
import {
  Search, Filter, PlusCircle, MoreHorizontal,
  AlertTriangle, CheckCircle2, Trash2, LayoutGrid, List,
  ListChecks, RefreshCw, Circle, CalendarDays,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import TaskModal from '@/Components/Taches/TaskModal';
import debounce from 'lodash/debounce';
import {
  PageHeader, Button, Badge, StatCard, DataTable, EmptyState,
  cx, CONTROL, BORDER, SURFACE, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', tone: 'danger',  bar: 'bg-red-500'    },
  high:   { label: 'Haute',   tone: 'warning', bar: 'bg-amber-500'  },
  medium: { label: 'Moyenne', tone: 'info',    bar: 'bg-sky-500'    },
  normal: { label: 'Moyenne', tone: 'info',    bar: 'bg-sky-500'    }, // alias hérité
  low:    { label: 'Basse',   tone: 'neutral', bar: 'bg-gray-300 dark:bg-gray-600' },
};

const STATUS_CONFIG = {
  todo:        { label: 'À faire',     tone: 'neutral' },
  in_progress: { label: 'En cours',    tone: 'accent'  },
  review:      { label: 'En révision', tone: 'info'    },
  done:        { label: 'Terminé',     tone: 'success' },
  cancelled:   { label: 'Annulé',      tone: 'danger'  },
};

// Échéance intelligente : Retard / Aujourd'hui / Demain / date
function dueMeta(task) {
  if (!task.due_date) return null;
  if (task.is_overdue) {
    return { label: `Retard ${task.days_overdue ?? ''}j`.trim(), tone: 'danger' };
  }
  const d = new Date(task.due_date + 'T00:00:00');
  const days = Math.ceil((d - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days <= 0) return { label: "Aujourd'hui", tone: 'danger' };
  if (days === 1) return { label: 'Demain', tone: 'warn' };
  if (days <= 3) return { label: `Dans ${days}j`, tone: 'warn' };
  return { label: format(d, 'd MMM yyyy', { locale: fr }), tone: 'muted' };
}

const DUE_TONE = {
  danger: 'text-red-600 dark:text-red-400',
  warn:   'text-amber-600 dark:text-amber-400',
  muted:  'text-gray-500 dark:text-gray-400',
};

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function TachesListe({ tasks, stats = {}, filters }) {
  const { auth } = usePage().props;
  const [selected, setSelected]       = useState(new Set());
  const [taskModal, setTaskModal]     = useState({ open: false, task: null });
  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort]               = useState({ key: null, dir: 'asc' });
  const [bulkAction, setBulkAction]   = useState('');

  // Sélection
  const toggleSelect = (id, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked) => {
    if (checked) setSelected(new Set(tasks.data.map((t) => t.id)));
    else         setSelected(new Set());
  };

  const allSelected = tasks.data?.length > 0 && selected.size === tasks.data.length;

  // Tri
  const handleSort = (key, dir) => {
    setSort({ key, dir });
    router.get(route('taches.index'), { ...filters, sort: key, dir }, { preserveState: true, replace: true });
  };

  // Recherche debounce
  const debouncedSearch = useCallback(
    debounce((value) => {
      router.get(route('taches.index'), { ...filters, search: value }, { preserveState: true, replace: true });
    }, 400),
    [filters]
  );

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    debouncedSearch(e.target.value);
  };

  // Filtre rapide via KPI (statut / retard)
  const applyQuickFilter = (patch) => {
    router.get(route('taches.index'), { ...filters, ...patch }, { preserveState: true, replace: true });
  };

  const resetFilters = () => router.get(route('taches.index'), {}, { preserveState: true, replace: true });

  // Changement de statut inline — route web taches.status (POST → JSON)
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await axios.post(route('taches.status', taskId), { status: newStatus });
      router.reload({ only: ['tasks', 'stats'] });
      toast.success('Statut mis à jour');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Transition interdite');
    }
  };

  // Action groupée — suppression via taches.destroy (pas de route bulk dédiée)
  const applyBulkAction = async () => {
    if (!bulkAction || selected.size === 0) return;
    const ids = Array.from(selected);

    try {
      if (bulkAction === 'delete') {
        if (!confirm(`Supprimer ${ids.length} tâche(s) ?`)) return;
        await Promise.all(ids.map((id) => axios.delete(route('taches.destroy', id))));
        toast.success(`${ids.length} tâche(s) supprimée(s)`);
      }
      setSelected(new Set());
      setBulkAction('');
      router.reload({ only: ['tasks', 'stats'] });
    } catch {
      toast.error("Erreur lors de l'action groupée");
    }
  };

  const openEdit    = (task) => setTaskModal({ open: true, task });
  const openCreate  = ()     => setTaskModal({ open: true, task: null });
  const closeModal  = ()     => setTaskModal({ open: false, task: null });
  const handleSaved = ()     => { closeModal(); router.reload({ only: ['tasks', 'stats'] }); };

  const canCreate = auth.user?.permissions?.includes('taches.create')
                 || auth.user?.roles?.includes('admin_org')
                 || !auth.user?.permissions; // fallback si permissions non fournies

  const isOverdueFilter = filters.overdue === '1' || filters.overdue === true;
  const isFiltered = Boolean(filters.search || filters.status || filters.priority || filters.due_from || isOverdueFilter);

  const checkboxClass = cx(
    'h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-purple-600',
    'bg-white dark:bg-[#0F1923] focus:ring-purple-500 cursor-pointer',
  );

  const kpis = [
    { key: 'todo',        icon: Circle,        label: 'À faire',   value: stats.todo,        tone: 'neutral', patch: { status: 'todo',        overdue: '' } },
    { key: 'in_progress', icon: RefreshCw,     label: 'En cours',  value: stats.in_progress, tone: 'accent',  patch: { status: 'in_progress', overdue: '' } },
    { key: 'done',        icon: CheckCircle2,  label: 'Terminées', value: stats.done,        tone: 'success', patch: { status: 'done',        overdue: '' } },
    { key: 'overdue',     icon: AlertTriangle, label: 'En retard', value: stats.overdue,     tone: 'danger',  patch: { status: '',            overdue: '1' } },
  ];

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: '__select',
      width: '44px',
      className: 'relative',
      label: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => toggleSelectAll(e.target.checked)}
          aria-label="Tout sélectionner"
          className={checkboxClass}
        />
      ),
      render: (_v, task) => {
        const prio = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.low;
        return (
          <>
            <span className={cx('absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r', prio.bar)} />
            <input
              type="checkbox"
              checked={selected.has(task.id)}
              onChange={(e) => toggleSelect(task.id, e.target.checked)}
              aria-label={`Sélectionner « ${task.title} »`}
              className={checkboxClass}
            />
          </>
        );
      },
    },
    {
      key: 'title',
      label: 'Tâche',
      sortable: true,
      render: (v, task) => (
        <div className="min-w-[200px] max-w-[340px]">
          <button
            type="button"
            onClick={() => openEdit(task)}
            className={cx(
              'text-left text-sm font-medium leading-snug transition-colors rounded', FOCUS_RING,
              task.status === 'done'
                ? cx('line-through', TEXT_FAINT)
                : cx(TEXT_TITLE, 'hover:text-purple-600 dark:hover:text-purple-400'),
            )}
          >
            {v}
          </button>
          {task.subtasks_count > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="h-1 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <div className="h-full rounded-full bg-purple-500" style={{ width: `${task.subtasks_progress}%` }} />
              </div>
              <span className={cx('text-[10px] font-medium', TEXT_FAINT, NUM)}>{task.subtasks_progress}%</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      nowrap: true,
      render: (v, task) => (
        <select
          value={v}
          onChange={(e) => handleStatusChange(task.id, e.target.value)}
          aria-label="Statut de la tâche"
          className={cx(
            'cursor-pointer rounded-md border px-2 py-1 text-xs font-medium transition-colors',
            BORDER, SURFACE, TEXT_TITLE,
            'focus:outline-none focus:ring-2 focus:ring-purple-500',
          )}
        >
          {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      ),
    },
    {
      key: 'priority',
      label: 'Priorité',
      sortable: true,
      nowrap: true,
      render: (v) => {
        const p = PRIORITY_CONFIG[v] ?? PRIORITY_CONFIG.low;
        return <Badge variant={p.tone} dot>{p.label}</Badge>;
      },
    },
    {
      key: 'project',
      label: 'Projet',
      nowrap: true,
      render: (project) => project
        ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: project.color ? `${project.color}1A` : undefined,
              color: project.color ?? undefined,
            }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: project.color ?? '#9ca3af' }}
            />
            {project.name}
          </span>
        )
        : <span className={TEXT_FAINT}>—</span>,
    },
    {
      key: 'assignees',
      label: 'Assignés',
      render: (assignees) => {
        const list = assignees ?? [];
        if (list.length === 0) return <span className={cx('text-xs', TEXT_FAINT)}>Non assigné</span>;
        return (
          <div className="flex -space-x-1.5">
            {list.slice(0, 4).map((user) => (
              <img
                key={user.id}
                src={user.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=9333EA&color=fff&size=24`}
                alt={user.name}
                title={user.name}
                className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#162032]"
              />
            ))}
            {list.length > 4 && (
              <span className={cx(
                'flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold ring-2 ring-white',
                'dark:bg-white/10 dark:ring-[#162032]', TEXT_MUTED, NUM,
              )}>
                +{list.length - 4}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'due_date',
      label: 'Échéance',
      sortable: true,
      nowrap: true,
      render: (_v, task) => {
        const due = dueMeta(task);
        if (!due) return <span className={TEXT_FAINT}>—</span>;
        return (
          <span className={cx('inline-flex items-center gap-1.5 text-xs font-medium', DUE_TONE[due.tone])}>
            {due.tone === 'danger'
              ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              : <CalendarDays className="h-3.5 w-3.5 shrink-0" />}
            {due.label}
          </span>
        );
      },
    },
  ];

  /* ─── Rendu ──────────────────────────────────────────────────────────────── */

  return (
    <AppLayout>
      <Head title="Tâches — Liste" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={ListChecks}
          title="Tâches"
          breadcrumbs={[{ label: 'Pilotage' }, { label: 'Tâches' }]}
          subtitle={
            <>
              {stats.total ?? tasks.total ?? 0} tâche{(stats.total ?? tasks.total ?? 0) > 1 ? 's' : ''} au total
              {stats.overdue > 0 && <> · <span className="font-medium text-red-600 dark:text-red-400">{stats.overdue} en retard</span></>}
            </>
          }
          actions={
            <>
              <div className={cx('inline-flex overflow-hidden rounded-lg border', BORDER)}>
                <a
                  href={route('taches.kanban')}
                  className={cx(
                    'inline-flex h-10 items-center gap-1.5 px-3 text-sm font-medium transition-colors',
                    SURFACE, TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]', FOCUS_RING,
                  )}
                >
                  <LayoutGrid className="h-4 w-4" /> Kanban
                </a>
                <span className={cx(
                  'inline-flex h-10 items-center gap-1.5 border-l px-3 text-sm font-medium',
                  BORDER, 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300',
                )}>
                  <List className="h-4 w-4" /> Liste
                </span>
              </div>
              {canCreate && (
                <Button variant="primary" icon={PlusCircle} onClick={openCreate}>
                  Nouvelle tâche
                </Button>
              )}
            </>
          }
        />

        {/* KPI — filtres rapides */}
        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {kpis.map((k) => (
            <StatCard
              key={k.key}
              icon={k.icon}
              label={k.label}
              value={k.value ?? 0}
              tone={k.tone}
              active={k.key === 'overdue' ? isOverdueFilter : filters.status === k.key}
              onClick={() => applyQuickFilter(k.patch)}
            />
          ))}
        </div>

        {/* Barre de recherche + filtres */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
            <input
              type="search"
              placeholder="Rechercher une tâche…"
              value={searchValue}
              onChange={handleSearchChange}
              className={cx(CONTROL, 'h-10 pl-9')}
            />
          </div>

          <label className={cx(
            'inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
            BORDER, SURFACE, TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]',
          )}>
            <input
              type="checkbox"
              checked={isOverdueFilter}
              onChange={(e) => applyQuickFilter({ overdue: e.target.checked ? '1' : '' })}
              className={cx(checkboxClass, 'text-red-600 focus:ring-red-500')}
            />
            <AlertTriangle className="h-4 w-4 text-red-500" />
            En retard
          </label>

          <Button
            variant={showFilters ? 'subtle' : 'secondary'}
            icon={Filter}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtres
          </Button>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className={cx('mb-4 grid grid-cols-2 gap-3 rounded-xl border p-4 sm:grid-cols-4', BORDER, SURFACE)}>
            <select
              defaultValue={filters.status ?? ''}
              onChange={(e) => applyQuickFilter({ status: e.target.value })}
              className={cx(CONTROL, 'h-10')}
            >
              <option value="">Tous statuts</option>
              {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            <select
              defaultValue={filters.priority ?? ''}
              onChange={(e) => applyQuickFilter({ priority: e.target.value })}
              className={cx(CONTROL, 'h-10')}
            >
              <option value="">Toutes priorités</option>
              {Object.entries(PRIORITY_CONFIG).map(([val, { label }]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            <input
              type="date"
              defaultValue={filters.due_from ?? ''}
              onChange={(e) => applyQuickFilter({ due_from: e.target.value })}
              className={cx(CONTROL, 'h-10')}
            />

            <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
          </div>
        )}

        {/* Barre actions groupées */}
        {selected.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 dark:border-purple-500/30 dark:bg-purple-500/10">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              {selected.size} tâche{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
            </span>
            <div className="ml-auto flex gap-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className={cx(CONTROL, 'h-9 w-auto min-w-[160px]')}
              >
                <option value="">Action groupée…</option>
                <option value="delete">Supprimer</option>
              </select>
              <Button variant="danger" size="sm" icon={Trash2} disabled={!bulkAction} onClick={applyBulkAction}>
                Appliquer
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <DataTable
          columns={columns}
          data={tasks.data ?? []}
          rowKey="id"
          pageSize={tasks.per_page ?? 15}
          totalItems={tasks.total ?? (tasks.data?.length ?? 0)}
          onSort={handleSort}
          rowClassName={(t) => selected.has(t.id) ? 'bg-purple-50 dark:bg-purple-500/10' : ''}
          actions={(task) => (
            <Button
              variant="ghost" size="sm" iconOnly icon={MoreHorizontal}
              title="Modifier la tâche"
              onClick={() => openEdit(task)}
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            />
          )}
          empty={
            isFiltered ? (
              <EmptyState
                variant="no-results"
                title="Aucune tâche ne correspond"
                description="Aucun résultat pour ces filtres. Élargissez la recherche ou repartez de zéro."
                action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
              />
            ) : (
              <EmptyState
                icon={ListChecks}
                title="Aucune tâche pour l'instant"
                description="Organisez le travail de votre équipe : assignez, priorisez et suivez les échéances au même endroit."
                hints={[
                  'Une tâche peut être rattachée à un projet et à plusieurs assignés.',
                  'La vue Kanban donne la même liste sous forme de colonnes de statut.',
                ]}
                action={canCreate
                  ? <Button variant="primary" icon={PlusCircle} onClick={openCreate}>Créer la première tâche</Button>
                  : undefined}
                secondary={<Button variant="ghost" href={route('taches.kanban')} icon={LayoutGrid}>Voir le Kanban</Button>}
              />
            )
          }
          footer={tasks.last_page > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className={cx('text-xs', TEXT_MUTED, NUM)}>
                {tasks.from}–{tasks.to} sur {tasks.total}
              </p>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: tasks.last_page }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => router.get(route('taches.index'), { ...filters, page }, { preserveState: true, replace: true })}
                    className={cx(
                      'h-8 min-w-[32px] rounded-lg border px-2 text-xs font-medium transition-colors', NUM, FOCUS_RING,
                      tasks.current_page === page
                        ? 'border-transparent bg-purple-600 text-white'
                        : cx(BORDER, SURFACE, 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        />
      </div>

      {/* Modal tâche */}
      {taskModal.open && (
        <TaskModal
          task={taskModal.task}
          defaultStatus="todo"
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </AppLayout>
  );
}
export { TachesListe };
