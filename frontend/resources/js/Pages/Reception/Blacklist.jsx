import React, { useState, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';

// ─── Gestion de la liste noire ────────────────────────────────────────────────
export default function Blacklist({ visitors, filters }) {
    const [search, setSearch]         = useState(filters.search || '');
    const [actionModal, setActionModal] = useState(null); // { visitor, action: 'add'|'remove' }
    const [reason, setReason]         = useState('');
    const [loading, setLoading]       = useState(false);
    const fileRef                     = useRef(null);

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            router.get('/visitors', { ...filters, search, blacklisted: filters.blacklisted }, { preserveState: true });
        }
    };

    const handleAction = async () => {
        if (actionModal.action === 'add' && !reason.trim()) return;
        setLoading(true);
        try {
            if (actionModal.action === 'add') {
                await axios.post(`/visitors/${actionModal.visitor.id}/blacklist`, { reason });
            } else {
                await axios.delete(`/visitors/${actionModal.visitor.id}/blacklist`);
            }
            setActionModal(null);
            setReason('');
            router.reload({ only: ['visitors'] });
        } catch {
            alert('Une erreur est survenue.');
        } finally {
            setLoading(false);
        }
    };

    const handleCsvImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        try {
            await axios.post('/visitors/blacklist/import', fd);
            router.reload({ only: ['visitors'] });
            alert('Import CSV réussi.');
        } catch {
            alert('Erreur lors de l\'import CSV.');
        }
        e.target.value = '';
    };

    return (
        <AppLayout>
            <Head title="Liste noire visiteurs" />

            <div className="p-6 space-y-6">
                {/* En-tête */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                            🚫 Liste noire visiteurs
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            {visitors.total} visiteur{visitors.total !== 1 ? 's' : ''} sur liste noire
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
                        <button
                            onClick={() => fileRef.current.click()}
                            className="border border-gray-200 text-gray-600 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                            ⬆️ Import CSV
                        </button>
                        <a
                            href="/visitors/blacklist/export"
                            className="border border-gray-200 text-gray-600 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                            ⬇️ Export CSV
                        </a>
                    </div>
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Rechercher</label>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={handleSearch}
                            placeholder="Nom, N° pièce, société…"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#9333EA]"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.get('/visitors', { blacklisted: true, search })}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border ${filters.blacklisted ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600'}`}
                        >
                            🚫 Blacklistés seulement
                        </button>
                        <button
                            onClick={() => router.get('/visitors', { search })}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border ${!filters.blacklisted ? 'bg-[#9333EA] text-white border-[#9333EA]' : 'border-gray-200 text-gray-600'}`}
                        >
                            Tous les visiteurs
                        </button>
                    </div>
                </div>

                {/* Liste */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {visitors.data.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <div className="text-5xl mb-3">✅</div>
                            <div className="text-lg font-medium">Aucun visiteur blacklisté</div>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    {['Visiteur', 'N° Pièce', 'Société', 'Motif', 'Visites', 'Dernière visite', 'Actions'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {visitors.data.map(v => (
                                    <tr key={v.id} className={`hover:bg-gray-50 ${v.is_blacklisted ? 'bg-red-50' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {v.photo_path ? (
                                                    <img src={`/storage/${v.photo_path}`} className="w-8 h-8 rounded-full object-cover" alt="" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                                                        {v.full_name[0]}
                                                    </div>
                                                )}
                                                <span className="font-medium text-gray-900">{v.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-600 text-xs">{v.id_type} — {v.id_number}</td>
                                        <td className="px-4 py-3 text-gray-500">{v.company || '—'}</td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                            {v.is_blacklisted ? (
                                                <span className="text-red-600 text-xs" title={v.blacklist_reason}>
                                                    🚫 {v.blacklist_reason?.substring(0, 60)}{v.blacklist_reason?.length > 60 ? '…' : ''}
                                                </span>
                                            ) : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${v.visit_count >= 5 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {v.visit_count}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">
                                            {v.last_visit_at ? new Date(v.last_visit_at).toLocaleDateString('fr-FR') : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {v.is_blacklisted ? (
                                                <button
                                                    onClick={() => { setActionModal({ visitor: v, action: 'remove' }); setReason(''); }}
                                                    className="text-xs bg-green-50 text-green-700 border border-green-200 font-bold px-3 py-1.5 rounded-lg hover:bg-green-100"
                                                >
                                                    ✅ Retirer
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => { setActionModal({ visitor: v, action: 'add' }); setReason(''); }}
                                                    className="text-xs bg-red-50 text-red-600 border border-red-200 font-bold px-3 py-1.5 rounded-lg hover:bg-red-100"
                                                >
                                                    🚫 Blacklister
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {visitors.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {Array.from({ length: visitors.last_page }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => router.get('/visitors', { ...filters, page })}
                                className={`w-9 h-9 rounded-lg text-sm font-bold ${page === visitors.current_page ? 'bg-[#9333EA] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal confirmation action */}
            {actionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-black text-gray-900 mb-2">
                            {actionModal.action === 'add' ? '🚫 Ajouter à la liste noire' : '✅ Retirer de la liste noire'}
                        </h3>
                        <p className="text-gray-500 text-sm mb-4">
                            Visiteur : <strong>{actionModal.visitor.full_name}</strong>
                        </p>
                        {actionModal.action === 'add' && (
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-600 mb-1">Motif de blacklistage *</label>
                                <textarea
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={3}
                                    placeholder="Expliquez la raison du blacklistage..."
                                    className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none"
                                />
                            </div>
                        )}
                        {actionModal.action === 'remove' && (
                            <p className="bg-green-50 text-green-700 rounded-xl p-3 text-sm mb-4">
                                Ce visiteur pourra à nouveau être accueilli dans vos locaux.
                            </p>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => setActionModal(null)}
                                className="flex-1 border border-gray-200 text-gray-500 font-bold py-2.5 rounded-xl text-sm">
                                Annuler
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={loading || (actionModal.action === 'add' && !reason.trim())}
                                className={`flex-1 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 ${
                                    actionModal.action === 'add' ? 'bg-red-600' : 'bg-green-600'
                                }`}
                            >
                                {loading ? 'Traitement…' : 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
export { Blacklist };
