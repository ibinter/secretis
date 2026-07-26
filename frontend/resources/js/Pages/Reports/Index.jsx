/**
 * Reports/Index.jsx — Centre des rapports personnalisés SECRETIS ERP
 *
 * Tabs : Mes rapports | Partagés | Planifiés | Templates
 * Section exécutions récentes avec téléchargement direct.
 */

import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import {
    PlusIcon,
    PlayIcon,
    PencilSquareIcon,
    DocumentDuplicateIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    CalendarDaysIcon,
    ClipboardDocumentListIcon,
    UsersIcon,
    IdentificationIcon,
    BanknotesIcon,
    TruckIcon,
    DocumentIcon,
    ClockIcon,
    ShareIcon,
    SparklesIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

// ─── Config ──────────────────────────────────────────────────────────────────

const MODULE_ICONS = {
    events:     { icon: CalendarDaysIcon,          color: 'text-purple-500',   bg: 'bg-purple-50 dark:bg-purple-900/20'   },
    tasks:      { icon: ClipboardDocumentListIcon,  color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-900/20'},
    visitors:   { icon: UsersIcon,                  color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20'},
    hr:         { icon: IdentificationIcon,          color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20'},
    accounting: { icon: BanknotesIcon,               color: 'text-teal-500',   bg: 'bg-teal-50 dark:bg-teal-900/20'  },
    fleet:      { icon: TruckIcon,                   color: 'text-sky-500',    bg: 'bg-sky-50 dark:bg-sky-900/20'    },
    documents:  { icon: DocumentIcon,                color: 'text-rose-500',   bg: 'bg-rose-50 dark:bg-rose-900/20'  },
    quality:    { icon: SparklesIcon,                color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20'},
};

const STATUS_CONFIG = {
    pending:    { label: 'En attente',  color: 'text-gray-500',   bg: 'bg-gray-100 dark:bg-gray-700' },
    processing: { label: 'En cours',    color: 'text-purple-600',   bg: 'bg-purple-100 dark:bg-purple-900/30' },
    completed:  { label: 'Terminé',     color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900/30' },
    failed:     { label: 'Échec',       color: 'text-red-600',    bg: 'bg-red-100 dark:bg-red-900/30' },
};

const FORMAT_LABELS = { pdf: 'PDF', excel: 'Excel', csv: 'CSV', json: 'JSON' };

const TABS = [
    { id: 'mine',      label: 'Mes rapports' },
    { id: 'shared',    label: 'Partagés' },
    { id: 'scheduled', label: 'Planifiés' },
    { id: 'templates', label: 'Templates' },
];

// ─── Composants ──────────────────────────────────────────────────────────────

function ModuleIcon({ module, size = 'md' }) {
    const cfg = MODULE_ICONS[module] || MODULE_ICONS.documents;
    const Icon = cfg.icon;
    const s = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    return (
        <span className={`inline-flex items-center justify-center rounded-lg p-1.5 ${cfg.bg}`}>
            <Icon className={`${s} ${cfg.color}`} />
        </span>
    );
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}>
            {status === 'processing' && <ArrowPathIcon className="w-3 h-3 animate-spin" />}
            {status === 'completed'  && <CheckCircleIcon className="w-3 h-3" />}
            {status === 'failed'     && <ExclamationCircleIcon className="w-3 h-3" />}
            {cfg.label}
        </span>
    );
}

function ReportCard({ report, onRun, onDelete }) {
    const [running, setRunning] = useState(false);
    const [format, setFormat]   = useState('excel');

    const handleRun = async () => {
        setRunning(true);
        try {
            await onRun(report.id, format);
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start gap-3">
                <ModuleIcon module={report.module} />
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{report.name}</h3>
                    {report.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{report.description}</p>
                    )}
                </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
                {report.is_shared && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                        <ShareIcon className="w-3 h-3" /> Partagé
                    </span>
                )}
                {report.is_scheduled && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                        <ClockIcon className="w-3 h-3" /> Planifié
                    </span>
                )}
                {report.is_template && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                        <SparklesIcon className="w-3 h-3" /> Template
                    </span>
                )}
            </div>

            {/* Meta */}
            <div className="text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
                <p>Créé par <span className="font-medium">{report.created_by}</span></p>
                {report.last_run_at && <p>Dernière exécution : {report.last_run_at}</p>}
                <p>{report.run_count} exécution{report.run_count !== 1 ? 's' : ''}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                {/* Format + Run */}
                <select
                    value={format}
                    onChange={e => setFormat(e.target.value)}
                    className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7e22ce]"
                >
                    {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>

                <button
                    onClick={handleRun}
                    disabled={running}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7e22ce] hover:bg-[#2574a9] text-white text-xs font-medium transition-colors disabled:opacity-60"
                >
                    {running
                        ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                        : <PlayIcon className="w-3.5 h-3.5" />
                    }
                    {running ? 'Génération...' : 'Exécuter'}
                </button>

                {report.is_owner && (
                    <Link
                        href={`/report-builder/${report.id}/edit`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#7e22ce] hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                        title="Modifier"
                    >
                        <PencilSquareIcon className="w-4 h-4" />
                    </Link>
                )}

                <button
                    onClick={() => router.post(`/api/v1/report-builder/reports/${report.id}/duplicate`)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    title="Dupliquer"
                >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                </button>

                {report.is_owner && (
                    <button
                        onClick={() => onDelete(report.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
                        title="Supprimer"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ReportsIndex({ reports = [], recentRuns = [] }) {
    const [activeTab, setActiveTab] = useState('mine');
    const [toastMsg, setToastMsg]   = useState(null);

    const toast = (msg, type = 'success') => {
        setToastMsg({ msg, type });
        setTimeout(() => setToastMsg(null), 4000);
    };

    // Filtrage par tab
    const filtered = reports.filter(r => {
        if (activeTab === 'mine')      return r.is_owner && !r.is_template;
        if (activeTab === 'shared')    return !r.is_owner && r.is_shared;
        if (activeTab === 'scheduled') return r.is_scheduled;
        if (activeTab === 'templates') return r.is_template;
        return true;
    });

    const handleRun = async (reportId, format) => {
        try {
            const { data } = await axios.post(`/api/v1/report-builder/reports/${reportId}/run`, { format });
            toast(`Génération démarrée (ID: ${data.run_id}). Le fichier sera prêt dans quelques instants.`);
            // Polling simple — rechargement après 3s
            setTimeout(() => router.reload({ only: ['recentRuns'] }), 3000);
        } catch {
            toast('Erreur lors du démarrage de l\'export.', 'error');
        }
    };

    const handleDelete = async (reportId) => {
        if (! confirm('Supprimer ce rapport ?')) return;
        try {
            await axios.delete(`/api/v1/report-builder/reports/${reportId}`);
            router.reload({ only: ['reports'] });
            toast('Rapport supprimé.');
        } catch {
            toast('Erreur lors de la suppression.', 'error');
        }
    };

    const handleDownload = (runId) => {
        window.open(`/api/v1/report-builder/runs/${runId}/download`, '_blank');
    };

    return (
        <AppLayout>
            <Head title="Rapports personnalisés" />

            {/* Toast */}
            {toastMsg && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
                    toastMsg.type === 'error'
                        ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
                        : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                }`}>
                    {toastMsg.type === 'error'
                        ? <ExclamationCircleIcon className="w-4 h-4" />
                        : <CheckCircleIcon className="w-4 h-4" />
                    }
                    {toastMsg.msg}
                </div>
            )}

            <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rapports personnalisés</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Construisez et planifiez des rapports sur mesure pour chaque module.
                        </p>
                    </div>
                    <Link
                        href="/report-builder/new"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7e22ce] hover:bg-[#2574a9] text-white text-sm font-semibold transition-colors shadow-sm"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Créer un rapport
                    </Link>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-[#7e22ce] text-[#7e22ce] dark:text-purple-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            {tab.label}
                            <span className="ml-1.5 text-xs text-gray-400">
                                {tab.id === 'mine'      && reports.filter(r => r.is_owner && !r.is_template).length}
                                {tab.id === 'shared'    && reports.filter(r => !r.is_owner && r.is_shared).length}
                                {tab.id === 'scheduled' && reports.filter(r => r.is_scheduled).length}
                                {tab.id === 'templates' && reports.filter(r => r.is_template).length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Grille de rapports */}
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                        <DocumentIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p className="text-lg font-medium">Aucun rapport dans cet onglet</p>
                        <p className="text-sm mt-1">Créez votre premier rapport personnalisé.</p>
                        <Link href="/report-builder/new" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7e22ce] text-white text-sm">
                            <PlusIcon className="w-4 h-4" /> Créer un rapport
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {filtered.map(report => (
                            <ReportCard
                                key={report.id}
                                report={report}
                                onRun={handleRun}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}

                {/* Exécutions récentes */}
                {recentRuns.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Exécutions récentes</h2>
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                            {['Rapport', 'Module', 'Format', 'Statut', 'Lignes', 'Durée', 'Par', 'Date', ''].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {recentRuns.map(run => (
                                            <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[180px] truncate">
                                                    {run.report_name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <ModuleIcon module={run.module} size="sm" />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                        {FORMAT_LABELS[run.format]}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={run.status} />
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                    {run.row_count != null ? run.row_count.toLocaleString('fr-FR') : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                    {run.duration_ms != null ? `${(run.duration_ms / 1000).toFixed(1)}s` : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{run.run_by}</td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{run.created_at}</td>
                                                <td className="px-4 py-3">
                                                    {run.can_download && (
                                                        <button
                                                            onClick={() => handleDownload(run.id)}
                                                            className="p-1.5 rounded-lg text-[#7e22ce] hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                                            title="Télécharger"
                                                        >
                                                            <ArrowDownTrayIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
export { ReportsIndex };
