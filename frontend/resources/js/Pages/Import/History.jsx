/**
 * Import/History.jsx — Historique des imports SECRETIS ERP
 *
 * Tableau filtrable : Date | Module | Fichier | Lignes | Importées | Erreurs | Statut | Actions
 */

import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import {
    ArrowDownTrayIcon,
    TrashIcon,
    EyeIcon,
    PlusIcon,
    CalendarDaysIcon,
    ClipboardDocumentListIcon,
    UsersIcon,
    IdentificationIcon,
    BanknotesIcon,
    BookOpenIcon,
    FunnelIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import {
    CheckCircleIcon,
    ExclamationCircleIcon,
    ClockIcon as ClockSolid,
} from '@heroicons/react/24/solid';

// ─── Config ──────────────────────────────────────────────────────────────────

const MODULE_CONFIG = {
    events:     { label: 'Agenda',        icon: CalendarDaysIcon,         color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
    tasks:      { label: 'Tâches',        icon: ClipboardDocumentListIcon, color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    visitors:   { label: 'Visiteurs',     icon: UsersIcon,                 color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    hr:         { label: 'RH',            icon: IdentificationIcon,         color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    contacts:   { label: 'Contacts',      icon: BookOpenIcon,               color: 'text-pink-500',   bg: 'bg-pink-50 dark:bg-pink-900/20' },
    accounting: { label: 'Comptabilité',  icon: BanknotesIcon,              color: 'text-teal-500',   bg: 'bg-teal-50 dark:bg-teal-900/20' },
};

const STATUS_CONFIG = {
    pending:    { label: 'En attente',   color: 'text-gray-500',   bg: 'bg-gray-100 dark:bg-gray-700' },
    mapping:    { label: 'Mappage',      color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    validating: { label: 'Validation',   color: 'text-amber-600',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
    importing:  { label: 'En cours',     color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
    completed:  { label: 'Terminé',      color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900/30' },
    failed:     { label: 'Échec',        color: 'text-red-600',    bg: 'bg-red-100 dark:bg-red-900/30' },
};

// ─── Composants ──────────────────────────────────────────────────────────────

function ModuleTag({ module }) {
    const cfg = MODULE_CONFIG[module];
    if (! cfg) return <span className="text-gray-400 text-xs">{module}</span>;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    );
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}>
            {status === 'completed' && <CheckCircleIcon className="w-3 h-3" />}
            {status === 'failed'    && <ExclamationCircleIcon className="w-3 h-3" />}
            {cfg.label}
        </span>
    );
}

function ProgressMini({ imported, total }) {
    if (! total) return <span className="text-gray-300">—</span>;
    const pct = Math.round((imported / total) * 100);
    return (
        <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-500">{pct}%</span>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportHistory({ jobs = {}, modules = {} }) {
    const [filterModule, setFilterModule] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [toast, setToast]               = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const { data: rows = [], links, meta } = jobs;

    const filtered = rows.filter(job => {
        if (filterModule && job.module !== filterModule) return false;
        if (filterStatus && job.status !== filterStatus) return false;
        return true;
    });

    const handleDelete = async (id) => {
        if (! confirm('Supprimer cet historique d\'import ?')) return;
        try {
            await axios.delete(`/api/v1/import/${id}`);
            router.reload({ only: ['jobs'] });
            showToast('Historique supprimé.');
        } catch {
            showToast('Erreur lors de la suppression.', 'error');
        }
    };

    const downloadErrors = (id) => {
        window.open(`/api/v1/import/${id}/error-report`, '_blank');
    };

    return (
        <AppLayout>
            <Head title="Historique des imports" />

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

            <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historique des imports</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Toutes les opérations d'import de votre organisation.
                        </p>
                    </div>
                    <Link
                        href="/import"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2E86C1] hover:bg-[#2574a9] text-white text-sm font-semibold transition-colors shadow-sm"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Nouvel import
                    </Link>
                </div>

                {/* Filtres */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <FunnelIcon className="w-4 h-4" />
                        Filtrer :
                    </div>

                    <select
                        value={filterModule}
                        onChange={e => setFilterModule(e.target.value)}
                        className="text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
                    >
                        <option value="">Tous les modules</option>
                        {Object.entries(modules).map(([key, mod]) => (
                            <option key={key} value={key}>{mod.label}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E86C1]"
                    >
                        <option value="">Tous les statuts</option>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label}</option>
                        ))}
                    </select>

                    {(filterModule || filterStatus) && (
                        <button
                            onClick={() => { setFilterModule(''); setFilterStatus(''); }}
                            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <XMarkIcon className="w-4 h-4" /> Réinitialiser
                        </button>
                    )}
                </div>

                {/* Tableau */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                    {['Date', 'Module', 'Fichier', 'Total', 'Importées', 'Ignorées', 'Erreurs', 'Statut', 'Par', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                                            Aucun import trouvé.
                                        </td>
                                    </tr>
                                ) : filtered.map(job => (
                                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{job.created_at}</td>
                                        <td className="px-4 py-3">
                                            <ModuleTag module={job.module} />
                                        </td>
                                        <td className="px-4 py-3 max-w-[180px]">
                                            <span className="text-gray-700 dark:text-gray-300 truncate block text-xs font-mono bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                {job.original_filename}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-right tabular-nums">
                                            {job.total_rows?.toLocaleString('fr-FR')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ProgressMini imported={job.imported_rows} total={job.total_rows} />
                                        </td>
                                        <td className="px-4 py-3 text-amber-600 dark:text-amber-400 text-right tabular-nums">
                                            {job.skipped_rows > 0 ? job.skipped_rows.toLocaleString('fr-FR') : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-red-600 dark:text-red-400 text-right tabular-nums">
                                            {job.error_rows > 0 ? job.error_rows.toLocaleString('fr-FR') : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={job.status} />
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{job.user}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                {job.has_errors && (
                                                    <button
                                                        onClick={() => downloadErrors(job.id)}
                                                        className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                        title="Télécharger rapport d'erreurs"
                                                    >
                                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(job.id)}
                                                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {meta && meta.last_page > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-400">
                                {meta.from}–{meta.to} sur {meta.total?.toLocaleString('fr-FR')} imports
                            </p>
                            <div className="flex gap-1">
                                {links && links.map((link, i) => (
                                    <button
                                        key={i}
                                        disabled={! link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                                            link.active
                                                ? 'bg-[#2E86C1] text-white'
                                                : link.url
                                                ? 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                : 'text-gray-200 dark:text-gray-600 cursor-default'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
