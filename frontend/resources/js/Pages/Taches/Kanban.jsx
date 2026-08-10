/**
 * Taches/Kanban.jsx — Tableau Kanban des tâches SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`
 * (PageHeader / Button / Badge / EmptyState / tokens) — même langage visuel
 * que `Taches/Liste.jsx`, la bascule Liste ↔ Kanban ne change plus de style.
 *
 * La logique de glisser-déposer (@dnd-kit) est STRICTEMENT inchangée :
 * mêmes capteurs, mêmes handlers, même payload `taches.reorder`.
 *
 * Props Inertia :
 *   - tasksByStatus : { todo: [...], in_progress: [...], review: [...], done: [...], cancelled: [...] }
 *   - filters       : { priority, assignee, project_id, due_from, due_to, search }
 */

import { useState, useCallback, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AppLayout from '@/Layouts/AppLayout';
import {
  PlusCircle, Filter, Search, AlertTriangle, GripVertical,
  CalendarDays, Layers, CheckCircle2, Circle, RefreshCw, Ban,
  LayoutGrid, List, ListChecks,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import TaskModal from '@/Components/Taches/TaskModal';
import debounce from 'lodash/debounce';
import {
  PageHeader, Button, EmptyState,
  cx, CONTROL, SURFACE, SURFACE_SUNK, BORDER,
  TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING, TONES,
} from '@/Components/UI';

// ---------------------------------------------------------------------------
// Configuration des colonnes — tons sémantiques alignés sur Taches/Liste.jsx
// ---------------------------------------------------------------------------

const COLUMNS = [
  { id: 'todo',        label: 'À faire',     icon: Circle,       tone: 'neutral' },
  { id: 'in_progress', label: 'En cours',    icon: RefreshCw,    tone: 'accent'  },
  { id: 'review',      label: 'En révision', icon: Layers,       tone: 'info'    },
  { id: 'done',        label: 'Terminé',     icon: CheckCircle2, tone: 'success' },
  { id: 'cancelled',   label: 'Annulé',      icon: Ban,          tone: 'danger'  },
];

/**
 * Barre de priorité fine (jamais de fond coloré plein sur la carte).
 * `medium` et `normal` coexistent en base — les deux sont couverts.
 */
const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', bar: 'bg-red-500'   },
  high:   { label: 'Haute',   bar: 'bg-amber-500' },
  medium: { label: 'Moyenne', bar: 'bg-sky-500'   },
  normal: { label: 'Moyenne', bar: 'bg-sky-500'   },
  low:    { label: 'Basse',   bar: 'bg-gray-300 dark:bg-gray-600' },
};

// ---------------------------------------------------------------------------
// Carte de tâche (draggable)
// ---------------------------------------------------------------------------

function TaskCard({ task, isDragging = false, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const isOverdue  = task.is_overdue;
  const dueDateObj = task.due_date ? new Date(task.due_date) : null;
  const prio       = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.low;
  const assignees  = task.assignees ?? [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(task)}
      className={cx(
        'group relative cursor-pointer select-none overflow-hidden rounded-lg border shadow-sm transition-colors',
        SURFACE,
        isOverdue
          ? 'border-red-200 dark:border-red-500/40'
          : cx(BORDER, 'hover:border-purple-300 dark:hover:border-purple-500/50'),
        isDragging && 'shadow-lg ring-1 ring-purple-500/30',
      )}
    >
      {/* Barre de priorité */}
      <span className={cx('absolute inset-y-0 left-0 w-0.5', prio.bar)} aria-hidden="true" />
      <span className="sr-only">Priorité : {prio.label}</span>

      {/* Poignée drag */}
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        title="Déplacer la tâche"
        className={cx(
          'absolute right-1.5 top-1.5 cursor-grab rounded p-1 opacity-0 transition-opacity',
          'group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing',
          TEXT_FAINT, 'hover:text-gray-600 dark:hover:text-gray-300',
        )}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
      </div>

      <div className="py-2.5 pl-3.5 pr-7">
        {/* Titre */}
        <p className={cx(
          'text-sm font-medium leading-snug',
          task.status === 'done' ? cx('line-through', TEXT_FAINT) : TEXT_TITLE,
        )}>
          {task.title}
        </p>

        {/* Projet */}
        {task.project && (
          <span
            className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: task.project.color ? `${task.project.color}1A` : undefined,
              color: task.project.color ?? undefined,
            }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: task.project.color ?? '#9ca3af' }}
            />
            <span className="truncate">{task.project.name}</span>
          </span>
        )}

        {/* Sous-tâches */}
        {task.subtasks_count > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
              <div className="h-full rounded-full bg-purple-500" style={{ width: `${task.subtasks_progress}%` }} />
            </div>
            <span className={cx('shrink-0 text-[10px] font-medium', TEXT_FAINT, NUM)}>
              {task.subtasks_progress}%
            </span>
          </div>
        )}

        {/* Pied : assignés + échéance */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex -space-x-1.5">
            {assignees.slice(0, 3).map((user) => (
              <img
                key={user.id}
                src={user.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=9333EA&color=fff&size=24`}
                alt={user.name}
                title={user.name}
                className="h-5 w-5 rounded-full ring-2 ring-white dark:ring-[#162032]"
              />
            ))}
            {assignees.length > 3 && (
              <span className={cx(
                'flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[9px] font-semibold ring-2 ring-white',
                'dark:bg-white/10 dark:ring-[#162032]', TEXT_MUTED, NUM,
              )}>
                +{assignees.length - 3}
              </span>
            )}
          </div>

          {dueDateObj && (
            <span className={cx(
              'inline-flex shrink-0 items-center gap-1 text-[11px] font-medium', NUM,
              isOverdue ? 'text-red-600 dark:text-red-400' : TEXT_MUTED,
            )}>
              {isOverdue
                ? <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                : <CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" />}
              {format(dueDateObj, 'd MMM', { locale: fr })}
              {isOverdue && task.days_overdue ? ` (${task.days_overdue}j)` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Colonne Kanban
// ---------------------------------------------------------------------------

function KanbanColumn({ column, tasks, onAddTask, onEditTask }) {
  const { id, label, icon: Icon, tone } = column;
  const t = TONES[tone] ?? TONES.neutral;

  return (
    <div className={cx(
      'flex w-[286px] shrink-0 flex-col rounded-xl border',
      BORDER, SURFACE_SUNK,
    )}>
      {/* En-tête colonne */}
      <div className={cx('flex items-center justify-between gap-2 border-b px-3 py-2.5', BORDER)}>
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={cx('h-4 w-4 shrink-0', t.icon)} aria-hidden="true" />
          <span className={cx('truncate text-[11px] font-semibold uppercase tracking-wider', TEXT_TITLE)}>
            {label}
          </span>
          <span className={cx(
            'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
            t.soft, t.text, NUM,
          )}>
            {tasks.length}
          </span>
        </div>

        {id !== 'cancelled' && (
          <button
            type="button"
            onClick={() => onAddTask(id)}
            title={`Nouvelle tâche dans « ${label} »`}
            className={cx(
              'rounded-lg p-1 transition-colors', TEXT_MUTED,
              'hover:bg-gray-200/70 hover:text-purple-600 dark:hover:bg-white/[0.08] dark:hover:text-purple-400',
              FOCUS_RING,
            )}
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Zone droppable */}
      <SortableContext items={tasks.map((t2) => t2.id)} strategy={verticalListSortingStrategy}>
        <div className="max-h-[calc(100vh-300px)] min-h-[120px] flex-1 space-y-2 overflow-y-auto p-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} />
          ))}
          {tasks.length === 0 && (
            <div className={cx(
              'flex h-20 items-center justify-center rounded-lg border border-dashed text-xs',
              BORDER, TEXT_FAINT,
            )}>
              Déposer ici
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal Kanban
// ---------------------------------------------------------------------------

export default function KanbanPage({ tasksByStatus: initialTasksByStatus = {}, filters = {} }) {
  const { auth } = usePage().props;

  // État local des tâches (optimistic UI)
  const [boards, setBoards] = useState(() => {
    const b = {};
    COLUMNS.forEach(({ id }) => {
      b[id] = (initialTasksByStatus[id] ?? []).sort((a, b2) => a.position - b2.position);
    });
    return b;
  });

  // La prop Inertia est rechargée après une sauvegarde ou un rollback de drag :
  // sans cette resynchronisation, le tableau resterait figé sur l'état initial.
  useEffect(() => {
    const b = {};
    COLUMNS.forEach(({ id }) => {
      b[id] = (initialTasksByStatus[id] ?? []).slice().sort((x, y) => x.position - y.position);
    });
    setBoards(b);
  }, [initialTasksByStatus]);

  const [activeTask, setActiveTask]   = useState(null);  // Tâche en cours de drag
  const [taskModal, setTaskModal]     = useState({ open: false, task: null, defaultStatus: 'todo' });
  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  const [showFilters, setShowFilters] = useState(false);

  // Capteurs DnD : décalage minimal de 8px pour distinguer clic/drag
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Trouver la colonne d'une tâche
  const findColumn = (taskId) => {
    for (const [colId, tasks] of Object.entries(boards)) {
      if (tasks.find((t) => t.id === taskId)) return colId;
    }
    return null;
  };

  // -------------------------------------------------------------------------
  // Handlers DnD
  // -------------------------------------------------------------------------

  const handleDragStart = ({ active }) => {
    const colId = findColumn(active.id);
    if (colId) {
      setActiveTask(boards[colId].find((t) => t.id === active.id));
    }
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;

    const activeColId = findColumn(active.id);
    // over peut être une colonne ou une tâche
    const overColId = COLUMNS.find((c) => c.id === over.id)?.id ?? findColumn(over.id);

    if (!activeColId || !overColId || activeColId === overColId) return;

    // Déplacer la tâche d'une colonne à l'autre (UI optimiste)
    setBoards((prev) => {
      const task     = prev[activeColId].find((t) => t.id === active.id);
      const newBoards = { ...prev };
      newBoards[activeColId] = prev[activeColId].filter((t) => t.id !== active.id);
      newBoards[overColId]   = [...prev[overColId], { ...task, status: overColId }];
      return newBoards;
    });
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    if (!over) return;

    const activeColId = findColumn(active.id);
    const overColId   = COLUMNS.find((c) => c.id === over.id)?.id ?? findColumn(over.id);

    if (!activeColId || !overColId) return;

    // Réordonner si même colonne
    if (activeColId === overColId) {
      const oldIndex = boards[activeColId].findIndex((t) => t.id === active.id);
      const newIndex = boards[activeColId].findIndex((t) => t.id === over.id);

      if (oldIndex !== newIndex) {
        setBoards((prev) => ({
          ...prev,
          [activeColId]: arrayMove(prev[activeColId], oldIndex, newIndex),
        }));
      }
    }

    // Envoyer les nouvelles positions au serveur
    const payload = [];
    for (const [colId, tasks] of Object.entries(boards)) {
      tasks.forEach((task, index) => {
        payload.push({ id: task.id, status: colId, position: index });
      });
    }

    try {
      await axios.post(route('taches.reorder'), { tasks: payload });
    } catch {
      toast.error('Erreur lors de la mise à jour de l\'ordre');
      // Rollback : recharger depuis le serveur
      router.reload({ only: ['tasksByStatus'] });
    }
  };

  // -------------------------------------------------------------------------
  // Recherche (debounced)
  // -------------------------------------------------------------------------

  const debouncedSearch = useCallback(
    debounce((value) => {
      router.get(route('taches.kanban'), { ...filters, search: value }, {
        preserveState: true,
        replace: true,
      });
    }, 400),
    [filters]
  );

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    debouncedSearch(e.target.value);
  };

  const applyFilter = (patch) =>
    router.get(route('taches.kanban'), { ...filters, ...patch }, { preserveState: true, replace: true });

  const resetFilters = () =>
    router.get(route('taches.kanban'), {}, { preserveState: true, replace: true });

  // -------------------------------------------------------------------------
  // Modal tâche
  // -------------------------------------------------------------------------

  const openCreate = (defaultStatus) => setTaskModal({ open: true, task: null, defaultStatus });
  const openEdit   = (task)         => setTaskModal({ open: true, task, defaultStatus: task.status });
  const closeModal = ()             => setTaskModal({ open: false, task: null, defaultStatus: 'todo' });

  const handleTaskSaved = (savedTask) => {
    closeModal();
    router.reload({ only: ['tasksByStatus'] });
  };

  const canCreate = auth?.user?.permissions?.includes('taches.create')
                 || auth?.user?.roles?.includes('admin_org')
                 || !auth?.user?.permissions; // fallback si permissions non fournies

  const totalTasks = COLUMNS.reduce((n, c) => n + (boards[c.id]?.length ?? 0), 0);
  const isFiltered = Boolean(filters.search || filters.priority || filters.due_from || filters.due_to);

  return (
    <AppLayout>
      <Head title="Tâches — Kanban" />

      <div className="flex h-full flex-col">

        {/* En-tête + barre d'outils */}
        <div className="shrink-0 px-4 pt-6 sm:px-6 lg:px-8">
          <PageHeader
            icon={ListChecks}
            title="Tâches"
            breadcrumbs={[{ label: 'Pilotage' }, { label: 'Tâches' }, { label: 'Kanban' }]}
            subtitle={`${totalTasks} tâche${totalTasks > 1 ? 's' : ''} sur le tableau`}
            className="mb-4"
            actions={
              <>
                <div className={cx('inline-flex overflow-hidden rounded-lg border', BORDER)}>
                  <span className={cx(
                    'inline-flex h-10 items-center gap-1.5 px-3 text-sm font-medium',
                    'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300',
                  )}>
                    <LayoutGrid className="h-4 w-4" /> Kanban
                  </span>
                  <a
                    href={route('taches.index')}
                    className={cx(
                      'inline-flex h-10 items-center gap-1.5 border-l px-3 text-sm font-medium transition-colors',
                      BORDER, SURFACE, TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]', FOCUS_RING,
                    )}
                  >
                    <List className="h-4 w-4" /> Liste
                  </a>
                </div>
                {canCreate && (
                  <Button variant="primary" icon={PlusCircle} onClick={() => openCreate('todo')}>
                    Nouvelle tâche
                  </Button>
                )}
              </>
            }
          />

          {/* Recherche + filtres */}
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

            <Button
              variant={showFilters ? 'subtle' : 'secondary'}
              icon={Filter}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtres
            </Button>
          </div>

          {showFilters && (
            <div className={cx('mb-4 grid grid-cols-2 gap-3 rounded-xl border p-4 sm:grid-cols-4', BORDER, SURFACE)}>
              <select
                defaultValue={filters.priority ?? ''}
                onChange={(e) => applyFilter({ priority: e.target.value })}
                aria-label="Filtrer par priorité"
                className={cx(CONTROL, 'h-10')}
              >
                <option value="">Toutes priorités</option>
                <option value="urgent">Urgente</option>
                <option value="high">Haute</option>
                <option value="normal">Moyenne</option>
                <option value="low">Basse</option>
              </select>

              <input
                type="date"
                defaultValue={filters.due_from ?? ''}
                onChange={(e) => applyFilter({ due_from: e.target.value })}
                aria-label="Échéance à partir du"
                className={cx(CONTROL, 'h-10')}
              />

              <input
                type="date"
                defaultValue={filters.due_to ?? ''}
                onChange={(e) => applyFilter({ due_to: e.target.value })}
                aria-label="Échéance jusqu'au"
                className={cx(CONTROL, 'h-10')}
              />

              <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
            </div>
          )}
        </div>

        {/* Tableau Kanban */}
        <div className="flex-1 overflow-x-auto px-4 pb-6 sm:px-6 lg:px-8">
          {totalTasks === 0 && !isFiltered ? (
            <EmptyState
              bordered
              icon={ListChecks}
              title="Aucune tâche pour l'instant"
              description="Organisez le travail de votre équipe : assignez, priorisez et suivez les échéances au même endroit."
              hints={[
                'Chaque colonne correspond à un statut ; glissez une carte pour la faire avancer.',
                'La vue Liste donne les mêmes tâches sous forme de tableau triable.',
              ]}
              action={canCreate
                ? <Button variant="primary" icon={PlusCircle} onClick={() => openCreate('todo')}>Créer la première tâche</Button>
                : undefined}
              secondary={<Button variant="ghost" href={route('taches.index')} icon={List}>Voir la liste</Button>}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex h-full gap-4">
                {COLUMNS.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    tasks={boards[column.id] ?? []}
                    onAddTask={openCreate}
                    onEditTask={openEdit}
                  />
                ))}
              </div>

              {/* Overlay pendant le drag */}
              <DragOverlay>
                {activeTask && (
                  <TaskCard task={activeTask} isDragging onEdit={() => {}} />
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      {/* Modal création/édition tâche */}
      {taskModal.open && (
        <TaskModal
          task={taskModal.task}
          defaultStatus={taskModal.defaultStatus}
          onClose={closeModal}
          onSaved={handleTaskSaved}
        />
      )}
    </AppLayout>
  );
}
export { KanbanPage };
