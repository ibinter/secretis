/**
 * SavedReports — Grille des rapports BI sauvegardés
 * IBIG SECRETIS
 */
import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    BarChart2, Play, Edit2, Copy, Trash2, Clock, ArrowLeft,
    Plus, Calendar, CheckCircle, AlertCircle, Search,
} from 'lucide-react';
import { useSavedReports } from '../../hooks/useBiData';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_REPORTS = [
    {
        id: 1, name: 'Rapport mensuel DG', description: 'Synthèse courrier, réunions et tâches pour la Direction Générale.',
        module: 'correspondence', schedule: '0 8 1 * *', last_run_at: '2026-07-01T08:02:00Z',
        is_public: true, created_by: { first_name: 'Jean-Paul', last_name: 'Kouassi' },
    },
    {
        id: 2, name: 'Suivi RH hebdomadaire', description: 'Absentéisme, congés en attente et notes de frais par département.',
        module: 'hr', schedule: '0 7 * * 1', last_run_at: '2026-07-14T07:05:00Z',
        is_public: false, created_by: { first_name: 'Adama', last_name: 'Coulibaly' },
    },
    {
        id: 3, name: 'Performance équipes projets', description: 'Taux de complétion des tâches par projet et par assigné.',
        module: 'tasks', schedule: null, last_run_at: '2026-07-10T14:30:00Z',
        is_public: false, created_by: { first_name: 'Awa', last_name: 'Diallo' },
    },
    {
        id: 4, name: 'Tableau de bord comptable', description: 'DSO, recouvrement, top clients et dépenses par catégorie.',
        module: 'accounting', schedule: '0 9 1 * *', last_run_at: '2026-07-01T09:10:00Z',
        is_public: true, created_by: { first_name: 'Mariame', last_name: 'Traoré' },
    },
    {
        id: 5, name: 'Analyse visiteurs — juillet', description: 'Flux, motifs, heures de pointe et temps d\'attente pour le mois de juillet.',
        module: 'visitors', schedule: null, last_run_at: '2026-07-18T11:00:00Z',
        is_public: false, created_by: { first_name: 'Cédric', last_name: 'Mensah' },
    },
    {
        id: 6, name: 'Réunions et décisions T3', description: 'Comptes rendus, taux d\'acceptation et décisions du trimestre.',
        module: 'meetings', schedule: '0 8 1 */3 *', last_run_at: '2026-07-01T08:15:00Z',
        is_public: true, created_by: { first_name: 'Jean-Paul', last_name: 'Kouassi' },
    },
];

const MODULE_COLORS = {
    correspondence: '#1d4ed8', tasks: '#16a34a', meetings: '#7c3aed',
    hr: '#dc2626', visitors: '#0891b2', accounting: '#d97706',
};
const MODULE_LABELS = {
    correspondence: 'Courrier', tasks: 'Tâches', meetings: 'Réunions',
    hr: 'RH', visitors: 'Visiteurs', accounting: 'Comptabilité',
};

function getNextRun(schedule) {
    if (!schedule) return null;
    // Simulation simplifiée
    return 'Lun. 28 juil. à 08:00';
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Card rapport
// ---------------------------------------------------------------------------
function ReportCard({ report, onRun, onDuplicate, onDelete }) {
    const [running, setRunning] = useState(false);
    const color    = MODULE_COLORS[report.module] ?? '#64748b';
    const nextRun  = getNextRun(report.schedule);

    const handleRun = async () => {
        setRunning(true);
        await onRun(report.id);
        setRunning(false);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
            {/* Barre de couleur */}
            <div className="h-1" style={{ background: color }} />

            <div className="p-5 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: color + '18', color }}>
                            {MODULE_LABELS[report.module] ?? report.module}
                        </span>
                        {report.is_public && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">Public</span>
                        )}
                    </div>
                    {report.schedule && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium shrink-0">
                            <Clock size={10} /> Planifié
                        </span>
                    )}
                </div>

                <h3 className="font-semibold text-slate-800 mb-1 leading-snug">{report.name}</h3>
                {report.description && <p className="text-xs text-slate-500 mb-4 line-clamp-2">{report.description}</p>}

                {/* Infos */}
                <div className="mt-auto space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <CheckCircle size={11} />
                        <span>Dernière exécution : {formatDate(report.last_run_at)}</span>
                    </div>
                    {nextRun && (
                        <div className="flex items-center gap-1.5 text-xs text-purple-600">
                            <Calendar size={11} />
                            <span>Prochaine : {nextRun}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <span>par {report.created_by?.first_name} {report.created_by?.last_name}</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-100 px-5 py-3 flex items-center gap-2">
                <button onClick={handleRun} disabled={running}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-700 text-white rounded-lg hover:bg-purple-800 disabled:opacity-60 font-medium">
                    <Play size={11} /> {running ? 'Exécution…' : 'Exécuter'}
                </button>

                <Link href={`/bi/reports/${report.id}/edit`}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200">
                    <Edit2 size={11} /> Modifier
                </Link>

                <button onClick={() => onDuplicate(report)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200">
                    <Copy size={11} /> Dupliquer
                </button>

                <button onClick={() => onDelete(report.id)}
                    className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg border border-red-100">
                    <Trash2 size={11} />
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
export default function SavedReports() {
    const [search, setSearch]   = useState('');
    const [filter, setFilter]   = useState('all');
    const queryClient           = useQueryClient();

    // En prod: const { data, isLoading } = useSavedReports();
    const reports = MOCK_REPORTS;

    const filtered = reports.filter(r => {
        const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
                            (r.description ?? '').toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || (filter === 'scheduled' && r.schedule) || (filter === 'public' && r.is_public);
        return matchSearch && matchFilter;
    });

    const handleRun = async (id) => {
        try {
            await axios.get(`/api/bi/reports/${id}/run`);
            queryClient.invalidateQueries(['bi', 'saved-reports']);
        } catch (e) { console.error(e); }
    };

    const handleDuplicate = async (report) => {
        try {
            await axios.post('/api/bi/reports', {
                name:     `Copie de ${report.name}`,
                description: report.description,
                config:   report.config,
                is_public: false,
            });
            queryClient.invalidateQueries(['bi', 'saved-reports']);
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Supprimer ce rapport ?')) return;
        try {
            await axios.delete(`/api/bi/reports/${id}`);
            queryClient.invalidateQueries(['bi', 'saved-reports']);
        } catch (e) { console.error(e); }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/bi" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft size={16} /></Link>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-700 rounded-xl"><BarChart2 size={18} className="text-white" /></div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900">Rapports sauvegardés</h1>
                                <p className="text-xs text-slate-500">{reports.length} rapport{reports.length > 1 ? 's' : ''} au total</p>
                            </div>
                        </div>
                    </div>

                    <Link href="/bi/reports/build"
                        className="flex items-center gap-2 px-4 py-2 bg-purple-700 text-white text-sm rounded-xl hover:bg-purple-800 font-medium">
                        <Plus size={15} /> Nouveau rapport
                    </Link>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-6">
                {/* Filtres + Recherche */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher un rapport…"
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </div>

                    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                        {[
                            { value: 'all', label: 'Tous' },
                            { value: 'scheduled', label: 'Planifiés' },
                            { value: 'public', label: 'Publics' },
                        ].map(f => (
                            <button key={f.value} onClick={() => setFilter(f.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.value ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grille */}
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Aucun rapport trouvé</p>
                        <p className="text-sm mt-1">Essayez d'autres termes ou créez un nouveau rapport.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map(report => (
                            <ReportCard
                                key={report.id}
                                report={report}
                                onRun={handleRun}
                                onDuplicate={handleDuplicate}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
export { SavedReports };
