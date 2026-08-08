import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

const STATUS_BADGE = {
    recu:          'bg-gray-100 text-gray-700',
    en_traitement: 'bg-purple-100 text-purple-700',
    resolu:        'bg-yellow-100 text-yellow-700',
    clos:          'bg-green-100 text-green-700',
};

const STATUS_LABELS = {
    recu:          'Reçu',
    en_traitement: 'En traitement',
    resolu:        'Résolu',
    clos:          'Clos',
};

const SEVERITY_BADGE = {
    critique: 'bg-red-100 text-red-700 border border-red-200',
    majeure:  'bg-orange-100 text-orange-700 border border-orange-200',
    mineure:  'bg-yellow-100 text-yellow-700 border border-yellow-200',
};

function StarDisplay({ value }) {
    return (
        <span className="text-yellow-400">
            {'★'.repeat(value ?? 0)}{'☆'.repeat(5 - (value ?? 0))}
        </span>
    );
}

// ─── Modal nouvelle réclamation ───────────────────────────────────────────────
function NewComplaintModal({ onClose, onSuccess }) {
    const [form, setForm] = useState({
        customer_name:    '',
        customer_contact: '',
        received_at:      new Date().toISOString().split('T')[0],
        channel:          'email',
        description:      '',
        severity:         'mineure',
    });
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/qualite/reclamations', form);
            onSuccess();
            onClose();
        } catch {
            alert('Erreur lors de l\'enregistrement.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Nouvelle réclamation client</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
                            <input
                                type="text"
                                required
                                value={form.customer_name}
                                onChange={e => setForm({ ...form, customer_name: e.target.value })}
                                placeholder="Nom du client"
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Contact</label>
                            <input
                                type="text"
                                value={form.customer_contact}
                                onChange={e => setForm({ ...form, customer_contact: e.target.value })}
                                placeholder="Email / téléphone"
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Date de réception</label>
                            <input
                                type="date"
                                value={form.received_at}
                                onChange={e => setForm({ ...form, received_at: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Canal</label>
                            <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 text-sm">
                                <option value="email">Email</option>
                                <option value="courrier">Courrier</option>
                                <option value="telephone">Téléphone</option>
                                <option value="portail">Portail</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
                        <textarea
                            required
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            rows={3}
                            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Sévérité</label>
                        <div className="flex gap-2">
                            {['mineure', 'majeure', 'critique'].map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setForm({ ...form, severity: s })}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition capitalize
                                        ${form.severity === s ? SEVERITY_BADGE[s] : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                        {['majeure', 'critique'].includes(form.severity) && (
                            <p className="text-xs text-orange-600 mt-1">
                                Une non-conformité sera automatiquement créée pour cette réclamation.
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Annuler</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
                            {loading ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Modal clôture ────────────────────────────────────────────────────────────
function CloseComplaintModal({ complaint, onClose, onSuccess }) {
    const [resolution, setResolution]   = useState('');
    const [rating, setRating]           = useState(0);
    const [loading, setLoading]         = useState(false);

    const submit = async () => {
        if (!resolution || !rating) return;
        setLoading(true);
        try {
            await axios.post(`/qualite/reclamations/${complaint.id}/cloture`, {
                resolution,
                satisfaction_rating: rating,
            });
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
                    <h3 className="text-lg font-semibold text-gray-900">Clôturer la réclamation</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Réclamation {complaint.reference} — {complaint.customer_name}</p>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Résolution *</label>
                        <textarea
                            value={resolution}
                            onChange={e => setResolution(e.target.value)}
                            rows={3}
                            placeholder="Décrire la résolution apportée..."
                            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Satisfaction client</label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`text-3xl transition ${star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Annuler</button>
                        <button
                            onClick={submit}
                            disabled={!resolution || !rating || loading}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                            {loading ? 'Clôture...' : 'Clôturer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CustomerComplaints() {
    const { complaints } = usePage().props;

    const [showNew, setShowNew]       = useState(false);
    const [closing, setClosing]       = useState(null);

    const refresh = () => router.reload({ only: ['complaints'] });

    // Statistiques
    const total      = complaints.total;
    const closedData = complaints.data.filter(c => c.status === 'clos');
    const avgSat     = closedData.length
        ? (closedData.reduce((a, c) => a + (c.satisfaction_rating ?? 0), 0) / closedData.length).toFixed(1)
        : '—';

    return (
        <AppLayout>
            <Head title="Réclamations clients — Qualité ISO 9001" />

            <div className="p-6 max-w-screen-xl mx-auto space-y-5">
                {/* En-tête */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Réclamations clients</h1>
                        <p className="text-sm text-gray-500">{total} réclamation{total > 1 ? 's' : ''}</p>
                    </div>
                    <button
                        onClick={() => setShowNew(true)}
                        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                    >
                        + Nouvelle réclamation
                    </button>
                </div>

                {/* Statistiques rapides */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total', value: total, color: 'blue' },
                        { label: 'En traitement', value: complaints.data.filter(c => c.status === 'en_traitement').length, color: 'orange' },
                        { label: 'Clôturées', value: complaints.data.filter(c => c.status === 'clos').length, color: 'green' },
                        { label: 'Satisfaction moy.', value: avgSat !== '—' ? `${avgSat}/5` : '—', color: 'purple' },
                    ].map(s => (
                        <div key={s.label} className={`bg-white rounded-xl border shadow-sm p-4`}>
                            <p className="text-xs text-gray-500">{s.label}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Tableau */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Réf.</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Canal</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sévérité</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NC liée</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Satisfaction</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reçu le</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {complaints.data.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center text-gray-400">Aucune réclamation.</td>
                                    </tr>
                                )}
                                {complaints.data.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.reference}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{c.customer_name}</p>
                                            {c.customer_contact && <p className="text-xs text-gray-400">{c.customer_contact}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-xs capitalize text-gray-600">{c.channel}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${SEVERITY_BADGE[c.severity]}`}>
                                                {c.severity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                                                {STATUS_LABELS[c.status] ?? c.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {c.nonconformity
                                                ? <a href={`/qualite/non-conformites/${c.nonconformity_id}`} className="text-purple-600 hover:underline font-mono">
                                                    {c.nonconformity.reference}
                                                  </a>
                                                : <span className="text-gray-400">—</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            {c.satisfaction_rating
                                                ? <StarDisplay value={c.satisfaction_rating} />
                                                : <span className="text-gray-400 text-xs">—</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {new Date(c.received_at).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {c.status !== 'clos' && (
                                                <button
                                                    onClick={() => setClosing(c)}
                                                    className="text-green-600 hover:underline text-xs"
                                                >
                                                    Clôturer
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showNew && <NewComplaintModal onClose={() => setShowNew(false)} onSuccess={refresh} />}
            {closing && <CloseComplaintModal complaint={closing} onClose={() => setClosing(null)} onSuccess={refresh} />}
        </AppLayout>
    );
}
export { CustomerComplaints };
