import React, { useState, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
    brouillon: 'bg-gray-100 text-gray-600',
    publie:    'bg-green-100 text-green-700',
    clos:      'bg-purple-100 text-purple-700',
    annule:    'bg-red-100 text-red-600',
};

const CATEGORY_LABELS = {
    materiel: 'Matériel', services: 'Services', consommables: 'Consommables',
    travaux: 'Travaux', it: 'IT', autre: 'Autre',
};

// ── Compte à rebours ──────────────────────────────────────────────────────────

function Countdown({ closingDate }) {
    const diff = new Date(closingDate) - Date.now();
    if (diff <= 0) return <span className="text-red-500 text-xs font-medium">Clôturé</span>;
    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const color = days < 2 ? 'text-red-600' : days < 5 ? 'text-orange-600' : 'text-green-600';
    return (
        <span className={`text-xs font-semibold ${color}`}>
            {days}j {hours}h restants
        </span>
    );
}

// ── Formulaire création AO ────────────────────────────────────────────────────

function CreateRfqModal({ suppliers, onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        closing_date: '',
        items: [{ description: '', qty: 1, unit: 'unité', specifications: '' }],
        evaluation_criteria: [
            { name: 'Qualité technique', weight: 30, type: 'technique' },
            { name: 'Prix', weight: 40, type: 'financier' },
            { name: 'Délai de livraison', weight: 30, type: 'technique' },
        ],
        notes: '',
    });

    const [selectedSuppliers, setSelectedSuppliers] = useState([]);

    const addItem = () =>
        setData('items', [...data.items, { description: '', qty: 1, unit: 'unité', specifications: '' }]);

    const removeItem = (idx) =>
        setData('items', data.items.filter((_, i) => i !== idx));

    const updateItem = (idx, field, val) => {
        const items = [...data.items];
        items[idx] = { ...items[idx], [field]: val };
        setData('items', items);
    };

    const updateCriterion = (idx, field, val) => {
        const criteria = [...data.evaluation_criteria];
        criteria[idx] = { ...criteria[idx], [field]: val };
        setData('evaluation_criteria', criteria);
    };

    const totalWeight = data.evaluation_criteria.reduce((s, c) => s + (parseInt(c.weight) || 0), 0);

    const toggleSupplier = (id) =>
        setSelectedSuppliers(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );

    const submit = (e) => {
        e.preventDefault();
        post('/procurement/rfqs', { onSuccess: () => onClose() });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">Nouvel appel d'offres</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <form onSubmit={submit} className="p-6 space-y-6">
                    {/* Informations générales */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-700">Titre de l'AO *</label>
                            <input
                                type="text"
                                value={data.title}
                                onChange={e => setData('title', e.target.value)}
                                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Date limite de réponse *</label>
                            <input
                                type="datetime-local"
                                value={data.closing_date}
                                onChange={e => setData('closing_date', e.target.value)}
                                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Description</label>
                            <input
                                type="text"
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Articles */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-gray-700">Articles / Prestations *</h3>
                            <button type="button" onClick={addItem} className="text-purple-600 text-sm font-medium">
                                + Ajouter
                            </button>
                        </div>
                        <div className="space-y-2">
                            {data.items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="col-span-5">
                                        <input
                                            type="text"
                                            placeholder="Désignation *"
                                            value={item.description}
                                            onChange={e => updateItem(idx, 'description', e.target.value)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            placeholder="Qté"
                                            value={item.qty}
                                            min="0"
                                            onChange={e => updateItem(idx, 'qty', e.target.value)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            placeholder="Unité"
                                            value={item.unit}
                                            onChange={e => updateItem(idx, 'unit', e.target.value)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            placeholder="Spécifications"
                                            value={item.specifications}
                                            onChange={e => updateItem(idx, 'specifications', e.target.value)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(idx)}
                                            className="text-red-400 hover:text-red-600"
                                        >✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Critères d'évaluation */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-gray-700">
                                Critères d'évaluation
                                <span className={`ml-2 text-xs font-normal ${totalWeight === 100 ? 'text-green-600' : 'text-red-500'}`}>
                                    Total : {totalWeight}% {totalWeight !== 100 && '⚠ Doit être 100%'}
                                </span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setData('evaluation_criteria', [
                                    ...data.evaluation_criteria,
                                    { name: '', weight: 0, type: 'technique' },
                                ])}
                                className="text-purple-600 text-sm font-medium"
                            >
                                + Ajouter
                            </button>
                        </div>
                        <div className="space-y-2">
                            {data.evaluation_criteria.map((c, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-5">
                                        <input
                                            type="text"
                                            placeholder="Nom du critère"
                                            value={c.name}
                                            onChange={e => updateCriterion(idx, 'name', e.target.value)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={c.weight}
                                                onChange={e => updateCriterion(idx, 'weight', parseInt(e.target.value) || 0)}
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                            />
                                            <span className="text-gray-400 text-sm">%</span>
                                        </div>
                                    </div>
                                    <div className="col-span-3">
                                        <select
                                            value={c.type}
                                            onChange={e => updateCriterion(idx, 'type', e.target.value)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                        >
                                            <option value="technique">Technique</option>
                                            <option value="financier">Financier</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => setData('evaluation_criteria',
                                                data.evaluation_criteria.filter((_, i) => i !== idx))}
                                            className="text-red-400 hover:text-red-600 text-sm"
                                        >✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sélection fournisseurs */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Fournisseurs à inviter ({selectedSuppliers.length} sélectionné(s))
                        </h3>
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                            {suppliers?.map(s => (
                                <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-purple-50/50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedSuppliers.includes(s.id)}
                                        onChange={() => toggleSupplier(s.id)}
                                        className="rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800">{s.company_name}</p>
                                        <p className="text-xs text-gray-400">{CATEGORY_LABELS[s.category]} — {s.email ?? '—'}</p>
                                    </div>
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 5 }, (_, i) => (
                                            <span key={i} className={i < s.rating ? 'text-amber-400' : 'text-gray-200'}>★</span>
                                        ))}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-sm font-medium text-gray-700">Notes / Cahier des charges</label>
                        <textarea
                            value={data.notes}
                            onChange={e => setData('notes', e.target.value)}
                            rows={3}
                            className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={processing || totalWeight !== 100}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                        >
                            {processing ? 'Création…' : 'Créer l\'AO'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function RfqManagement({ rfqs, filters, suppliers }) {
    const [showCreate, setShowCreate] = useState(false);
    const [expandedRfq, setExpandedRfq] = useState(null);

    const items = rfqs?.data ?? [];

    return (
        <AuthenticatedLayout>
            <Head title="Appels d'offres" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* En-tête */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Appels d'offres</h1>
                        <p className="text-sm text-gray-500 mt-1">{rfqs?.total ?? 0} AO au total</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                    >
                        + Nouvel AO
                    </button>
                </div>

                {/* Filtres */}
                <div className="flex gap-3 bg-white p-4 rounded-xl border border-gray-200">
                    {['', 'brouillon', 'publie', 'clos', 'annule'].map(s => (
                        <button
                            key={s}
                            onClick={() => router.get('/procurement/rfqs', { status: s || undefined }, { preserveState: true, replace: true })}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                (filters?.status ?? '') === s
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {s === '' ? 'Tous' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Liste des AO */}
                <div className="space-y-4">
                    {items.length === 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                            <p className="text-4xl mb-3">📢</p>
                            <p>Aucun appel d'offres trouvé.</p>
                        </div>
                    )}
                    {items.map(rfq => (
                        <div key={rfq.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {/* Résumé */}
                            <div
                                className="p-5 cursor-pointer hover:bg-gray-50/50 transition"
                                onClick={() => setExpandedRfq(expandedRfq === rfq.id ? null : rfq.id)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-sm text-purple-600 font-medium">{rfq.rfq_number}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[rfq.status]}`}>
                                                {rfq.status}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-900">{rfq.title}</h3>
                                        {rfq.description && (
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{rfq.description}</p>
                                        )}
                                    </div>
                                    <div className="text-right text-sm shrink-0">
                                        <div className="text-gray-500 mb-1">
                                            {new Date(rfq.closing_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </div>
                                        <Countdown closingDate={rfq.closing_date} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                    <span>📦 {(rfq.items ?? []).length} article(s)</span>
                                    <span>🏢 {rfq.rfq_suppliers_count ?? 0} fournisseur(s) invité(s)</span>
                                    {rfq.purchase_request && (
                                        <span>📋 DA : {rfq.purchase_request.pr_number}</span>
                                    )}
                                </div>
                            </div>

                            {/* Détail expandé */}
                            {expandedRfq === rfq.id && (
                                <div className="border-t border-gray-200 p-5 space-y-5 bg-gray-50/50">
                                    {/* Articles */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Articles</h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-100">
                                                    <tr>
                                                        <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Désignation</th>
                                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Qté</th>
                                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Unité</th>
                                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Spécifications</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(rfq.items ?? []).map((item, idx) => (
                                                        <tr key={idx} className="border-t border-gray-200">
                                                            <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                                                            <td className="px-3 py-2 font-medium">{item.description}</td>
                                                            <td className="px-3 py-2">{item.qty}</td>
                                                            <td className="px-3 py-2 text-gray-500">{item.unit}</td>
                                                            <td className="px-3 py-2 text-gray-500">{item.specifications ?? '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Fournisseurs invités */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Fournisseurs invités</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {(rfq.rfq_suppliers ?? []).map(rs => (
                                                <span
                                                    key={rs.id}
                                                    className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                                                        rs.status === 'repondu'     ? 'bg-green-100 text-green-700' :
                                                        rs.status === 'selectionne' ? 'bg-purple-100 text-purple-700' :
                                                        rs.status === 'elimine'     ? 'bg-red-100 text-red-600' :
                                                                                      'bg-gray-100 text-gray-600'
                                                    }`}
                                                >
                                                    {rs.supplier?.company_name} • {rs.status}
                                                </span>
                                            ))}
                                            {!rfq.rfq_suppliers?.length && (
                                                <span className="text-sm text-gray-400">Aucun fournisseur invité.</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        {rfq.status === 'publie' && (
                                            <a
                                                href={`/procurement/rfqs/${rfq.id}/quotations`}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                                            >
                                                Voir les devis ({(rfq.rfq_suppliers ?? []).filter(s => s.status === 'repondu').length})
                                            </a>
                                        )}
                                        {rfq.status !== 'clos' && rfq.status !== 'annule' && (
                                            <a
                                                href={`/procurement/rfqs/${rfq.id}/compare`}
                                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                                            >
                                                Comparateur de devis
                                            </a>
                                        )}
                                        <button
                                            onClick={() => router.post(`/procurement/rfqs/${rfq.id}/close`)}
                                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                                        >
                                            Clôturer l'AO
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {showCreate && (
                <CreateRfqModal suppliers={suppliers} onClose={() => setShowCreate(false)} />
            )}
        </AuthenticatedLayout>
    );
}
export { RfqManagement };
