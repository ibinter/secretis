import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
    depassé : { label: 'Dépassé',  bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-300',    sort: 0 },
    urgent  : { label: 'Urgent',   bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', sort: 1 },
    bientot : { label: 'Bientôt',  bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', sort: 2 },
    ok      : { label: 'OK',       bg: 'bg-green-100 dark:bg-green-900/30',   text: 'text-green-700 dark:text-green-300',   sort: 3 },
};

const TYPE_ICONS = {
    vidange: '🛢️', pneus: '🔄', freins: '🔴', courroie: '⚙️',
    revision: '🔧', ct: '📋', assurance: '🛡️', vignette: '📌',
};

// ---------------------------------------------------------------------------
// MaintenancePlanning
// ---------------------------------------------------------------------------
export default function MaintenancePlanning({ planningRows }) {
    const [rows, setRows]                   = useState(planningRows ?? []);
    const [filterStatus, setFilterStatus]   = useState('all');
    const [filterType, setFilterType]       = useState('all');
    const [view, setView]                   = useState('table'); // 'table' | 'by_type'
    const [modalRow, setModalRow]           = useState(null);

    // Filtre + tri
    const filtered = rows
        .filter(r => filterStatus === 'all' || r.status === filterStatus)
        .filter(r => filterType   === 'all' || r.type   === filterType)
        .sort((a, b) => (STATUS_CONFIG[a.status]?.sort ?? 4) - (STATUS_CONFIG[b.status]?.sort ?? 4));

    // Vue par type
    const byType = {};
    if (view === 'by_type') {
        rows.forEach(r => {
            if (!byType[r.type]) byType[r.type] = [];
            byType[r.type].push(r);
        });
    }

    const uniqueTypes = [...new Set(rows.map(r => r.type))];

    // Compteurs
    const counts = {
        depassé: rows.filter(r => r.status === 'depassé').length,
        urgent : rows.filter(r => r.status === 'urgent').length,
        bientot: rows.filter(r => r.status === 'bientot').length,
        ok     : rows.filter(r => r.status === 'ok').length,
    };

    return (
        <AppLayout>
            <Head title="Planning maintenance flotte" />

            <div className="max-w-7xl mx-auto p-6 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Planning Maintenance</h1>
                        <p className="text-gray-500 text-sm mt-1">Maintenance prédictive de toute la flotte</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setView('table')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'table' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border'}`}
                        >Tableau</button>
                        <button
                            onClick={() => setView('by_type')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'by_type' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border'}`}
                        >Par type</button>
                    </div>
                </div>

                {/* Stats rapides */}
                <div className="grid grid-cols-4 gap-4">
                    {Object.entries(counts).map(([status, count]) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
                            className={`rounded-xl p-4 text-center transition hover:shadow-md ${
                                filterStatus === status ? 'ring-2 ring-purple-500' : ''
                            } ${STATUS_CONFIG[status]?.bg}`}
                        >
                            <div className={`text-2xl font-bold ${STATUS_CONFIG[status]?.text}`}>{count}</div>
                            <div className={`text-sm font-medium ${STATUS_CONFIG[status]?.text}`}>{STATUS_CONFIG[status]?.label}</div>
                        </button>
                    ))}
                </div>

                {/* Filtres */}
                <div className="flex gap-3 flex-wrap">
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
                    >
                        <option value="all">Tous les types</option>
                        {uniqueTypes.map(t => (
                            <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
                    >
                        <option value="all">Tous les statuts</option>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                    <span className="text-sm text-gray-400 self-center">{filtered.length} ligne(s)</span>
                </div>

                {/* Vue tableau */}
                {view === 'table' && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
                                        <th className="px-4 py-3">Véhicule</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Prochain km</th>
                                        <th className="px-4 py-3">Prochain date</th>
                                        <th className="px-4 py-3">% Usure</th>
                                        <th className="px-4 py-3">Statut</th>
                                        <th className="px-4 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filtered.map((row, i) => {
                                        const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.ok;
                                        return (
                                            <tr key={i} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                                row.status === 'depassé' ? 'bg-red-50/30 dark:bg-red-900/10' : ''
                                            }`}>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => router.visit(`/fleet/vehicles/${row.vehicle_id}`)}
                                                        className="font-medium text-purple-600 hover:underline"
                                                    >{row.plate_number}</button>
                                                    <div className="text-xs text-gray-400">{row.brand_model}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span>{TYPE_ICONS[row.type]} {row.label}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {row.next_km ? row.next_km.toLocaleString('fr-FR') + ' km' : '—'}
                                                    {row.km_remaining != null && (
                                                        <div className={`text-xs ${row.km_remaining < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                            {row.km_remaining > 0 ? `−${row.km_remaining} km` : `+${Math.abs(row.km_remaining)} km`}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {row.next_date ? new Date(row.next_date).toLocaleDateString('fr-FR') : '—'}
                                                    {row.days_remaining != null && (
                                                        <div className={`text-xs ${row.days_remaining < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                            {row.days_remaining > 0 ? `dans ${row.days_remaining}j` : `${Math.abs(row.days_remaining)}j dépassé`}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className={`h-2 rounded-full ${
                                                                    row.status === 'depassé' ? 'bg-red-500' :
                                                                    row.status === 'urgent'  ? 'bg-orange-500' :
                                                                    row.status === 'bientot' ? 'bg-yellow-400' : 'bg-green-500'
                                                                }`}
                                                                style={{ width: `${Math.min(row.wear_pct, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-medium">{row.wear_pct}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => setModalRow(row)}
                                                        className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition"
                                                    >
                                                        Planifier
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {filtered.length === 0 && (
                                <p className="text-center text-gray-400 py-12">Aucune maintenance à afficher</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Vue par type */}
                {view === 'by_type' && (
                    <div className="space-y-6">
                        {Object.entries(byType).map(([type, typeRows]) => (
                            <div key={type} className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                                    <span className="text-xl">{TYPE_ICONS[type]}</span>
                                    <h3 className="font-semibold text-gray-900 dark:text-white capitalize">{type}</h3>
                                    <span className="ml-auto text-xs text-gray-400">{typeRows.length} véhicule(s)</span>
                                </div>
                                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {typeRows
                                        .sort((a, b) => (STATUS_CONFIG[a.status]?.sort ?? 4) - (STATUS_CONFIG[b.status]?.sort ?? 4))
                                        .map((row, i) => {
                                            const cfg = STATUS_CONFIG[row.status];
                                            return (
                                                <div key={i} className="flex items-center gap-4 px-5 py-3">
                                                    <button
                                                        onClick={() => router.visit(`/fleet/vehicles/${row.vehicle_id}`)}
                                                        className="font-medium text-purple-600 hover:underline text-sm w-28 flex-shrink-0"
                                                    >{row.plate_number}</button>
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <div className="flex-1">
                                                        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                            <div
                                                                className={`h-1.5 rounded-full ${
                                                                    row.status === 'depassé' ? 'bg-red-500' :
                                                                    row.status === 'urgent'  ? 'bg-orange-500' :
                                                                    row.status === 'bientot' ? 'bg-yellow-400' : 'bg-green-500'
                                                                }`}
                                                                style={{ width: `${Math.min(row.wear_pct, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-400 w-8">{row.wear_pct}%</span>
                                                    <button
                                                        onClick={() => setModalRow(row)}
                                                        className="text-xs text-purple-600 hover:underline ml-2"
                                                    >Planifier</button>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal planification */}
            {modalRow && (
                <PlanificationModal
                    row={modalRow}
                    onClose={() => setModalRow(null)}
                    onSuccess={() => {
                        setModalRow(null);
                        router.reload({ only: ['planningRows'] });
                    }}
                />
            )}
        </AppLayout>
    );
}

// ---------------------------------------------------------------------------
// Modal — Enregistrer une maintenance
// ---------------------------------------------------------------------------
function PlanificationModal({ row, onClose, onSuccess }) {
    const { data, setData, processing, errors } = useForm({
        vehicle_id       : row.vehicle_id,
        maintenance_type : row.type,
        done_date        : new Date().toISOString().split('T')[0],
        done_km          : '',
        cost             : '',
        garage_name      : '',
        notes            : '',
    });

    const submit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/fleet/maintenance-logs', data);
            onSuccess();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white">
                        Enregistrer — {TYPE_ICONS[row.type]} {row.label}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="text-sm text-gray-500 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <strong>{row.plate_number}</strong> — {row.brand_model}
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Date de réalisation *</label>
                            <input type="date" value={data.done_date} onChange={e => setData('done_date', e.target.value)}
                                className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Kilométrage</label>
                            <input type="number" value={data.done_km} onChange={e => setData('done_km', e.target.value)}
                                placeholder="km" className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Coût (F CFA)</label>
                            <input type="number" value={data.cost} onChange={e => setData('cost', e.target.value)}
                                placeholder="0" className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Garage</label>
                            <input type="text" value={data.garage_name} onChange={e => setData('garage_name', e.target.value)}
                                placeholder="Nom du garage" className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                        <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2}
                            className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            Annuler
                        </button>
                        <button type="submit" disabled={processing}
                            className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-700 transition disabled:opacity-50">
                            {processing ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
export { MaintenancePlanning };
