/**
 * MetricsPicker — Arbre de métriques disponibles par module
 * Source de drag-and-drop pour le Report Builder.
 */
import React, { useState, useMemo } from 'react';
import {
    Mail, CheckSquare, Users, Calendar, DollarSign, UserCheck,
    ChevronRight, ChevronDown, Search, Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Catalogue de métriques disponibles
// ---------------------------------------------------------------------------
const METRICS_CATALOG = [
    {
        module: 'correspondence',
        label: 'Courrier',
        icon: Mail,
        color: '#1d4ed8',
        metrics: [
            { id: 'time_series',      label: 'Volume par période',           type: 'line',  isNew: false },
            { id: 'by_urgency',       label: 'Répartition par urgence',      type: 'bar',   isNew: false },
            { id: 'processing_trend', label: 'Délai de traitement (tendance)',type: 'area',  isNew: false },
            { id: 'top_senders',      label: 'Top 5 expéditeurs',            type: 'bar',   isNew: false },
            { id: 'top_recipients',   label: 'Top 5 destinataires',          type: 'bar',   isNew: false },
            { id: 'summary.sla_rate', label: 'Taux SLA (KPI)',               type: 'kpi',   isNew: true  },
            { id: 'summary.total',    label: 'Volume total (KPI)',            type: 'kpi',   isNew: false },
        ],
    },
    {
        module: 'tasks',
        label: 'Tâches',
        icon: CheckSquare,
        color: '#16a34a',
        metrics: [
            { id: 'created_vs_done',  label: 'Créées vs Terminées',          type: 'area',  isNew: false },
            { id: 'burndown_real',    label: 'Burndown Chart',               type: 'line',  isNew: false },
            { id: 'by_assignee',      label: 'Par assigné',                  type: 'bar',   isNew: false },
            { id: 'by_priority',      label: 'Distribution par priorité',    type: 'pie',   isNew: false },
            { id: 'by_status',        label: 'Distribution par statut',      type: 'pie',   isNew: false },
            { id: 'by_project',       label: 'Taux par projet',              type: 'bar',   isNew: false },
            { id: 'summary.completion_rate', label: 'Taux de complétion (KPI)', type: 'kpi', isNew: false },
            { id: 'summary.overdue',  label: 'Tâches en retard (KPI)',       type: 'kpi',   isNew: true  },
        ],
    },
    {
        module: 'meetings',
        label: 'Réunions',
        icon: Calendar,
        color: '#7c3aed',
        metrics: [
            { id: 'by_period',        label: 'Volume par période',           type: 'bar',   isNew: false },
            { id: 'top_rooms',        label: 'Salles les plus utilisées',    type: 'bar',   isNew: false },
            { id: 'decisions',        label: 'Décisions par type',           type: 'pie',   isNew: false },
            { id: 'summary.acceptance_rate', label: "Taux d'acceptation (KPI)", type: 'kpi', isNew: false },
            { id: 'summary.with_minutes',    label: 'Avec compte rendu (KPI)', type: 'kpi', isNew: true  },
        ],
    },
    {
        module: 'hr',
        label: 'Ressources Humaines',
        icon: Users,
        color: '#dc2626',
        metrics: [
            { id: 'absence_by_dept',      label: 'Absentéisme par département', type: 'bar',  isNew: false },
            { id: 'by_leave_type',        label: 'Congés par type',             type: 'pie',  isNew: false },
            { id: 'expenses_by_category', label: 'Notes de frais par catégorie',type: 'bar',  isNew: false },
            { id: 'expenses_by_dept',     label: 'Dépenses par département',    type: 'bar',  isNew: false },
            { id: 'summary.avg_approval_hours', label: "Délai d'approbation (KPI)", type: 'kpi', isNew: true },
        ],
    },
    {
        module: 'visitors',
        label: 'Visiteurs',
        icon: UserCheck,
        color: '#0891b2',
        metrics: [
            { id: 'flux',       label: 'Flux visiteurs',             type: 'area',  isNew: false },
            { id: 'by_purpose', label: 'Motifs de visite',           type: 'bar',   isNew: false },
            { id: 'peak_hours', label: 'Heures de pointe',           type: 'bar',   isNew: true  },
            { id: 'summary.avg_wait_min', label: "Temps d'attente (KPI)", type: 'kpi', isNew: false },
        ],
    },
    {
        module: 'accounting',
        label: 'Comptabilité',
        icon: DollarSign,
        color: '#d97706',
        metrics: [
            { id: 'revenue_by_month',     label: 'Revenus mensuels',          type: 'area',  isNew: false },
            { id: 'recovery_rate',        label: 'Taux de recouvrement',      type: 'line',  isNew: false },
            { id: 'top_clients',          label: 'Top clients',               type: 'bar',   isNew: false },
            { id: 'expenses_by_category', label: 'Dépenses par catégorie',    type: 'pie',   isNew: false },
            { id: 'summary.dso_days',     label: 'DSO (KPI)',                 type: 'kpi',   isNew: true  },
            { id: 'summary.recovery_rate',label: 'Taux recouvrement % (KPI)', type: 'kpi',  isNew: false },
        ],
    },
];

// ---------------------------------------------------------------------------
// Composant MetricsPicker
// ---------------------------------------------------------------------------
export default function MetricsPicker({ onDragStart, onMetricClick, className = '' }) {
    const [search, setSearch]     = useState('');
    const [expanded, setExpanded] = useState({ correspondence: true });

    const toggleModule = (mod) => setExpanded(prev => ({ ...prev, [mod]: !prev[mod] }));

    const filtered = useMemo(() => {
        if (!search.trim()) return METRICS_CATALOG;
        const q = search.toLowerCase();
        return METRICS_CATALOG
            .map(mod => ({
                ...mod,
                metrics: mod.metrics.filter(m => m.label.toLowerCase().includes(q) || mod.label.toLowerCase().includes(q)),
            }))
            .filter(mod => mod.metrics.length > 0);
    }, [search]);

    return (
        <div className={`flex flex-col h-full bg-white border-r border-slate-200 ${className}`}>
            {/* Titre */}
            <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800">Métriques disponibles</h3>
                <p className="text-xs text-slate-400 mt-0.5">Glissez une métrique sur le canvas</p>
            </div>

            {/* Recherche */}
            <div className="px-3 py-2 border-b border-slate-100">
                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher…"
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                </div>
            </div>

            {/* Arbre de métriques */}
            <div className="flex-1 overflow-y-auto py-1">
                {filtered.map(({ module, label, icon: Icon, color, metrics }) => (
                    <div key={module}>
                        {/* En-tête module */}
                        <button
                            onClick={() => toggleModule(module)}
                            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-slate-50 text-left"
                        >
                            <span className="p-1 rounded" style={{ background: color + '20' }}>
                                <Icon size={12} style={{ color }} />
                            </span>
                            <span className="text-xs font-semibold text-slate-700 flex-1">{label}</span>
                            <span className="text-xs text-slate-400">{metrics.length}</span>
                            {expanded[module]
                                ? <ChevronDown size={12} className="text-slate-400" />
                                : <ChevronRight size={12} className="text-slate-400" />
                            }
                        </button>

                        {/* Liste des métriques */}
                        {expanded[module] && metrics.map(metric => (
                            <div
                                key={metric.id}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/json', JSON.stringify({ module, metric }));
                                    onDragStart?.({ module, metric });
                                }}
                                onClick={() => onMetricClick?.({ module, metric })}
                                className="flex items-center gap-2 mx-2 mb-0.5 px-2 py-1.5 rounded-lg cursor-grab hover:bg-purple-50 group active:cursor-grabbing"
                            >
                                {/* Indicateur de type */}
                                <span className="text-xs px-1.5 py-0.5 rounded font-mono bg-slate-100 text-slate-500 group-hover:bg-purple-100 group-hover:text-purple-700 shrink-0">
                                    {metric.type}
                                </span>
                                <span className="text-xs text-slate-600 group-hover:text-slate-900 flex-1 truncate">
                                    {metric.label}
                                </span>
                                {metric.isNew && (
                                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                                        <Sparkles size={9} /> Nouveau
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400">{METRICS_CATALOG.reduce((acc, m) => acc + m.metrics.length, 0)} métriques disponibles</p>
            </div>
        </div>
    );
}

export { METRICS_CATALOG };
export { MetricsPicker };
