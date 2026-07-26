/**
 * Taches/Kanban.jsx — Tableau Kanban des tâches SECRETIS ERP
 *
 * Drag & drop inter-colonnes avec @dnd-kit/core + @dnd-kit/sortable.
 * 5 colonnes : À faire / En cours / En révision / Terminé / Annulé
 *
 * Props Inertia :
 *   - tasksByStatus : { todo: [...], in_progress: [...], review: [...], done: [...], cancelled: [...] }
 *   - filters       : { priority, assignee, project_id, due_from, due_to, search }
 */

import { useState, useCallback, useRef } from 'react';
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
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PlusCircle, Filter, Search, Clock, AlertTriangle,
  GripVertical, MoreHorizontal, CalendarDays, Layers,
  CheckCircle2, Circle, RefreshCw, Ban
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import TaskModal from '@/Components/Taches/TaskModal';
import debounce from 'lodash/debounce';

// ---------------------------------------------------------------------------
// Configuration des colonnes
// ---------------------------------------------------------------------------

const COLUMNS = [
  {
    id:    'todo',
    label: 'À faire',
    icon:  Circle,
    color: 'text-gray-500 dark:text-gray-400',
    headerBg: 'bg-gray-100 dark:bg-gray-700',
    accent: 'border-gray-300 dark:border-gray-600',
  },
  {
    id:    'in_progress',
    label: 'En cours',
    icon:  RefreshCw,
    color: 'text-purple-600 dark:text-purple-400',
    headerBg: 'bg-purple-50 dark:bg-purple-900/20',
    accent: 'border-purple-300 dark:border-purple-700',
  },
  {
    id:    'review',
    label: 'En révision',
    icon:  Layers,
    color: 'text-purple-600 dark:text-purple-400',
    headerBg: 'bg-purple-50 dark:bg-purple-900/20',
    accent: 'border-purple-300 dark:border-purple-700',
  },
  {
    id:    'done',
    label: 'Terminé',
    icon:  CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    headerBg: 'bg-green-50 dark:bg-green-900/20',
    accent: 'border-green-300 dark:border-green-700',
  },
  {
    id:    'cancelled',
    label: 'Annulé',
    icon:  Ban,
    color: 'text-red-500 dark:text-red-400',
    headerBg: 'bg-red-50 dark:bg-red-900/20',
    accent: 'border-red-300 dark:border-red-700',
  },
];

const PRIORITY_CONFIG = {
  low:    { label: 'Faible',  color: 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200' },
  normal: { label: 'Normal',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  high:   { label: 'Haute',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
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

  const isOverdue = task.is_overdue;
  const dueDateObj = task.due_date ? new Date(task.due_date) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-white dark:bg-gray-800 rounded-xl border shadow-sm
        transition-all duration-150 cursor-pointer select-none
        ${isOverdue
          ? 'border-red-300 dark:border-red-700'
          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
        }
        ${isDragging ? 'shadow-xl rotate-1 scale-105' : 'hover:shadow-md'}
      `}
      onClick={() => onEdit(task)}
    >
      {/* Poignée drag */}
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing
                   p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <div className="p-3">
        {/* Priorité */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`
            text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded
            ${PRIORITY_CONFIG[task.priority]?.color ?? ''}
          `}>
            {PRIORITY_CONFIG[task.priority]?.label ?? task.priority}
          </span>
          {task.project && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate max-w-[80px]"
              style={{
                backgroundColor: task.project.color ? `${task.project.color}20` : '#e5e7eb',
                color: task.project.color ?? '#6b7280',
              }}
            >
              {task.project.name}
            </span>
          )}
        </div>

        {/* Titre */}
        <p className={`
          text-sm font-medium leading-snug mb-2
          ${task.status === 'done'
            ? 'text-gray-400 dark:text-gray-500 line-through'
            : 'text-gray-800 dark:text-gray-100'
          }
        `}>
          {task.title}
        </p>

        {/* Sous-tâches progress */}
        {task.subtasks_count > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
              <span>{task.subtasks_progress}% ({task.subtasks_count} sous-tâches)</span>
            </div>
            <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${task.subtasks_progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer : assignés + date */}
        <div className="flex items-center justify-between mt-2.5">
          {/* Avatars assignés */}
          <div className="flex -space-x-1.5">
            {(task.assignees ?? []).slice(0, 3).map((user) => (
              <img
                key={user.id}
                src={user.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=24`}
                alt={user.name}
                title={user.name}
                className="w-5 h-5 rounded-full ring-1 ring-white dark:ring-gray-800"
              />
            ))}
            {task.assignees?.length > 3 && (
              <span className="w-5 h-5 rounded-full ring-1 ring-white dark:ring-gray-800 bg-gray-200 dark:bg-gray-600
                               text-[9px] font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center">
                +{task.assignees.length - 3}
              </span>
            )}
          </div>

          {/* Date d'échéance */}
          {dueDateObj && (
            <div className={`
              flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded
              ${isOverdue
                ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                : 'text-gray-500 dark:text-gray-400'
              }
            `}>
              {isOverdue && <AlertTriangle className="w-2.5 h-2.5" />}
              <CalendarDays className="w-2.5 h-2.5" />
              {format(dueDateObj, 'd MMM', { locale: fr })}
              {isOverdue && <span>({task.days_overdue}j)</span>}
            </div>
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
  const { id, label, icon: Icon, color, headerBg, accent } = column;

  return (
    <div className={`flex flex-col rounded-2xl border-2 ${accent} bg-gray-50 dark:bg-gray-800/50 min-w-[260px] max-w-[280px] flex-shrink-0`}>
      {/* En-tête colonne */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${headerBg}`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className={`text-xs font-bold uppercase tracking-wide ${color}`}>{label}</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>

        {/* Bouton "+" */}
        {id !== 'cancelled' && (
          <button
            onClick={() => onAddTask(id)}
            className={`p-1 rounded-lg transition-colors ${color} hover:bg-white dark:hover:bg-gray-700`}
            title={`Nouvelle tâche dans "${label}"`}
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Zone droppable */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2 min-h-[120px] overflow-y-auto max-h-[calc(100vh-280px)]">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} />
          ))}
          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-20 text-xs text-gray-400 dark:text-gray-600 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
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

export default function KanbanPage({ tasksByStatus: initialTasksByStatus, filters }) {
  const { auth } = usePage().props;

  // État local des tâches (optimistic UI)
  const [boards, setBoards] = useState(() => {
    const b = {};
    COLUMNS.forEach(({ id }) => {
      b[id] = (initialTasksByStatus[id] ?? []).sort((a, b) => a.position - b.position);
    });
    return b;
  });

  const [activeTask, setActiveTask] = useState(null);  // Tâche en cours de drag
  const [taskModal, setTaskModal]   = useState({ open: false, task: null, defaultStatus: 'todo' });
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
      router.get(route('taches.index'), { ...filters, view: 'kanban', search: value }, {
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

  return (
    <AuthLayout>
      <Head title="Tâches — Kanban" />

      <div className="h-full flex flex-col">

        {/* Barre supérieure */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tableau Kanban</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchValue}
                  onChange={handleSearchChange}
                  className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                             text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-52"
                />
              </div>

              {/* Filtres */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors
                  ${showFilters
                    ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                <Filter className="w-4 h-4" />
                Filtres
              </button>

              {/* Vue liste */}
              <a
                href={route('taches.index')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700
                           text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Vue liste
              </a>
            </div>
          </div>

          {/* Panneau filtres */}
          {showFilters && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Priorité */}
              <select
                defaultValue={filters.priority ?? ''}
                onChange={(e) => router.get(route('taches.index'), { ...filters, view: 'kanban', priority: e.target.value }, { preserveState: true, replace: true })}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Toutes priorités</option>
                <option value="urgent">Urgente</option>
                <option value="high">Haute</option>
                <option value="normal">Normal</option>
                <option value="low">Faible</option>
              </select>

              {/* Échéance depuis */}
              <input
                type="date"
                defaultValue={filters.due_from ?? ''}
                onChange={(e) => router.get(route('taches.index'), { ...filters, view: 'kanban', due_from: e.target.value }, { preserveState: true, replace: true })}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              {/* Échéance jusqu'à */}
              <input
                type="date"
                defaultValue={filters.due_to ?? ''}
                onChange={(e) => router.get(route('taches.index'), { ...filters, view: 'kanban', due_to: e.target.value }, { preserveState: true, replace: true })}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              <button
                onClick={() => router.get(route('taches.index'), { view: 'kanban' }, { preserveState: true, replace: true })}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>

        {/* Tableau Kanban */}
        <div className="flex-1 overflow-x-auto px-6 py-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full">
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
    </AuthLayout>
  );
}
export { KanbanPage };
