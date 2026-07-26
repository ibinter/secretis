/**
 * Taches/Liste.jsx — Vue liste des tâches SECRETIS ERP
 *
 * Tableau paginé avec :
 *   - Tri par colonne (titre, priorité, statut, assigné, échéance)
 *   - Sélection multiple + actions groupées (assigner, changer statut, supprimer)
 *   - Indicateurs visuels de retard
 *   - Navigation vers la vue Kanban
 *
 * Props Inertia :
 *   - tasks   : LengthAwarePaginator
 *   - filters : { status, priority, assignee, project_id, due_from, due_to, search, overdue }
 */

import { useState, useCallback } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  Search, Filter, PlusCircle, MoreHorizontal,
  ChevronUp, ChevronDown, AlertTriangle, CheckCircle2,
  Trash2, UserPlus, RefreshCw, LayoutGrid, List
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import TaskModal from '@/Components/Taches/TaskModal';
import debounce from 'lodash/debounce';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const PRIORITY_CONFIG = {
  low:    { label: 'Faible',  dot: 'bg-gray-400',   text: 'text-gray-600 dark:text-gray-400'   },
  normal: { label: 'Normal',  dot: 'bg-purple-500',   text: 'text-purple-700 dark:text-purple-400'   },
  high:   { label: 'Haute',   dot: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400' },
  urgent: { label: 'Urgente', dot: 'bg-red-500',    text: 'text-red-700 dark:text-red-400'     },
};

const STATUS_CONFIG = {
  todo:        { label: 'À faire',      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'          },
  in_progress: { label: 'En cours',     color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'       },
  review:      { label: 'En révision',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  done:        { label: 'Terminé',      color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'   },
  cancelled:   { label: 'Annulé',       color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'           },
};

const COLUMNS = [
  { key: 'title',    label: 'Titre',       sortable: true  },
  { key: 'status',   label: 'Statut',      sortable: true  },
  { key: 'priority', label: 'Priorité',    sortable: true  },
  { key: 'project',  label: 'Projet',      sortable: false },
  { key: 'assignees',label: 'Assignés',    sortable: false },
  { key: 'due_date', label: 'Échéance',    sortable: true  },
  { key: 'actions',  label: '',            sortable: false },
];

// ---------------------------------------------------------------------------
// Cellule de tri
// ---------------------------------------------------------------------------

function SortHeader({ column, currentSort, currentDir, onSort }) {
  if (!column.sortable) return <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{column.label}</th>;

  const isActive = currentSort === column.key;
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
      onClick={() => onSort(column.key)}
    >
      <div className="flex items-center gap-1">
        {column.label}
        <span className="flex flex-col">
          <ChevronUp   className={`w-2.5 h-2.5 ${isActive && currentDir === 'asc'  ? 'text-purple-500' : 'text-gray-300 dark:text-gray-600'}`} />
          <ChevronDown className={`w-2.5 h-2.5 ${isActive && currentDir === 'desc' ? 'text-purple-500' : 'text-gray-300 dark:text-gray-600'}`} />
        </span>
      </div>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Ligne de tâche
// ---------------------------------------------------------------------------

function TaskRow({ task, selected, onSelect, onEdit, onStatusChange }) {
  const isOverdue = task.is_overdue;
  const dueDateObj = task.due_date ? new Date(task.due_date + 'T00:00:00') : null;

  return (
    <tr
      className={`
        group border-b border-gray-100 dark:border-gray-800 transition-colors
        ${selected
          ? 'bg-purple-50 dark:bg-purple-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }
      `}
    >
      {/* Checkbox */}
      <td className="w-12 px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(task.id, e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
        />
      </td>

      {/* Titre */}
      <td className="px-4 py-3 min-w-[200px] max-w-[300px]">
        <button
          onClick={() => onEdit(task)}
          className={`
            text-sm font-medium text-left leading-snug transition-colors
            ${task.status === 'done'
              ? 'text-gray-400 dark:text-gray-500 line-through'
              : 'text-gray-800 dark:text-gray-100 hover:text-purple-600 dark:hover:text-purple-400'
            }
          `}
        >
          {task.title}
        </button>
        {task.subtasks_count > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${task.subtasks_progress}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400">{task.subtasks_progress}%</span>
          </div>
        )}
      </td>

      {/* Statut */}
      <td className="px-4 py-3">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className={`
            text-xs font-semibold px-2 py-1 rounded-lg border-0 cursor-pointer focus:ring-2 focus:ring-purple-500
            ${STATUS_CONFIG[task.status]?.color ?? ''}
          `}
        >
          {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </td>

      {/* Priorité */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_CONFIG[task.priority]?.dot ?? 'bg-gray-400'}`} />
          <span className={`text-xs font-medium ${PRIORITY_CONFIG[task.priority]?.text ?? ''}`}>
            {PRIORITY_CONFIG[task.priority]?.label ?? task.priority}
          </span>
        </div>
      </td>

      {/* Projet */}
      <td className="px-4 py-3">
        {task.project ? (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: task.project.color ? `${task.project.color}20` : '#e5e7eb',
              color: task.project.color ?? '#6b7280',
            }}
          >
            {task.project.name}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      {/* Assignés */}
      <td className="px-4 py-3">
        <div className="flex -space-x-1.5">
          {(task.assignees ?? []).slice(0, 4).map((user) => (
            <img
              key={user.id}
              src={user.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=24`}
              alt={user.name}
              title={user.name}
              className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-gray-900"
            />
          ))}
          {task.assignees?.length > 4 && (
            <span className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-200 dark:bg-gray-600
                             text-[9px] font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center">
              +{task.assignees.length - 4}
            </span>
          )}
          {(!task.assignees || task.assignees.length === 0) && (
            <span className="text-xs text-gray-400">Non assigné</span>
          )}
        </div>
      </td>

      {/* Échéance */}
      <td className="px-4 py-3">
        {dueDateObj ? (
          <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
            {isOverdue && <AlertTriangle className="w-3 h-3" />}
            {format(dueDateObj, 'd MMM yyyy', { locale: fr })}
            {isOverdue && <span className="text-[10px]">({task.days_overdue}j)</span>}
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 w-10">
        <button
          onClick={() => onEdit(task)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function TachesListe({ tasks, filters }) {
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
  const handleSort = (key) => {
    const dir = sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc';
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

  // Changement de statut inline
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await axios.patch(route('taches.status', taskId), { status: newStatus });
      router.reload({ only: ['tasks'] });
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Transition interdite');
    }
  };

  // Action groupée
  const applyBulkAction = async () => {
    if (!bulkAction || selected.size === 0) return;

    const ids = Array.from(selected);

    try {
      if (bulkAction === 'delete') {
        if (!confirm(`Supprimer ${ids.length} tâche(s) ?`)) return;
        await axios.delete(route('taches.bulk-delete'), { data: { task_ids: ids } });
        toast.success(`${ids.length} tâche(s) supprimée(s)`);
      }
      setSelected(new Set());
      router.reload({ only: ['tasks'] });
    } catch {
      toast.error('Erreur lors de l\'action groupée');
    }
  };

  const openEdit   = (task) => setTaskModal({ open: true, task });
  const openCreate = ()     => setTaskModal({ open: true, task: null });
  const closeModal = ()     => setTaskModal({ open: false, task: null });
  const handleSaved = ()   => { closeModal(); router.reload({ only: ['tasks'] }); };

  const canCreate = auth.user?.permissions?.includes('taches.create')
                 || auth.user?.roles?.includes('admin_org');

  return (
    <AuthLayout>
      <Head title="Tâches — Liste" />

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tâches</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {tasks.total} tâche{tasks.total > 1 ? 's' : ''} au total
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Switcher vue */}
            <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <a
                href={route('taches.index', { view: 'kanban' })}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </a>
              <span className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30">
                <List className="w-4 h-4" />
                Liste
              </span>
            </div>

            {canCreate && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700
                           text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Nouvelle tâche
              </button>
            )}
          </div>
        </div>

        {/* Barre de recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une tâche..."
              value={searchValue}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                         bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Filtre tâches en retard */}
          <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <input
              type="checkbox"
              defaultChecked={filters.overdue === '1' || filters.overdue === true}
              onChange={(e) => router.get(route('taches.index'), { ...filters, overdue: e.target.checked ? '1' : '' }, { preserveState: true, replace: true })}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-red-500 focus:ring-red-500"
            />
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">En retard</span>
          </label>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors
              ${showFilters
                ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
              }`}
          >
            <Filter className="w-4 h-4" />
            Filtres
          </button>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select
              defaultValue={filters.status ?? ''}
              onChange={(e) => router.get(route('taches.index'), { ...filters, status: e.target.value }, { preserveState: true, replace: true })}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Tous statuts</option>
              {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            <select
              defaultValue={filters.priority ?? ''}
              onChange={(e) => router.get(route('taches.index'), { ...filters, priority: e.target.value }, { preserveState: true, replace: true })}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Toutes priorités</option>
              {Object.entries(PRIORITY_CONFIG).map(([val, { label }]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            <input
              type="date"
              defaultValue={filters.due_from ?? ''}
              onChange={(e) => router.get(route('taches.index'), { ...filters, due_from: e.target.value }, { preserveState: true, replace: true })}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Échéance depuis"
            />

            <button
              onClick={() => router.get(route('taches.index'), {}, { preserveState: true, replace: true })}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        )}

        {/* Barre actions groupées */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 mb-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              {selected.size} sélectionnée(s)
            </span>
            <div className="flex gap-2 ml-auto">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Action groupée…</option>
                <option value="delete">Supprimer</option>
              </select>
              <button
                onClick={applyBulkAction}
                disabled={!bulkAction}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {/* Checkbox tout sélectionner */}
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  {COLUMNS.map((col) => (
                    <SortHeader
                      key={col.key}
                      column={col}
                      currentSort={sort.key}
                      currentDir={sort.dir}
                      onSort={handleSort}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.data?.length > 0 ? (
                  tasks.data.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      selected={selected.has(task.id)}
                      onSelect={toggleSelect}
                      onEdit={openEdit}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-16 text-center text-gray-400 dark:text-gray-500">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Aucune tâche trouvée</p>
                      <p className="text-sm mt-1">Modifiez vos filtres ou créez une nouvelle tâche</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {tasks.last_page > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tasks.from}–{tasks.to} sur {tasks.total}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: tasks.last_page }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => router.get(route('taches.index'), { ...filters, page }, { preserveState: true, replace: true })}
                    className={`
                      w-8 h-8 rounded-lg text-sm font-medium transition-colors
                      ${tasks.current_page === page
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
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
    </AuthLayout>
  );
}
export { TachesListe };
