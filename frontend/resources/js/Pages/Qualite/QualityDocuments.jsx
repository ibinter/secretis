import React, { useState } from 'react';
import { Head, usePage, router, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

const DOC_TYPE_LABELS = {
    procedure:      'Procédure',
    instruction:    'Instruction',
    formulaire:     'Formulaire',
    enregistrement: 'Enregistrement',
    politique:      'Politique',
};

const STATUS_BADGE = {
    brouillon: 'bg-gray-100 text-gray-600',
    revue:     'bg-yellow-100 text-yellow-700',
    approuve:  'bg-green-100 text-green-700',
    obsolete:  'bg-red-100 text-red-500',
};

const STATUS_LABELS = {
    brouillon: 'Brouillon',
    revue:     'En revue',
    approuve:  'Approuvé',
    obsolete:  'Obsolète',
};

function ExpiryBadge({ reviewDate }) {
    if (!reviewDate) return null;
    const daysLeft = Math.ceil((new Date(reviewDate) - new Date()) / 86400000);
    if (daysLeft > 30) return null;
    if (daysLeft <= 0) {
        return <span className="ml-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">Expiré</span>;
    }
    return <span className="ml-1 text-xs bg-orange-400 text-white px-1.5 py-0.5 rounded">{daysLeft}j</span>;
}

// ─── Formulaire nouveau document ──────────────────────────────────────────────
function NewDocumentModal({ processes, onClose, onSuccess }) {
    const [form, setForm] = useState({
        title:       '',
        type:        'procedure',
        process_id:  '',
        version:     '1.0',
        review_date: '',
    });
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/qualite/documents', form);
            onSuccess();
            onClose();
        } catch {
            alert('Erreur.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Nouveau document</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Titre *</label>
                        <input
                            type="text"
                            required
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 text-sm">
                                {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Version</label>
                            <input type="text" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Processus associé</label>
                        <select value={form.process_id} onChange={e => setForm({ ...form, process_id: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 text-sm">
                            <option value="">Aucun</option>
                            {processes.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date de révision prévue</label>
                        <input type="date" value={form.review_date} onChange={e => setForm({ ...form, review_date: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Annuler</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                            {loading ? 'Création...' : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function QualityDocuments() {
    const { documents, processes, filters } = usePage().props;

    const [showNew, setShowNew]   = useState(false);
    const [filter, setFilter]     = useState({ type: filters.type ?? '', status: filters.status ?? '' });

    const refresh = () => router.reload({ only: ['documents'] });

    const applyFilters = () => {
        router.get('/qualite/documents', filter, { preserveState: true, replace: true });
    };

    const approve = async (docId) => {
        if (!confirm('Approuver ce document ?')) return;
        await axios.patch(`/qualite/documents/${docId}/approve`);
        refresh();
    };

    return (
        <AppLayout>
            <Head title="Documents qualité — ISO 9001" />

            <div className="p-6 max-w-screen-xl mx-auto space-y-5">
                {/* En-tête */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Bibliothèque documentaire qualité</h1>
                        <p className="text-sm text-gray-500">{documents.total} document{documents.total > 1 ? 's' : ''}</p>
                    </div>
                    <button
                        onClick={() => setShowNew(true)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                    >
                        + Nouveau document
                    </button>
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-xl border shadow-sm p-4 flex gap-3 items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                        <select value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}
                            className="border rounded-lg px-3 py-2 text-sm">
                            <option value="">Tous types</option>
                            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                        <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}
                            className="border rounded-lg px-3 py-2 text-sm">
                            <option value="">Tous statuts</option>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    <button onClick={applyFilters} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                        Filtrer
                    </button>
                </div>

                {/* Tableau */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titre</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processus</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Révision</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approuvé par</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {documents.data.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center text-gray-400">Aucun document.</td>
                                    </tr>
                                )}
                                {documents.data.map(doc => (
                                    <tr key={doc.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{doc.reference}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs">
                                            {doc.title}
                                            <ExpiryBadge reviewDate={doc.review_date} />
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600">{DOC_TYPE_LABELS[doc.type] ?? doc.type}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {doc.process ? `${doc.process.code}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono">{doc.version}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[doc.status]}`}>
                                                {STATUS_LABELS[doc.status] ?? doc.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {doc.review_date ? new Date(doc.review_date).toLocaleDateString('fr-FR') : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {doc.approved_by_user?.name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right flex gap-2 justify-end">
                                            {doc.status === 'revue' && (
                                                <button
                                                    onClick={() => approve(doc.id)}
                                                    className="text-green-600 hover:underline text-xs"
                                                >
                                                    Approuver
                                                </button>
                                            )}
                                            {doc.file_path && (
                                                <a
                                                    href={`/storage/${doc.file_path}`}
                                                    target="_blank"
                                                    className="text-blue-600 hover:underline text-xs"
                                                >
                                                    ↓ Fichier
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {documents.last_page > 1 && (
                        <div className="px-4 py-3 border-t flex items-center justify-between">
                            <p className="text-xs text-gray-500">Page {documents.current_page} / {documents.last_page}</p>
                            <div className="flex gap-1">
                                {documents.links.map((link, i) => (
                                    <button key={i} disabled={!link.url}
                                        onClick={() => link.url && router.visit(link.url)}
                                        className={`px-3 py-1 text-xs rounded border ${link.active ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'} ${!link.url ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showNew && (
                <NewDocumentModal
                    processes={processes}
                    onClose={() => setShowNew(false)}
                    onSuccess={refresh}
                />
            )}
        </AppLayout>
    );
}
