/**
 * Reports/Builder.jsx — Report Builder drag-and-drop SECRETIS ERP
 *
 * 3 panneaux :
 *   - Gauche  : colonnes disponibles (draggables depuis le module sélectionné)
 *   - Centre  : colonnes sélectionnées (réordonnables) + filtres + tri
 *   - Droite  : nom, export, planification, aperçu
 *
 * Dépendances : @dnd-kit/core  @dnd-kit/sortable  @dnd-kit/utilities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import {
    DndContext,
    closestCenter,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Bars3Icon,
    XMarkIcon,
    PlusIcon,
    EyeSlashIcon,
    EyeIcon,
    ArrowDownTrayIcon,
    ArrowPathIcon,
    CalendarDaysIcon,
    ClipboardDocumentListIcon,
    UsersIcon,
    IdentificationIcon,
    BanknotesIcon,
    TruckIcon,
    DocumentIcon,
    SparklesIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    TrashIcon,
    BookmarkIcon,
    ShareIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MODULE_ICONS = {
    events:     CalendarDaysIcon,
    tasks:      ClipboardDocumentListIcon,
    visitors:   UsersIcon,
    hr:         IdentificationIcon,
    accounting: BanknotesIcon,
    fleet:      TruckIcon,
    documents:  DocumentIcon,
    quality:    SparklesIcon,
};

const TYPE_ICONS = {
    string:   '💬',
    number:   '🔢',
    datetime: '📅',
    date:     '📅',
    enum:     '🏷',
    boolean:  '✅',
};

const OPERATORS = [
    { value: '=',        label: '=' },
    { value: '!=',       label: '≠' },
    { value: '>',        label: '>' },
    { value: '>=',       label: '≥' },
    { value: '<',        label: '<' },
    { value: '<=',       label: '≤' },
    { value: 'contains', label: 'contient' },
    { value: 'starts',   label: 'commence par' },
    { value: 'between',  label: 'entre' },
    { value: 'null',     label: 'est vide' },
    { value: 'not_null', label: 'n\'est pas vide' },
];

const FORMAT_LABELS = { pdf: 'PDF', excel: 'Excel', csv: 'CSV', json: 'JSON' };
const FORMAT_COLORS = {
    pdf:   'bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-700',
    excel: 'bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-700',
    csv:   'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-700',
    json:  'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-700',
};

// ─── Draggable depuis la liste des disponibles ────────────────────────────────

function AvailableColumnItem({ col, onAdd }) {
    return (
        <button
            onClick={() => onAdd(col)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-[#2E86C1]/10 hover:text-[#2E86C1] transition-colors group border border-transparent hover:border-[#2E86C1]/20"
        >
            <span className="text-base leading-none">{TYPE_ICONS[col.type] || '💬'}</span>
            <span className="flex-1 font-medium">{col.label}</span>
            <PlusIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </button>
    );
}

// ─── Colonne sélectionnée (sortable) ─────────────────────────────────────────

function SortableColumn({ col, onToggleVisible, onLabelChange, onWidthChange, onRemove }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: col.field });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 shadow-sm"
        >
            {/* Drag handle */}
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none">
                <Bars3Icon className="w-4 h-4" />
            </button>

            {/* Type icon */}
            <span className="text-sm">{TYPE_ICONS[col.type] || '💬'}</span>

            {/* Label éditable */}
            <input
                value={col.label}
                onChange={e => onLabelChange(col.field, e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-0 min-w-0"
            />

            {/* Largeur */}
            <input
                type="number"
                value={col.width || 150}
                onChange={e => onWidthChange(col.field, parseInt(e.target.value) || 150)}
                className="w-16 text-xs text-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#2E86C1]"
                min={60}
                max={500}
            />
            <span className="text-xs text-gray-400">px</span>

            {/* Visible toggle */}
            <button
                onClick={() => onToggleVisible(col.field)}
                className={`p-1 rounded transition-colors ${
                    col.visible !== false
                        ? 'text-[#2E86C1] hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        : 'text-gray-300 hover:text-gray-500'
                }`}
                title={col.visible !== false ? 'Masquer' : 'Afficher'}
            >
                {col.visible !== false ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
            </button>

            {/* Remove */}
            <button
                onClick={() => onRemove(col.field)}
                className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Retirer"
            >
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─── Filtre ──────────────────────────────────────────────────────────────────

function FilterRow({ filter, availableColumns, index, onChange, onRemove }) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <select
                value={filter.field}
                onChange={e => onChange(index, 'field', e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
            >
                <option value="">Colonne...</option>
                {availableColumns.map(c => (
                    <option key={c.field} value={c.field}>{c.label}</option>
                ))}
            </select>

            <select
                value={filter.operator}
                onChange={e => onChange(index, 'operator', e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
            >
                {OPERATORS.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                ))}
            </select>

            {! ['null', 'not_null'].includes(filter.operator) && (
                <input
                    type="text"
                    value={filter.value || ''}
                    onChange={e => onChange(index, 'value', e.target.value)}
                    placeholder="Valeur..."
                    className="flex-1 min-w-[120px] text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
                />
            )}

            <button onClick={() => onRemove(index)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─── Aperçu ──────────────────────────────────────────────────────────────────

function PreviewTable({ data, columns, total, loading }) {
    if (loading) {
        return (
            <div className="space-y-2 animate-pulse">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded" />
                ))}
            </div>
        );
    }

    if (! data || data.length === 0) {
        return <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Aucune donnée à afficher.</p>;
    }

    const visibleCols = columns.filter(c => c.visible !== false);

    return (
        <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                {total?.toLocaleString('fr-FR')} résultats au total — Affichage des {data.length} premiers
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            {visibleCols.map(c => (
                                <th key={c.field} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {data.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                {visibleCols.map(c => (
                                    <td key={c.field} className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                                        {row[c.field] ?? <span className="text-gray-300">—</span>}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Builder({ report = null, modules = {} }) {
    const isEdit = !! report;

    // Config du rapport
    const [name, setName]             = useState(report?.name || '');
    const [description, setDesc]      = useState(report?.description || '');
    const [module, setModule]         = useState(report?.module || Object.keys(modules)[0] || 'events');
    const [columns, setColumns]       = useState(report?.columns || []);
    const [filters, setFilters]       = useState(report?.filters || []);
    const [sort, setSort]             = useState(report?.sort || [{ field: '', direction: 'desc' }]);
    const [isShared, setIsShared]     = useState(report?.is_shared || false);
    const [isTemplate, setIsTemplate] = useState(report?.is_template || false);
    const [schedule, setSchedule]     = useState(report?.schedule || null);

    // UI states
    const [previewData, setPreviewData]   = useState(null);
    const [previewTotal, setPreviewTotal] = useState(0);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [showPreview, setShowPreview]   = useState(false);
    const [showSchedule, setShowSchedule] = useState(!! report?.schedule);
    const [saving, setSaving]             = useState(false);
    const [exporting, setExporting]       = useState(null);
    const [toast, setToast]               = useState(null);
    const [activeId, setActiveId]         = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    // Colonnes disponibles pour le module actif
    const availableModuleColumns = modules[module]?.columns || [];
    const selectedFields = new Set(columns.map(c => c.field));
    const unselectedColumns = availableModuleColumns.filter(c => ! selectedFields.has(c.field));

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    // ─── Gestion des colonnes ─────────────────────────────────────────────────

    const addColumn = (col) => {
        setColumns(prev => [...prev, { ...col, visible: true, width: col.width || 150 }]);
    };

    const removeColumn = (field) => {
        setColumns(prev => prev.filter(c => c.field !== field));
    };

    const toggleVisible = (field) => {
        setColumns(prev => prev.map(c =>
            c.field === field ? { ...c, visible: c.visible === false ? true : false } : c
        ));
    };

    const updateLabel = (field, label) => {
        setColumns(prev => prev.map(c => c.field === field ? { ...c, label } : c));
    };

    const updateWidth = (field, width) => {
        setColumns(prev => prev.map(c => c.field === field ? { ...c, width } : c));
    };

    const handleDragEnd = ({ active, over }) => {
        if (active.id !== over?.id) {
            const oldIdx = columns.findIndex(c => c.field === active.id);
            const newIdx = columns.findIndex(c => c.field === over.id);
            setColumns(arrayMove(columns, oldIdx, newIdx));
        }
        setActiveId(null);
    };

    // ─── Filtres ──────────────────────────────────────────────────────────────

    const addFilter = () => {
        setFilters(prev => [...prev, { field: '', operator: '=', value: '' }]);
    };

    const updateFilter = (index, key, value) => {
        setFilters(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f));
    };

    const removeFilter = (index) => {
        setFilters(prev => prev.filter((_, i) => i !== index));
    };

    // ─── Aperçu ───────────────────────────────────────────────────────────────

    const handlePreview = async () => {
        if (columns.length === 0) {
            showToast('Ajoutez au moins une colonne pour prévisualiser.', 'error');
            return;
        }

        setPreviewLoading(true);
        setShowPreview(true);

        try {
            const { data } = await axios.post('/api/v1/report-builder/preview', {
                module,
                columns,
                filters: filters.filter(f => f.field),
                sort: sort.filter(s => s.field),
            });

            setPreviewData(data.data);
            setPreviewTotal(data.total);
        } catch (e) {
            showToast('Erreur lors de la prévisualisation.', 'error');
        } finally {
            setPreviewLoading(false);
        }
    };

    // ─── Export ───────────────────────────────────────────────────────────────

    const handleExport = async (format) => {
        if (! report) {
            showToast('Enregistrez d\'abord le rapport pour l\'exporter.', 'error');
            return;
        }

        setExporting(format);
        try {
            const { data } = await axios.post(`/api/v1/report-builder/reports/${report.id}/run`, { format });
            showToast(`Génération ${FORMAT_LABELS[format]} démarrée (ID: ${data.run_id}). Prêt dans quelques instants.`);

            // Polling jusqu'à completed
            const poll = setInterval(async () => {
                const { data: status } = await axios.get(`/api/v1/report-builder/runs/${data.run_id}/status`);
                if (status.status === 'completed') {
                    clearInterval(poll);
                    setExporting(null);
                    window.open(`/api/v1/report-builder/runs/${data.run_id}/download`, '_blank');
                } else if (status.status === 'failed') {
                    clearInterval(poll);
                    setExporting(null);
                    showToast('Erreur lors de la génération du fichier.', 'error');
                }
            }, 2000);
        } catch {
            showToast('Erreur lors du démarrage de l\'export.', 'error');
            setExporting(null);
        }
    };

    // ─── Sauvegarde ───────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (! name.trim()) {
            showToast('Donnez un nom à votre rapport.', 'error');
            return;
        }
        if (columns.length === 0) {
            showToast('Sélectionnez au moins une colonne.', 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                description,
                module,
                columns,
                filters: filters.filter(f => f.field),
                sort: sort.filter(s => s.field),
                is_shared: isShared,
                is_template: isTemplate,
                schedule: showSchedule ? schedule : null,
            };

            if (isEdit) {
                await axios.put(`/api/v1/report-builder/reports/${report.id}`, payload);
                showToast('Rapport mis à jour.');
            } else {
                const { data } = await axios.post('/api/v1/report-builder/reports', payload);
                showToast('Rapport enregistré.');
                router.visit(`/report-builder/${data.report.id}/edit`);
            }
        } catch (e) {
            showToast(e.response?.data?.message || 'Erreur lors de la sauvegarde.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    const activeColumn = activeId ? columns.find(c => c.field === activeId) : null;

    return (
        <AppLayout>
            <Head title={isEdit ? `Modifier : ${report.name}` : 'Nouveau rapport'} />

            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
                    toast.type === 'error'
                        ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
                        : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
                }`}>
                    <CheckCircleIcon className="w-4 h-4" />
                    {toast.msg}
                </div>
            )}

            <div className="h-[calc(100vh-64px)] flex flex-col">

                {/* Topbar */}
                <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                    <div>
                        <h1 className="font-bold text-gray-900 dark:text-white">
                            {isEdit ? 'Modifier le rapport' : 'Nouveau rapport'}
                        </h1>
                        <p className="text-xs text-gray-400">Glissez-déposez les colonnes pour construire votre rapport</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2E86C1] hover:bg-[#2574a9] text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
                        >
                            {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <BookmarkIcon className="w-4 h-4" />}
                            {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </div>

                {/* Contenu — 3 panneaux */}
                <div className="flex flex-1 overflow-hidden">

                    {/* ── Panneau gauche : colonnes disponibles (280px) ── */}
                    <aside className="w-72 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                Module source
                            </label>
                            <select
                                value={module}
                                onChange={e => { setModule(e.target.value); setColumns([]); setFilters([]); }}
                                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
                            >
                                {Object.entries(modules).map(([key, mod]) => {
                                    const Icon = MODULE_ICONS[key];
                                    return <option key={key} value={key}>{mod.label}</option>;
                                })}
                            </select>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                Colonnes disponibles ({unselectedColumns.length})
                            </p>
                            <div className="space-y-1">
                                {unselectedColumns.map(col => (
                                    <AvailableColumnItem key={col.field} col={col} onAdd={addColumn} />
                                ))}
                                {unselectedColumns.length === 0 && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-4">
                                        Toutes les colonnes sont sélectionnées
                                    </p>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* ── Panneau central : construction du rapport ── */}
                    <main className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Colonnes sélectionnées */}
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Colonnes sélectionnées ({columns.length})
                                </h2>
                                {columns.length > 0 && (
                                    <button
                                        onClick={() => setColumns([])}
                                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                    >
                                        Tout effacer
                                    </button>
                                )}
                            </div>

                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={({ active }) => setActiveId(active.id)}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={columns.map(c => c.field)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-2 min-h-[80px] p-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                                        {columns.length === 0 && (
                                            <div className="flex items-center justify-center h-16 text-sm text-gray-400 dark:text-gray-500">
                                                Cliquez sur une colonne à gauche pour l'ajouter
                                            </div>
                                        )}
                                        {columns.map(col => (
                                            <SortableColumn
                                                key={col.field}
                                                col={col}
                                                onToggleVisible={toggleVisible}
                                                onLabelChange={updateLabel}
                                                onWidthChange={updateWidth}
                                                onRemove={removeColumn}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>

                                <DragOverlay>
                                    {activeColumn && (
                                        <div className="flex items-center gap-2 bg-white dark:bg-gray-700 border-2 border-[#2E86C1] rounded-lg px-3 py-2 shadow-xl">
                                            <Bars3Icon className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm">{TYPE_ICONS[activeColumn.type]}</span>
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{activeColumn.label}</span>
                                        </div>
                                    )}
                                </DragOverlay>
                            </DndContext>
                        </section>

                        {/* Filtres */}
                        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtres</h2>
                                <button
                                    onClick={addFilter}
                                    className="flex items-center gap-1 text-xs text-[#2E86C1] hover:underline"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" /> Ajouter un filtre
                                </button>
                            </div>
                            <div className="space-y-2">
                                {filters.length === 0 && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">Aucun filtre — afficher toutes les données.</p>
                                )}
                                {filters.map((filter, i) => (
                                    <FilterRow
                                        key={i}
                                        filter={filter}
                                        index={i}
                                        availableColumns={availableModuleColumns}
                                        onChange={updateFilter}
                                        onRemove={removeFilter}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* Tri */}
                        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tri</h2>
                            <div className="flex items-center gap-2 flex-wrap">
                                <select
                                    value={sort[0]?.field || ''}
                                    onChange={e => setSort([{ field: e.target.value, direction: sort[0]?.direction || 'desc' }])}
                                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
                                >
                                    <option value="">Aucun tri</option>
                                    {availableModuleColumns.filter(c => c.sortable).map(c => (
                                        <option key={c.field} value={c.field}>{c.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={sort[0]?.direction || 'desc'}
                                    onChange={e => setSort(prev => [{ ...prev[0], direction: e.target.value }])}
                                    disabled={! sort[0]?.field}
                                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E86C1] disabled:opacity-40"
                                >
                                    <option value="asc">Croissant (A→Z)</option>
                                    <option value="desc">Décroissant (Z→A)</option>
                                </select>
                            </div>
                        </section>

                    </main>

                    {/* ── Panneau droit : settings & export (300px) ── */}
                    <aside className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-800">
                        <div className="p-4 space-y-5">

                            {/* Nom & description */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                        Nom du rapport *
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Ex : Tâches urgentes par assigné"
                                        className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDesc(e.target.value)}
                                        rows={2}
                                        placeholder="Description optionnelle..."
                                        className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E86C1] resize-none"
                                    />
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`relative w-9 h-5 rounded-full transition-colors ${isShared ? 'bg-[#2E86C1]' : 'bg-gray-200 dark:bg-gray-600'}`}
                                         onClick={() => setIsShared(!isShared)}>
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isShared ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                        <ShareIcon className="w-4 h-4" /> Partager avec l'organisation
                                    </span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`relative w-9 h-5 rounded-full transition-colors ${isTemplate ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                                         onClick={() => setIsTemplate(!isTemplate)}>
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isTemplate ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                        <SparklesIcon className="w-4 h-4" /> Enregistrer comme template
                                    </span>
                                </label>
                            </div>

                            {/* Prévisualisation */}
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                <button
                                    onClick={handlePreview}
                                    disabled={previewLoading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#2E86C1] text-[#2E86C1] hover:bg-blue-50 dark:hover:bg-blue-900/10 text-sm font-semibold transition-colors disabled:opacity-60"
                                >
                                    {previewLoading
                                        ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Chargement...</>
                                        : <><EyeIcon className="w-4 h-4" /> Prévisualiser (10 lignes)</>
                                    }
                                </button>
                            </div>

                            {/* Export */}
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Exporter</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(FORMAT_LABELS).map(([fmt, label]) => (
                                        <button
                                            key={fmt}
                                            onClick={() => handleExport(fmt)}
                                            disabled={!! exporting}
                                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50 ${FORMAT_COLORS[fmt]}`}
                                        >
                                            {exporting === fmt
                                                ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                                : <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                            }
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Planification */}
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                <button
                                    onClick={() => setShowSchedule(!showSchedule)}
                                    className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300"
                                >
                                    <span className="flex items-center gap-2">
                                        <CalendarDaysIcon className="w-4 h-4" /> Planifier l'envoi
                                    </span>
                                    {showSchedule ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                </button>

                                {showSchedule && (
                                    <div className="mt-3 space-y-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Fréquence</label>
                                            <select
                                                value={schedule?.frequency || 'weekly'}
                                                onChange={e => setSchedule(s => ({ ...(s || {}), frequency: e.target.value }))}
                                                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
                                            >
                                                <option value="daily">Quotidien</option>
                                                <option value="weekly">Hebdomadaire</option>
                                                <option value="monthly">Mensuel</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Heure d'envoi</label>
                                            <input
                                                type="time"
                                                value={schedule?.time || '08:00'}
                                                onChange={e => setSchedule(s => ({ ...(s || {}), time: e.target.value }))}
                                                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Destinataires (emails)</label>
                                            <textarea
                                                placeholder="email1@ex.com, email2@ex.com"
                                                value={(schedule?.recipients || []).join(', ')}
                                                onChange={e => setSchedule(s => ({
                                                    ...(s || {}),
                                                    recipients: e.target.value.split(',').map(v => v.trim()).filter(Boolean),
                                                }))}
                                                rows={2}
                                                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E86C1] resize-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                </div>

                {/* Aperçu expandable en bas */}
                {showPreview && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 flex-shrink-0 max-h-72 overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Aperçu des données</h3>
                            <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <PreviewTable
                            data={previewData}
                            columns={columns}
                            total={previewTotal}
                            loading={previewLoading}
                        />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
