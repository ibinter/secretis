import React, { useState } from 'react';
import { Head, usePage, router, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

const SEVERITY_BADGE = {
    critique: 'bg-red-100 text-red-700 border border-red-200',
    majeure:  'bg-orange-100 text-orange-700 border border-orange-200',
    mineure:  'bg-yellow-100 text-yellow-700 border border-yellow-200',
};

const STATUS_BADGE = {
    ouvert:             'bg-gray-100 text-gray-700',
    analyse:            'bg-purple-100 text-purple-700',
    action_corrective:  'bg-indigo-100 text-indigo-700',
    verification:       'bg-purple-100 text-purple-700',
    clos:               'bg-green-100 text-green-700',
};

const STATUS_LABELS = {
    ouvert:             'Ouvert',
    analyse:            'En analyse',
    action_corrective:  'Action corrective',
    verification:       'Vérification',
    clos:               'Clos',
};

function OverdueIndicator({ dueDate, status }) {
    if (status === 'clos' || !dueDate) return null;
    const isOverdue = new Date(dueDate) < new Date();
    if (!isOverdue) return null;
    return (
        <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-500 text-white">
            Retard
        </span>
    );
}

export default function NonconformityList() {
    const { nonconformities, processes, filters } = usePage().props;

    const [localFilters, setLocalFilters] = useState({
        status:     filters.status     ?? '',
        severity:   filters.severity   ?? '',
        source:     filters.source     ?? '',
        process_id: filters.process_id ?? '',
        date_from:  filters.date_from  ?? '',
        date_to:    filters.date_to    ?? '',
        search:     filters.search     ?? '',
    });

    const applyFilters = () => {
        router.get('/qualite/nc', localFilters, { preserveState: true, replace: true });
    };

    const resetFilters = () => {
        const empty = Object.fromEntries(Object.keys(localFilters).map(k => [k, '']));
        setLocalFilters(empty);
        router.get('/qualite/nc', {}, { preserveState: true, replace: true });
    };

    const exportCsv = () => {
        const params = new URLSearchParams(localFilters).toString();
        window.location.href = `/qualite/nc/export?${params}`;
    };

    const handleFilterChange = (key, value) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <AppLayout>
            <Head title="Non-conformités — Qualité ISO 9001" />

            <div className="p-6 max-w-screen-2xl mx-auto space-y-5">
                {/* En-tête */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Non-conformités</h1>
                        <p className="text-sm text-gray-500">
                            {nonconformities.total} non-conformité{nonconformities.total > 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={exportCsv}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition flex items-center gap-1"
                        >
                            ↓ Export CSV
                        </button>
                        <Link
                            href="/qualite/nc/create"
                            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                        >
                            + Nouvelle NC
                        </Link>
                    </div>
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-xl border shadow-sm p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        <input
                            type="text"
                            placeholder="Recherche..."
                            value={localFilters.search}
                            onChange={e => handleFilterChange('search', e.target.value)}
                            className="col-span-2 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <select
                            value={localFilters.status}
                            onChange={e => handleFilterChange('status', e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">Tous statuts</option>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                        <select
                            value={localFilters.severity}
                            onChange={e => handleFilterChange('severity', e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">Toutes sévérités</option>
                            <option value="critique">Critique</option>
                            <option value="majeure">Majeure</option>
                            <option value="mineure">Mineure</option>
                        </select>
                        <select
                            value={localFilters.source}
                            onChange={e => handleFilterChange('source', e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">Toutes sources</option>
                            <option value="audit">Audit</option>
                            <option value="client_complaint">Réclamation client</option>
                            <option value="internal_detection">Détection interne</option>
                            <option value="supplier">Fournisseur</option>
                            <option value="regulatory">Réglementaire</option>
                        </select>
                        <select
                            value={localFilters.process_id}
                            onChange={e => handleFilterChange('process_id', e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">Tous processus</option>
                            {processes.map(p => (
                                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <button
                                onClick={applyFilters}
                                className="flex-1 bg-purple-600 text-white text-sm rounded-lg px-3 py-2 hover:bg-purple-700 transition"
                            >
                                Filtrer
                            </button>
                            <button
                                onClick={resetFilters}
                                className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 transition"
                            >
                                ↺
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tableau */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Référence</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Titre</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Sévérité</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Source</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Processus</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Échéance</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Détecté le</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {nonconformities.data.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                                            Aucune non-conformité trouvée.
                                        </td>
                                    </tr>
                                )}
                                {nonconformities.data.map((nc) => (
                                    <tr
                                        key={nc.id}
                                        className="hover:bg-gray-50 transition cursor-pointer"
                                        onClick={() => router.visit(`/qualite/nc/${nc.id}`)}
                                    >
                                        <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                                            {nc.reference}
                                            {nc.recurrence_count > 0 && (
                                                <span className="ml-1 text-orange-500 text-xs">↻{nc.recurrence_count}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                                            {nc.title}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${SEVERITY_BADGE[nc.severity]}`}>
                                                {nc.severity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-xs">
                                            {{
                                                audit:               'Audit',
                                                client_complaint:    'Client',
                                                internal_detection:  'Interne',
                                                supplier:            'Fournisseur',
                                                regulatory:          'Réglementaire',
                                            }[nc.source] ?? nc.source}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {nc.process ? `${nc.process.code} — ${nc.process.name}` : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[nc.status]}`}>
                                                {STATUS_LABELS[nc.status] ?? nc.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                                            {nc.due_date
                                                ? <>
                                                    {new Date(nc.due_date).toLocaleDateString('fr-FR')}
                                                    <OverdueIndicator dueDate={nc.due_date} status={nc.status} />
                                                </>
                                                : <span className="text-gray-400">—</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {new Date(nc.detected_at).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={`/qualite/nc/${nc.id}`}
                                                onClick={e => e.stopPropagation()}
                                                className="text-purple-600 hover:underline text-xs"
                                            >
                                                Voir →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {nonconformities.last_page > 1 && (
                        <div className="px-4 py-3 border-t flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                                Page {nonconformities.current_page} / {nonconformities.last_page} — {nonconformities.total} résultats
                            </p>
                            <div className="flex gap-1">
                                {nonconformities.links.map((link, i) => (
                                    <button
                                        key={i}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.visit(link.url)}
                                        className={`px-3 py-1 text-xs rounded border transition
                                            ${link.active ? 'bg-purple-600 text-white border-purple-600' : 'hover:bg-gray-50'}
                                            ${!link.url ? 'opacity-40 cursor-not-allowed' : ''}
                                        `}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
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
export { NonconformityList };
