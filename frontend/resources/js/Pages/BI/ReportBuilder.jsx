/**
 * ReportBuilder — Interface drag-and-drop de construction de rapports BI
 * IBIG SECRETIS
 */
import React, { useState, useCallback, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, Save, Eye, Plus, Trash2, Settings, Clock, LayoutGrid } from 'lucide-react';
import MetricsPicker, { METRICS_CATALOG } from '../../Components/BI/MetricsPicker';
import ChartBlock from '../../Components/BI/ChartBlock';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Mock data par métrique
// ---------------------------------------------------------------------------
const MOCK_DATA = {
    correspondence: {
        time_series: Array.from({ length: 14 }, (_, i) => ({ period: `J-${14 - i}`, total: Math.floor(Math.random() * 12) + 2, incoming: Math.floor(Math.random() * 8), outgoing: Math.floor(Math.random() * 5) })),
        by_urgency: [{ name: 'Haute', value: 34 }, { name: 'Normale', value: 167 }, { name: 'Basse', value: 46 }],
        top_senders: [{ sender: 'Ministère Budget', total: 28 }, { sender: 'Banque Atlantique', total: 22 }, { sender: 'Dir. Impôts', total: 19 }],
        'summary.sla_rate': 87.3,
        'summary.total': 247,
    },
    tasks: {
        created_vs_done: Array.from({ length: 6 }, (_, i) => ({ period: `Sem ${i + 1}`, created: Math.floor(Math.random() * 20) + 20, completed: Math.floor(Math.random() * 15) + 15 })),
        by_priority: [{ name: 'Haute', value: 42 }, { name: 'Normale', value: 98 }, { name: 'Basse', value: 43 }],
        'summary.completion_rate': 77.0,
        'summary.overdue': 12,
    },
    meetings: {
        by_period: Array.from({ length: 6 }, (_, i) => ({ period: `Sem ${i + 1}`, total: Math.floor(Math.random() * 8) + 10 })),
        decisions: [{ name: 'Action', value: 89 }, { name: 'Information', value: 67 }, { name: 'Validation', value: 48 }],
        'summary.acceptance_rate': 83.4,
    },
    accounting: {
        revenue_by_month: Array.from({ length: 6 }, (_, i) => ({ month: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'][i], invoiced: Math.random() * 5e6 + 12e6, collected: Math.random() * 4e6 + 9e6 })),
        'summary.dso_days': 28.3,
    },
};

function getMockData(module, metricId) {
    return MOCK_DATA[module]?.[metricId] ?? [{ period: 'Exemple', total: 42 }];
}

// ---------------------------------------------------------------------------
// Bloc de rapport (élément du canvas)
// ---------------------------------------------------------------------------
function ReportBlock({ block, index, onRemove, onUpdate, onChangeType }) {
    return (
        <div className="group relative">
            <ChartBlock
                type={block.chartType}
                data={block.data}
                title={block.title}
                color={block.color}
                draggable
                onRemove={() => onRemove(index)}
                onChangeType={(t) => onChangeType(index, t)}
                className="h-64"
            />
            {/* Config overlay */}
            <div className="absolute top-10 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <select
                    value={block.color}
                    onChange={e => onUpdate(index, { color: e.target.value })}
                    className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white shadow"
                >
                    {['#1d4ed8', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2'].map(c => (
                        <option key={c} value={c} style={{ background: c, color: 'white' }}>{c}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Modal de planification
// ---------------------------------------------------------------------------
function ScheduleModal({ open, onClose, onSave }) {
    const [cron, setCron] = useState('0 8 * * 1');
    const PRESETS = [
        { label: 'Chaque lundi à 8h',    value: '0 8 * * 1' },
        { label: 'Chaque jour à 7h',     value: '0 7 * * *' },
        { label: '1er du mois à 9h',     value: '0 9 1 * *' },
        { label: 'Tous les vendredis',   value: '0 17 * * 5' },
    ];

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="font-bold text-slate-800 mb-1">Planifier l'envoi automatique</h3>
                <p className="text-xs text-slate-500 mb-5">Le rapport sera généré et envoyé selon la planification.</p>

                <label className="block text-xs font-medium text-slate-600 mb-1">Préréglages</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {PRESETS.map(p => (
                        <button key={p.value} onClick={() => setCron(p.value)}
                            className={`text-xs px-3 py-2 rounded-lg border text-left ${cron === p.value ? 'border-purple-600 bg-purple-50 text-purple-700 font-semibold' : 'border-slate-200 hover:border-slate-300'}`}>
                            {p.label}
                        </button>
                    ))}
                </div>

                <label className="block text-xs font-medium text-slate-600 mb-1">Expression CRON personnalisée</label>
                <input value={cron} onChange={e => setCron(e.target.value)}
                    className="w-full font-mono text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 mb-1" />
                <p className="text-[10px] text-slate-400 mb-5">Format : min heure jour mois jour-semaine</p>

                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">Annuler</button>
                    <button onClick={() => { onSave(cron); onClose(); }} className="px-4 py-2 text-sm rounded-lg bg-purple-700 text-white hover:bg-purple-800">
                        Enregistrer la planification
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page principale Report Builder
// ---------------------------------------------------------------------------
export default function ReportBuilder() {
    const [blocks, setBlocks]         = useState([]);
    const [reportName, setReportName] = useState('Nouveau rapport');
    const [isDraggingOver, setDragOver]= useState(false);
    const [saving, setSaving]         = useState(false);
    const [saved, setSaved]           = useState(false);
    const [scheduleOpen, setSchedule] = useState(false);
    const [scheduleCron, setCron]     = useState(null);
    const [preview, setPreview]       = useState(false);

    const canvasRef = useRef(null);

    // --- Drag over canvas ---
    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        try {
            const { module, metric } = JSON.parse(e.dataTransfer.getData('application/json'));
            const data = getMockData(module, metric.id);
            setBlocks(prev => [...prev, {
                id:        Date.now(),
                module,
                metricId:  metric.id,
                title:     metric.label,
                chartType: metric.type,
                data,
                color:     METRICS_CATALOG.find(m => m.module === module)?.color ?? '#1d4ed8',
            }]);
        } catch {}
    }, []);

    const removeBlock   = (i) => setBlocks(prev => prev.filter((_, idx) => idx !== i));
    const updateBlock   = (i, patch) => setBlocks(prev => prev.map((b, idx) => idx === i ? { ...b, ...patch } : b));
    const changeType    = (i, type) => updateBlock(i, { chartType: type });

    // --- Sauvegarder ---
    const handleSave = async () => {
        setSaving(true);
        try {
            const config = {
                blocks: blocks.map(b => ({ module: b.module, metricId: b.metricId, chartType: b.chartType, color: b.color, title: b.title })),
            };
            await axios.post('/api/bi/reports', {
                name:     reportName,
                config,
                schedule: scheduleCron,
                is_public: false,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm z-10">
                <Link href="/bi" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft size={16} /></Link>
                <LayoutGrid size={16} className="text-purple-700" />

                <input
                    value={reportName}
                    onChange={e => setReportName(e.target.value)}
                    className="font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-purple-500 focus:outline-none px-1 py-0.5 text-sm w-64"
                />

                <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => setPreview(p => !p)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border ${preview ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Eye size={13} /> {preview ? 'Éditer' : 'Prévisualiser'}
                    </button>

                    <button onClick={() => setSchedule(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                        <Clock size={13} /> {scheduleCron ? `Planifié : ${scheduleCron}` : 'Planifier'}
                    </button>

                    <button onClick={handleSave} disabled={saving || blocks.length === 0}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-60">
                        <Save size={13} /> {saving ? 'Enregistrement…' : saved ? '✓ Enregistré' : 'Sauvegarder'}
                    </button>
                </div>
            </div>

            {/* Layout principal : picker gauche + canvas central */}
            <div className="flex flex-1 overflow-hidden">
                {/* Panel métriques */}
                {!preview && (
                    <div className="w-64 shrink-0 overflow-y-auto bg-white border-r border-slate-200 shadow-sm">
                        <MetricsPicker onDragStart={() => {}} onMetricClick={({ module, metric }) => {
                            const data = getMockData(module, metric.id);
                            setBlocks(prev => [...prev, {
                                id: Date.now(), module, metricId: metric.id,
                                title: metric.label, chartType: metric.type, data,
                                color: METRICS_CATALOG.find(m => m.module === module)?.color ?? '#1d4ed8',
                            }]);
                        }} />
                    </div>
                )}

                {/* Canvas de rapport */}
                <div
                    ref={canvasRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex-1 overflow-y-auto p-6 transition-colors ${isDraggingOver ? 'bg-purple-50 ring-2 ring-inset ring-purple-300' : ''}`}
                >
                    {blocks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-24">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                <Plus size={24} className="text-slate-300" />
                            </div>
                            <p className="font-semibold text-slate-600 mb-1">Canvas vide</p>
                            <p className="text-sm">Glissez des métriques depuis le panneau gauche<br/>ou cliquez dessus pour les ajouter.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {blocks.map((block, i) => (
                                <ReportBlock
                                    key={block.id}
                                    block={block}
                                    index={i}
                                    onRemove={removeBlock}
                                    onUpdate={updateBlock}
                                    onChangeType={changeType}
                                />
                            ))}

                            {/* Zone d'ajout */}
                            {!preview && (
                                <div className="border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center h-64 text-slate-300 hover:border-purple-300 hover:text-purple-400 transition-colors cursor-pointer"
                                    onClick={() => {}}>
                                    <div className="text-center">
                                        <Plus size={24} className="mx-auto mb-2" />
                                        <p className="text-xs">Glisser une métrique ici</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Barre de statut */}
            <div className="bg-white border-t border-slate-200 px-6 py-2 flex items-center gap-4 text-xs text-slate-500">
                <span>{blocks.length} bloc{blocks.length > 1 ? 's' : ''}</span>
                {scheduleCron && <span className="text-purple-600 font-medium">⏰ Planifié : {scheduleCron}</span>}
                {saved && <span className="text-green-600 font-medium">✓ Rapport sauvegardé</span>}
            </div>

            {/* Modal planification */}
            <ScheduleModal
                open={scheduleOpen}
                onClose={() => setSchedule(false)}
                onSave={setCron}
            />
        </div>
    );
}
export { ReportBuilder };
