import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_STEPS = [
    { key: 'brouillon', label: 'Brouillon', icon: '✏️' },
    { key: 'soumis',    label: 'Soumis',    icon: '📤' },
    { key: 'approuve',  label: 'Approuvé',  icon: '✅' },
    { key: 'converti',  label: 'Converti',  icon: '🔄' },
];

const PRIORITY_BADGE = {
    normale:     'bg-gray-100 text-gray-700',
    urgente:     'bg-orange-100 text-orange-700',
    tres_urgente:'bg-red-100 text-red-700',
};

const PRIORITY_LABEL = {
    normale: 'Normale', urgente: 'Urgente', tres_urgente: 'Très urgente',
};

const STATUS_BADGE = {
    brouillon: 'bg-gray-100 text-gray-600',
    soumis:    'bg-purple-100 text-purple-700',
    approuve:  'bg-green-100 text-green-700',
    refuse:    'bg-red-100 text-red-700',
    annule:    'bg-slate-100 text-slate-600',
    converti:  'bg-purple-100 text-purple-700',
};

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n ?? 0);

// ── Stepper ───────────────────────────────────────────────────────────────────

function StatusStepper({ currentStatus }) {
    const idx = STATUS_STEPS.findIndex(s => s.key === currentStatus);
    return (
        <div className="flex items-center gap-1">
            {STATUS_STEPS.map((step, i) => (
                <React.Fragment key={step.key}>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition ${
                        i < idx  ? 'bg-purple-100 text-purple-700' :
                        i === idx ? 'bg-purple-600 text-white' :
                                    'bg-gray-100 text-gray-400'
                    }`}>
                        <span>{step.icon}</span>
                        <span className="hidden sm:inline">{step.label}</span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                        <div className={`h-0.5 w-4 ${i < idx ? 'bg-purple-300' : 'bg-gray-200'}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

// ── Formulaire item ───────────────────────────────────────────────────────────

function ItemRow({ item, index, onChange, onRemove }) {
    return (
        <div className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="col-span-4">
                <input
                    type="text"
                    placeholder="Description *"
                    value={item.description}
                    onChange={e => onChange(index, 'description', e.target.value)}
                    className="w-full input input-sm border border-gray-300 rounded px-2 py-1.5 text-sm"
                    required
                />
            </div>
            <div className="col-span-2">
                <input
                    type="number"
                    placeholder="Qté *"
                    value={item.qty}
                    min="0"
                    step="0.01"
                    onChange={e => onChange(index, 'qty', parseFloat(e.target.value) || 0)}
                    className="w-full input input-sm border border-gray-300 rounded px-2 py-1.5 text-sm"
                    required
                />
            </div>
            <div className="col-span-2">
                <input
                    type="text"
                    placeholder="Unité *"
                    value={item.unit}
                    onChange={e => onChange(index, 'unit', e.target.value)}
                    className="w-full input input-sm border border-gray-300 rounded px-2 py-1.5 text-sm"
                    required
                />
            </div>
            <div className="col-span-2">
                <input
                    type="number"
                    placeholder="Prix est."
                    value={item.unit_price_est}
                    min="0"
                    onChange={e => onChange(index, 'unit_price_est', parseFloat(e.target.value) || 0)}
                    className="w-full input input-sm border border-gray-300 rounded px-2 py-1.5 text-sm"
                />
            </div>
            <div className="col-span-1 text-right text-sm font-medium text-gray-600 pt-2">
                {fmt((item.qty || 0) * (item.unit_price_est || 0))}
            </div>
            <div className="col-span-1 flex justify-center">
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-red-400 hover:text-red-600 mt-1"
                    title="Supprimer la ligne"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

// ── Modal création DA ─────────────────────────────────────────────────────────

function CreatePrModal({ onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        priority: 'normale',
        needed_by_date: '',
        justification: '',
        items: [{ description: '', qty: 1, unit: 'unité', unit_price_est: 0 }],
    });

    const addItem = () =>
        setData('items', [...data.items, { description: '', qty: 1, unit: 'unité', unit_price_est: 0 }]);

    const updateItem = (idx, field, val) => {
        const items = [...data.items];
        items[idx] = { ...items[idx], [field]: val };
        setData('items', items);
    };

    const removeItem = (idx) =>
        setData('items', data.items.filter((_, i) => i !== idx));

    const totalEst = data.items.reduce((s, i) => s + (i.qty || 0) * (i.unit_price_est || 0), 0);

    const submit = (e) => {
        e.preventDefault();
        post('/procurement/purchase-requests', { onSuccess: () => onClose() });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">Nouvelle demande d'achat</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <form onSubmit={submit} className="p-6 space-y-5">
                    {/* Titre + priorité */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="label-sm">Titre de la demande *</label>
                            <input
                                type="text"
                                value={data.title}
                                onChange={e => setData('title', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                required
                            />
                            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                        </div>
                        <div>
                            <label className="label-sm">Priorité *</label>
                            <select
                                value={data.priority}
                                onChange={e => setData('priority', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            >
                                <option value="normale">Normale</option>
                                <option value="urgente">Urgente</option>
                                <option value="tres_urgente">Très urgente</option>
                            </select>
                        </div>
                    </div>

                    {/* Date besoin */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-sm">Date de besoin</label>
                            <input
                                type="date"
                                value={data.needed_by_date}
                                onChange={e => setData('needed_by_date', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="label-sm">Description</label>
                            <input
                                type="text"
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-semibold text-gray-700">Articles / Prestations *</label>
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-purple-600 text-sm font-medium hover:text-purple-800"
                            >
                                + Ajouter une ligne
                            </button>
                        </div>

                        {/* En-têtes */}
                        <div className="grid grid-cols-12 gap-2 px-3 mb-1">
                            <div className="col-span-4 text-xs text-gray-500 font-medium">Désignation</div>
                            <div className="col-span-2 text-xs text-gray-500 font-medium">Quantité</div>
                            <div className="col-span-2 text-xs text-gray-500 font-medium">Unité</div>
                            <div className="col-span-2 text-xs text-gray-500 font-medium">Prix est. (XOF)</div>
                            <div className="col-span-1 text-xs text-gray-500 font-medium text-right">Total</div>
                            <div className="col-span-1" />
                        </div>

                        <div className="space-y-2">
                            {data.items.map((item, idx) => (
                                <ItemRow
                                    key={idx}
                                    item={item}
                                    index={idx}
                                    onChange={updateItem}
                                    onRemove={removeItem}
                                />
                            ))}
                        </div>

                        <div className="mt-3 text-right text-sm font-bold text-gray-800">
                            Total estimé : {fmt(totalEst)} XOF
                        </div>
                    </div>

                    {/* Justification */}
                    <div>
                        <label className="label-sm">Justification</label>
                        <textarea
                            value={data.justification}
                            onChange={e => setData('justification', e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Expliquez pourquoi cette dépense est nécessaire…"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                        >
                            {processing ? 'Enregistrement…' : 'Créer la DA'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Modal approbation ─────────────────────────────────────────────────────────

function ApproveModal({ pr, onClose }) {
    const [reason, setReason] = useState('');
    const [action, setAction] = useState('approve');
    const [loading, setLoading] = useState(false);

    const submit = () => {
        setLoading(true);
        if (action === 'approve') {
            router.post(`/procurement/purchase-requests/${pr.id}/approve`, {}, {
                onFinish: () => { setLoading(false); onClose(); },
            });
        } else {
            router.post(`/procurement/purchase-requests/${pr.id}/refuse`, { reason }, {
                onFinish: () => { setLoading(false); onClose(); },
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900">
                        Décision sur {pr.pr_number}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">{pr.title}</p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex gap-3">
                        <button
                            onClick={() => setAction('approve')}
                            className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition ${
                                action === 'approve'
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : 'border-gray-200 text-gray-500'
                            }`}
                        >
                            ✅ Approuver
                        </button>
                        <button
                            onClick={() => setAction('refuse')}
                            className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition ${
                                action === 'refuse'
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-gray-200 text-gray-500'
                            }`}
                        >
                            ✖ Refuser
                        </button>
                    </div>

                    {action === 'refuse' && (
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Motif du refus *
                            </label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                rows={3}
                                required
                                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 outline-none"
                                placeholder="Expliquez le motif du refus…"
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">
                            Annuler
                        </button>
                        <button
                            onClick={submit}
                            disabled={loading || (action === 'refuse' && !reason.trim())}
                            className={`px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${
                                action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                            }`}
                        >
                            {loading ? 'Envoi…' : action === 'approve' ? 'Approuver' : 'Refuser'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function PurchaseRequests({ purchase_requests, filters }) {
    const [showCreate, setShowCreate] = useState(false);
    const [approving, setApproving] = useState(null);
    const [search, setSearch] = useState(filters?.search ?? '');

    const applyFilter = (key, val) => {
        router.get('/procurement/purchase-requests', { ...filters, [key]: val || undefined }, {
            preserveState: true, replace: true,
        });
    };

    const items = purchase_requests?.data ?? [];

    return (
        <AuthenticatedLayout>
            <Head title="Demandes d'achat" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* En-tête */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Demandes d'achat</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {purchase_requests?.total ?? 0} demande(s) au total
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                    >
                        + Nouvelle DA
                    </button>
                </div>

                {/* Filtres */}
                <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200">
                    <input
                        type="text"
                        placeholder="Rechercher une DA…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && applyFilter('search', search)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <select
                        value={filters?.status ?? ''}
                        onChange={e => applyFilter('status', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="">Tous les statuts</option>
                        <option value="brouillon">Brouillon</option>
                        <option value="soumis">Soumis</option>
                        <option value="approuve">Approuvé</option>
                        <option value="refuse">Refusé</option>
                        <option value="converti">Converti</option>
                    </select>
                    <select
                        value={filters?.priority ?? ''}
                        onChange={e => applyFilter('priority', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="">Toutes les priorités</option>
                        <option value="normale">Normale</option>
                        <option value="urgente">Urgente</option>
                        <option value="tres_urgente">Très urgente</option>
                    </select>
                </div>

                {/* Tableau */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {items.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">
                            <p className="text-4xl mb-3">📋</p>
                            <p>Aucune demande d'achat trouvée.</p>
                            <button
                                onClick={() => setShowCreate(true)}
                                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium"
                            >
                                Créer la première DA
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">N° DA</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Titre</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Demandeur</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Priorité</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600">Montant est.</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date besoin</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Statut</th>
                                    <th className="py-3 px-4 font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(pr => (
                                    <tr key={pr.id} className="border-b border-gray-100 hover:bg-purple-50/30">
                                        <td className="py-3 px-4 font-mono font-medium text-purple-600">
                                            {pr.pr_number}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-medium text-gray-800">{pr.title}</div>
                                            <StatusStepper currentStatus={pr.status} />
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                            {pr.requestor?.name ?? '—'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${PRIORITY_BADGE[pr.priority]}`}>
                                                {PRIORITY_LABEL[pr.priority]}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium">
                                            {fmt(pr.total_estimated_xof)} XOF
                                        </td>
                                        <td className="py-3 px-4 text-gray-500">
                                            {pr.needed_by_date
                                                ? new Date(pr.needed_by_date).toLocaleDateString('fr-FR')
                                                : '—'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[pr.status] ?? 'bg-gray-100'}`}>
                                                {pr.status.charAt(0).toUpperCase() + pr.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-2 justify-center">
                                                {pr.status === 'brouillon' && (
                                                    <button
                                                        onClick={() => router.post(`/procurement/purchase-requests/${pr.id}/submit`)}
                                                        className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                                                    >
                                                        Soumettre
                                                    </button>
                                                )}
                                                {pr.status === 'soumis' && (
                                                    <button
                                                        onClick={() => setApproving(pr)}
                                                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                    >
                                                        Décision
                                                    </button>
                                                )}
                                                {pr.status === 'approuve' && (
                                                    <a
                                                        href={`/procurement/rfqs/create?pr_id=${pr.id}`}
                                                        className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                                                    >
                                                        → AO
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {purchase_requests?.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {Array.from({ length: purchase_requests.last_page }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => router.get('/procurement/purchase-requests', { ...filters, page })}
                                className={`w-8 h-8 rounded text-sm ${
                                    page === purchase_requests.current_page
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Modales */}
            {showCreate && <CreatePrModal onClose={() => setShowCreate(false)} />}
            {approving && <ApproveModal pr={approving} onClose={() => setApproving(null)} />}

        </AuthenticatedLayout>
    );
}
export { PurchaseRequests };
