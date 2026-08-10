import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_STEPS = [
    { key: 'brouillon',     label: 'Brouillon',    icon: '✏️' },
    { key: 'approuve',      label: 'Approuvé',     icon: '✅' },
    { key: 'envoye',        label: 'Envoyé',       icon: '📤' },
    { key: 'accuse',        label: 'Accusé',       icon: '📬' },
    { key: 'livre_partiel', label: 'Part. livré',  icon: '📦' },
    { key: 'livre',         label: 'Livré',        icon: '✔️' },
    { key: 'facture',       label: 'Facturé',      icon: '🧾' },
    { key: 'clos',          label: 'Clôturé',      icon: '🔒' },
];

const STATUS_BADGE = {
    brouillon:     'bg-gray-100 text-gray-600',
    approuve:      'bg-purple-100 text-purple-700',
    envoye:        'bg-indigo-100 text-indigo-700',
    accuse:        'bg-yellow-100 text-yellow-800',
    livre_partiel: 'bg-orange-100 text-orange-700',
    livre:         'bg-green-100 text-green-700',
    facture:       'bg-purple-100 text-purple-700',
    clos:          'bg-slate-100 text-slate-600',
    annule:        'bg-red-100 text-red-600',
};

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n ?? 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

// ── Stepper BC ────────────────────────────────────────────────────────────────

function PoStepper({ status }) {
    if (status === 'annule') return <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Annulé</span>;
    const idx = STATUS_STEPS.findIndex(s => s.key === status);
    return (
        <div className="flex items-center gap-0.5 flex-wrap">
            {STATUS_STEPS.map((step, i) => (
                <React.Fragment key={step.key}>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition ${
                        i < idx  ? 'text-purple-600 font-medium' :
                        i === idx ? 'bg-purple-600 text-white font-semibold' :
                                    'text-gray-300'
                    }`}>
                        <span>{step.icon}</span>
                        <span className="hidden md:inline">{step.label}</span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                        <span className={`text-xs ${i < idx ? 'text-purple-300' : 'text-gray-200'}`}>›</span>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

// ── Modal création BC ─────────────────────────────────────────────────────────

function CreatePoModal({ suppliers, onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        supplier_id: '',
        payment_terms_days: 30,
        delivery_address: '',
        expected_delivery_date: '',
        notes: '',
        items: [{ description: '', qty: 1, unit: 'unité', unit_price: 0, tax_rate: 18 }],
    });

    const addItem = () =>
        setData('items', [...data.items, { description: '', qty: 1, unit: 'unité', unit_price: 0, tax_rate: 18 }]);

    const updateItem = (idx, field, val) => {
        const items = [...data.items];
        items[idx] = { ...items[idx], [field]: val };
        setData('items', items);
    };

    const removeItem = (idx) =>
        setData('items', data.items.filter((_, i) => i !== idx));

    const subtotal = data.items.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0), 0);
    const tva      = data.items.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0) * ((i.tax_rate || 0) / 100), 0);

    const submit = (e) => {
        e.preventDefault();
        post('/achats/commandes', { onSuccess: () => onClose() });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">Nouveau bon de commande</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <form onSubmit={submit} className="p-6 space-y-5">
                    {/* Fournisseur + conditions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Fournisseur *</label>
                            <select
                                value={data.supplier_id}
                                onChange={e => setData('supplier_id', e.target.value)}
                                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                required
                            >
                                <option value="">Sélectionner un fournisseur…</option>
                                {suppliers?.map(s => (
                                    <option key={s.id} value={s.id}>{s.company_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Délai de paiement</label>
                            <select
                                value={data.payment_terms_days}
                                onChange={e => setData('payment_terms_days', parseInt(e.target.value))}
                                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            >
                                {[30, 45, 60, 90].map(d => (
                                    <option key={d} value={d}>{d} jours</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Date de livraison prévue</label>
                            <input
                                type="date"
                                value={data.expected_delivery_date}
                                onChange={e => setData('expected_delivery_date', e.target.value)}
                                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Adresse de livraison</label>
                            <input
                                type="text"
                                value={data.delivery_address}
                                onChange={e => setData('delivery_address', e.target.value)}
                                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Articles */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-semibold text-gray-700">Articles *</label>
                            <button type="button" onClick={addItem} className="text-purple-600 text-sm font-medium">
                                + Ajouter
                            </button>
                        </div>
                        <div className="space-y-2">
                            {data.items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 items-center">
                                    <div className="col-span-4">
                                        <input type="text" placeholder="Désignation *" value={item.description}
                                            onChange={e => updateItem(idx, 'description', e.target.value)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" required />
                                    </div>
                                    <div className="col-span-2">
                                        <input type="number" placeholder="Qté" value={item.qty} min="0" step="0.01"
                                            onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                    </div>
                                    <div className="col-span-1">
                                        <input type="text" placeholder="Unité" value={item.unit}
                                            onChange={e => updateItem(idx, 'unit', e.target.value)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                    </div>
                                    <div className="col-span-2">
                                        <input type="number" placeholder="Prix unit." value={item.unit_price} min="0"
                                            onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                    </div>
                                    <div className="col-span-1">
                                        <div className="flex items-center gap-1">
                                            <input type="number" placeholder="TVA" value={item.tax_rate} min="0" max="100"
                                                onChange={e => updateItem(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                                            <span className="text-gray-400 text-xs">%</span>
                                        </div>
                                    </div>
                                    <div className="col-span-1 text-right text-xs font-medium text-gray-600">
                                        {fmt((item.qty || 0) * (item.unit_price || 0))}
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 text-right space-y-1">
                            <p className="text-sm text-gray-500">Sous-total HT : <span className="font-medium text-gray-700">{fmt(subtotal)} XOF</span></p>
                            <p className="text-sm text-gray-500">TVA : <span className="font-medium text-gray-700">{fmt(tva)} XOF</span></p>
                            <p className="text-base font-bold text-gray-900">Total TTC : {fmt(subtotal + tva)} XOF</p>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-sm font-medium text-gray-700">Notes</label>
                        <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2}
                            className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">Annuler</button>
                        <button type="submit" disabled={processing} className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                            {processing ? 'Création…' : 'Créer le BC'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Modal bon de réception ────────────────────────────────────────────────────

function GoodsReceiptModal({ po, onClose }) {
    const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState(
        (po.items ?? []).map((item, idx) => ({
            po_item_ref: idx,
            description: item.description,
            qty_ordered: item.qty,
            qty_received: item.qty,
            qty_rejected: 0,
            rejection_reason: '',
        }))
    );
    const [loading, setLoading] = useState(false);

    const updateItem = (idx, field, val) => {
        const copy = [...items];
        copy[idx] = { ...copy[idx], [field]: val };
        setItems(copy);
    };

    const submit = () => {
        setLoading(true);
        router.post(`/achats/commandes/${po.id}/reception`, {
            received_date: receivedDate,
            notes,
            items_received: items,
        }, { onFinish: () => { setLoading(false); onClose(); } });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">Bon de réception — {po.po_number}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>
                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Date de réception *</label>
                            <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)}
                                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Contrôle des quantités</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Désignation</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600">Qté commandée</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600">Qté reçue</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600">Qté rejetée</th>
                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Motif rejet</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => {
                                        const diff = item.qty_received - item.qty_ordered;
                                        return (
                                            <tr key={idx} className={`border-t border-gray-200 ${diff < 0 ? 'bg-orange-50/30' : ''}`}>
                                                <td className="px-3 py-2 font-medium">{item.description}</td>
                                                <td className="px-3 py-2 text-right text-gray-500">{item.qty_ordered}</td>
                                                <td className="px-3 py-2">
                                                    <input type="number" min="0" value={item.qty_received}
                                                        onChange={e => updateItem(idx, 'qty_received', parseFloat(e.target.value) || 0)}
                                                        className={`w-20 border rounded px-2 py-1 text-sm text-right ${
                                                            diff < 0 ? 'border-orange-400 bg-orange-50' : 'border-gray-300'
                                                        }`} />
                                                    {diff < 0 && (
                                                        <span className="ml-1 text-xs text-orange-600 font-medium">{diff}</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" min="0" value={item.qty_rejected}
                                                        onChange={e => updateItem(idx, 'qty_rejected', parseFloat(e.target.value) || 0)}
                                                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                                                </td>
                                                <td className="px-3 py-2">
                                                    {item.qty_rejected > 0 && (
                                                        <input type="text" placeholder="Motif…"
                                                            value={item.rejection_reason}
                                                            onChange={e => updateItem(idx, 'rejection_reason', e.target.value)}
                                                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700">Observations</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                            className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">Annuler</button>
                        <button onClick={submit} disabled={loading}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                            {loading ? 'Enregistrement…' : 'Valider la réception'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function PurchaseOrders({ purchase_orders, filters, suppliers }) {
    const [showCreate, setShowCreate] = useState(false);
    const [receiving, setReceiving] = useState(null);

    const items = purchase_orders?.data ?? [];

    return (
        <AuthenticatedLayout>
            <Head title="Bons de commande" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* En-tête */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Bons de commande</h1>
                        <p className="text-sm text-gray-500 mt-1">{purchase_orders?.total ?? 0} BC au total</p>
                    </div>
                    <button onClick={() => setShowCreate(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                        + Nouveau BC
                    </button>
                </div>

                {/* Filtres */}
                <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200">
                    <select
                        value={filters?.status ?? ''}
                        onChange={e => router.get('/achats/commandes', { ...filters, status: e.target.value || undefined }, { preserveState: true, replace: true })}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">Tous les statuts</option>
                        {Object.entries(STATUS_BADGE).map(([k]) => (
                            <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1).replace('_', ' ')}</option>
                        ))}
                    </select>
                    <select
                        value={filters?.supplier_id ?? ''}
                        onChange={e => router.get('/achats/commandes', { ...filters, supplier_id: e.target.value || undefined }, { preserveState: true, replace: true })}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">Tous les fournisseurs</option>
                        {suppliers?.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                    </select>
                </div>

                {/* Tableau */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {items.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">
                            <p className="text-4xl mb-3">📦</p>
                            <p>Aucun bon de commande trouvé.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">N° BC</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Fournisseur</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600">Montant TTC</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Livraison prévue</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Statut / Progression</th>
                                    <th className="py-3 px-4 font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(po => {
                                    const isLate = po.expected_delivery_date
                                        && new Date(po.expected_delivery_date) < new Date()
                                        && !['livre', 'facture', 'clos', 'annule'].includes(po.status);

                                    return (
                                        <tr key={po.id} className={`border-b border-gray-100 hover:bg-purple-50/20 ${isLate ? 'bg-red-50/20' : ''}`}>
                                            <td className="py-3 px-4">
                                                <div className="font-mono font-medium text-purple-600">{po.po_number}</div>
                                                {isLate && <span className="text-xs text-red-500 font-medium">⚠ En retard</span>}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-gray-800">{po.supplier?.company_name}</div>
                                                {po.rfq && <div className="text-xs text-gray-400">AO : {po.rfq.rfq_number}</div>}
                                            </td>
                                            <td className="py-3 px-4 text-right font-semibold">
                                                {fmt(po.total_amount_xof)} XOF
                                            </td>
                                            <td className="py-3 px-4 text-gray-500">
                                                {fmtDate(po.expected_delivery_date)}
                                                {po.actual_delivery_date && (
                                                    <div className="text-xs text-green-600">
                                                        Reçu le {fmtDate(po.actual_delivery_date)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <PoStepper status={po.status} />
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex gap-1.5 justify-center flex-wrap">
                                                    {po.status === 'brouillon' && (
                                                        <button onClick={() => router.post(`/achats/commandes/${po.id}/approuver`)}
                                                            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
                                                            Approuver
                                                        </button>
                                                    )}
                                                    {po.status === 'approuve' && (
                                                        <button onClick={() => router.post(`/achats/commandes/${po.id}/envoyer`)}
                                                            className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
                                                            Envoyer
                                                        </button>
                                                    )}
                                                    {['envoye', 'accuse', 'livre_partiel'].includes(po.status) && (
                                                        <button onClick={() => setReceiving(po)}
                                                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                                                            Réception
                                                        </button>
                                                    )}
                                                    <a href={`/achats/commandes/${po.id}/pdf`}
                                                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                                                        target="_blank">
                                                        PDF
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {purchase_orders?.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {Array.from({ length: purchase_orders.last_page }, (_, i) => i + 1).map(page => (
                            <button key={page}
                                onClick={() => router.get('/achats/commandes', { ...filters, page })}
                                className={`w-8 h-8 rounded text-sm ${page === purchase_orders.current_page ? 'bg-purple-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {showCreate && <CreatePoModal suppliers={suppliers} onClose={() => setShowCreate(false)} />}
            {receiving && <GoodsReceiptModal po={receiving} onClose={() => setReceiving(null)} />}
        </AuthenticatedLayout>
    );
}
export { PurchaseOrders };
