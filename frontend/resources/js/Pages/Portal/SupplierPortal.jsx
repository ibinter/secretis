import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';

// ── Utilitaires ───────────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n ?? 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const STATUS_BADGE = {
    envoye:        'bg-indigo-100 text-indigo-700',
    accuse:        'bg-yellow-100 text-yellow-800',
    livre_partiel: 'bg-orange-100 text-orange-700',
    livre:         'bg-green-100 text-green-700',
    facture:       'bg-purple-100 text-purple-700',
    clos:          'bg-gray-100 text-gray-600',
};

const STATUS_LABELS = {
    envoye: 'Envoyé', accuse: 'Accusé réception', livre_partiel: 'Livraison partielle',
    livre: 'Livré', facture: 'Facturé', clos: 'Clôturé',
};

// ── Page de connexion ─────────────────────────────────────────────────────────

function LoginView() {
    const { data, setData, post, processing, errors } = useForm({
        email: '', password: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/supplier-portal/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo / En-tête */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4">
                        <span className="text-3xl">🏢</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Portail Fournisseurs</h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Accédez à vos appels d'offres, commandes et factures
                    </p>
                </div>

                {/* Formulaire */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Adresse email</label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={e => setData('email', e.target.value)}
                                placeholder="votre@email.com"
                                className="w-full mt-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                required
                                autoComplete="email"
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Mot de passe</label>
                            <input
                                type="password"
                                value={data.password}
                                onChange={e => setData('password', e.target.value)}
                                placeholder="••••••••"
                                className="w-full mt-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-50"
                        >
                            {processing ? 'Connexion…' : 'Se connecter'}
                        </button>
                    </form>
                    <p className="text-center text-xs text-gray-400 mt-6">
                        Vos identifiants vous ont été fournis par le service achats de votre partenaire.
                        <br />Pour toute question, contactez-les directement.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Navigation du portail ─────────────────────────────────────────────────────

function PortalNav({ activeView, setView, stats, supplier }) {
    const navItems = [
        { id: 'dashboard', label: 'Tableau de bord', icon: '🏠' },
        { id: 'rfqs',      label: 'Appels d\'offres', icon: '📢', badge: stats?.rfqs_pending },
        { id: 'orders',    label: 'Mes commandes',   icon: '📦', badge: stats?.orders_to_ack },
        { id: 'invoices',  label: 'Mes factures',    icon: '🧾', badge: stats?.invoices_to_send },
    ];

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                            P
                        </div>
                        <span className="font-semibold text-gray-800">Portail Fournisseurs</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setView(item.id)}
                                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                                    activeView === item.id
                                        ? 'bg-purple-600 text-white'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                                {item.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-medium text-gray-800">{supplier?.company_name}</p>
                            <p className="text-xs text-gray-400">{supplier?.portal_email}</p>
                        </div>
                        <button
                            onClick={() => router.post('/supplier-portal/logout')}
                            className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded border border-gray-200 hover:border-red-200"
                        >
                            Déconnexion
                        </button>
                    </div>
                </div>
                {/* Mobile nav */}
                <div className="md:hidden flex gap-1 pb-2 overflow-x-auto">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => setView(item.id)}
                            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                                activeView === item.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {item.icon} {item.label}
                            {item.badge > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </header>
    );
}

// ── Vue Dashboard ─────────────────────────────────────────────────────────────

function DashboardView({ supplier, stats, active_rfqs, pending_ack, pending_invoice, active_orders, setView }) {
    return (
        <div className="space-y-6">
            {/* Bienvenue */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
                <h2 className="text-xl font-bold">Bonjour, {supplier?.contact_name ?? supplier?.company_name} 👋</h2>
                <p className="text-purple-100 mt-1 text-sm">Voici un résumé de votre activité avec nous.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    {[
                        { label: 'AO à répondre',  value: stats?.rfqs_pending ?? 0 },
                        { label: 'Commandes actives', value: stats?.orders_active ?? 0 },
                        { label: 'Accusés requis',   value: stats?.orders_to_ack ?? 0 },
                        { label: 'Factures à déposer', value: stats?.invoices_to_send ?? 0 },
                    ].map(s => (
                        <div key={s.label} className="bg-white/20 rounded-xl p-3 text-center backdrop-blur">
                            <p className="text-2xl font-bold">{s.value}</p>
                            <p className="text-purple-100 text-xs mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {pending_ack?.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-yellow-800 mb-3">
                            📬 Accusés de réception requis ({pending_ack.length})
                        </h3>
                        <div className="space-y-2">
                            {pending_ack.slice(0, 3).map(po => (
                                <div key={po.id} className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-yellow-100">
                                    <div>
                                        <p className="text-xs font-medium text-gray-800 font-mono">{po.po_number}</p>
                                        <p className="text-xs text-gray-500">{fmt(po.total_amount_xof)} XOF</p>
                                    </div>
                                    <button
                                        onClick={() => router.post(`/supplier-portal/orders/${po.id}/acknowledge`)}
                                        className="text-xs px-3 py-1.5 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600"
                                    >
                                        Accuser
                                    </button>
                                </div>
                            ))}
                        </div>
                        {pending_ack.length > 3 && (
                            <button onClick={() => setView('orders')} className="text-xs text-yellow-700 mt-2 hover:underline">
                                +{pending_ack.length - 3} autres →
                            </button>
                        )}
                    </div>
                )}

                {pending_invoice?.length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-purple-800 mb-3">
                            🧾 Factures à déposer ({pending_invoice.length})
                        </h3>
                        <div className="space-y-2">
                            {pending_invoice.slice(0, 3).map(po => (
                                <div key={po.id} className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-purple-100">
                                    <div>
                                        <p className="text-xs font-medium text-gray-800 font-mono">{po.po_number}</p>
                                        <p className="text-xs text-gray-500">{fmt(po.total_amount_xof)} XOF</p>
                                    </div>
                                    <button onClick={() => setView('orders')}
                                        className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
                                        Déposer
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {active_rfqs?.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-green-800 mb-3">
                            📢 Appels d'offres ouverts ({active_rfqs.length})
                        </h3>
                        <div className="space-y-2">
                            {active_rfqs.slice(0, 3).map(rfq => (
                                <div key={rfq.id} className="bg-white rounded-lg p-2.5 border border-green-100">
                                    <p className="text-xs font-medium text-gray-800">{rfq.title}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-xs text-gray-500">
                                            {rfq.days_left > 0 ? `${rfq.days_left}j restants` : 'Clôturé'}
                                        </p>
                                        {rfq.responded
                                            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Répondu ✓</span>
                                            : <button onClick={() => setView('rfqs')} className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-lg hover:bg-green-700">Répondre</button>
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Vue AO ────────────────────────────────────────────────────────────────────

function RfqsView({ rfqs }) {
    const [responding, setResponding] = useState(null);
    const { data, setData, post, processing } = useForm({
        items: [],
        validity_days: 30,
        delivery_days: '',
        payment_terms: '',
        notes: '',
    });

    const openRespond = (rfq) => {
        const items = (rfq.items ?? []).map(i => ({
            description: i.description,
            qty: i.qty,
            unit: i.unit,
            unit_price: 0,
            delivery_days: '',
        }));
        setData({ ...data, items });
        setResponding(rfq);
    };

    const submitQuotation = (e) => {
        e.preventDefault();
        post(`/supplier-portal/rfqs/${responding.id}/respond`, {
            onSuccess: () => setResponding(null),
        });
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Appels d'offres en cours</h2>
            {rfqs?.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
                    <p className="text-3xl mb-2">📭</p>
                    <p>Aucun appel d'offres ouvert pour le moment.</p>
                </div>
            )}
            {(rfqs ?? []).map(rfq => (
                <div key={rfq.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-sm text-purple-600">{rfq.rfq_number}</span>
                                    {rfq.has_responded && (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                            ✓ Offre soumise
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-semibold text-gray-900">{rfq.title}</h3>
                                {rfq.description && <p className="text-sm text-gray-500 mt-1">{rfq.description}</p>}
                                <div className="mt-2 text-xs text-gray-400">
                                    📦 {(rfq.items ?? []).length} article(s) —
                                    ⏰ Date limite : {fmtDate(rfq.closing_date)}
                                    {rfq.days_left > 0
                                        ? <span className={`ml-2 font-semibold ${rfq.days_left < 3 ? 'text-red-500' : 'text-green-600'}`}>({rfq.days_left}j restants)</span>
                                        : <span className="ml-2 text-red-500 font-semibold">(Clôturé)</span>
                                    }
                                </div>
                            </div>
                            {!rfq.has_responded && rfq.days_left > 0 && (
                                <button onClick={() => openRespond(rfq)}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 shrink-0">
                                    Soumettre une offre
                                </button>
                            )}
                        </div>

                        {rfq.has_responded && rfq.my_quotation && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 text-sm">
                                <p className="font-medium text-green-800">Votre offre : {rfq.my_quotation.quotation_number}</p>
                                <p className="text-green-700">Montant : {fmt(rfq.my_quotation.total_amount)} XOF —
                                    Soumis le {fmtDate(rfq.my_quotation.submitted_at)}</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Modal soumission offre */}
            {responding && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900">Soumettre une offre — {responding.title}</h2>
                            <button onClick={() => setResponding(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                        </div>
                        <form onSubmit={submitQuotation} className="p-6 space-y-5">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Votre prix pour chaque article</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left px-3 py-2 font-medium">Désignation</th>
                                                <th className="text-right px-3 py-2 font-medium">Qté</th>
                                                <th className="text-left px-3 py-2 font-medium">Unité</th>
                                                <th className="text-right px-3 py-2 font-medium">Prix unitaire (XOF) *</th>
                                                <th className="text-right px-3 py-2 font-medium">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.items.map((item, idx) => (
                                                <tr key={idx} className="border-t border-gray-100">
                                                    <td className="px-3 py-2 font-medium">{item.description}</td>
                                                    <td className="px-3 py-2 text-right text-gray-500">{item.qty}</td>
                                                    <td className="px-3 py-2 text-gray-500">{item.unit}</td>
                                                    <td className="px-3 py-2">
                                                        <input type="number" min="0" required value={item.unit_price}
                                                            onChange={e => {
                                                                const items = [...data.items];
                                                                items[idx] = { ...items[idx], unit_price: parseFloat(e.target.value) || 0 };
                                                                setData('items', items);
                                                            }}
                                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-right text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-medium">
                                                        {fmt((item.qty || 0) * (item.unit_price || 0))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50">
                                            <tr>
                                                <td colSpan={4} className="px-3 py-2 text-right font-bold text-gray-800">Total HT</td>
                                                <td className="px-3 py-2 text-right font-bold text-purple-700">
                                                    {fmt(data.items.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0), 0))} XOF
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Délai de livraison (jours)</label>
                                    <input type="number" min="1" value={data.delivery_days}
                                        onChange={e => setData('delivery_days', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Validité offre (jours)</label>
                                    <input type="number" min="1" value={data.validity_days}
                                        onChange={e => setData('validity_days', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Conditions de paiement</label>
                                    <input type="text" placeholder="ex: 30 jours net" value={data.payment_terms}
                                        onChange={e => setData('payment_terms', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Notes / Remarques</label>
                                <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2}
                                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Conditions particulières, garanties, références…" />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setResponding(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Annuler</button>
                                <button type="submit" disabled={processing}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                                    {processing ? 'Envoi…' : 'Soumettre l\'offre'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Vue Commandes ─────────────────────────────────────────────────────────────

function OrdersView({ orders }) {
    const [invoicing, setInvoicing] = useState(null);

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Mes commandes</h2>
            {orders?.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
                    <p className="text-3xl mb-2">📦</p>
                    <p>Aucune commande pour le moment.</p>
                </div>
            )}
            {(orders ?? []).map(po => (
                <div key={po.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono font-semibold text-gray-800">{po.po_number}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[po.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                        {STATUS_LABELS[po.status] ?? po.status}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600">
                                    Montant : <strong>{fmt(po.total_amount_xof)} XOF</strong>
                                </div>
                                <div className="mt-1 text-xs text-gray-400 space-y-0.5">
                                    <div>Paiement : {po.payment_terms_days} jours</div>
                                    <div>Livraison prévue : {fmtDate(po.expected_delivery_date)}</div>
                                    {po.delivery_address && <div>Adresse : {po.delivery_address}</div>}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                {po.status === 'envoye' && (
                                    <button onClick={() => router.post(`/supplier-portal/orders/${po.id}/acknowledge`)}
                                        className="text-xs px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600">
                                        📬 Accuser réception
                                    </button>
                                )}
                                {['livre', 'livre_partiel', 'accuse'].includes(po.status) && !po.has_invoice && (
                                    <button onClick={() => setInvoicing(po)}
                                        className="text-xs px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
                                        🧾 Déposer la facture
                                    </button>
                                )}
                                {po.has_invoice && (
                                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium text-center">
                                        ✓ Facture déposée
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Modal dépôt facture */}
            {invoicing && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-bold text-gray-900">Déposer une facture</h2>
                            <p className="text-sm text-gray-500 mt-1">BC : {invoicing.po_number} — {fmt(invoicing.total_amount_xof)} XOF</p>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                router.post(`/supplier-portal/orders/${invoicing.id}/invoice`, formData, {
                                    onSuccess: () => setInvoicing(null),
                                });
                            }}
                            encType="multipart/form-data"
                            className="p-6 space-y-4"
                        >
                            <div>
                                <label className="text-sm font-medium text-gray-700">N° de facture</label>
                                <input type="text" name="invoice_number" placeholder="FAC-2026-001"
                                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Fichier PDF de la facture *</label>
                                <input type="file" name="invoice_file" accept=".pdf" required
                                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                <p className="text-xs text-gray-400 mt-1">Format PDF uniquement, taille max : 10 Mo</p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setInvoicing(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Annuler</button>
                                <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                                    Déposer la facture
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function SupplierPortal(props) {
    const { view: initialView = 'login' } = props;
    const [currentView, setCurrentView] = useState(initialView);

    // Non connecté
    if (currentView === 'login' || !props.supplier) {
        return (
            <>
                <Head title="Portail Fournisseurs" />
                <LoginView />
            </>
        );
    }

    return (
        <>
            <Head title={`Portail Fournisseurs — ${props.supplier?.company_name}`} />
            <div className="min-h-screen bg-gray-50">
                <PortalNav
                    activeView={currentView}
                    setView={setCurrentView}
                    stats={props.stats}
                    supplier={props.supplier}
                />
                <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {currentView === 'dashboard' && (
                        <DashboardView
                            supplier={props.supplier}
                            stats={props.stats}
                            active_rfqs={props.active_rfqs}
                            pending_ack={props.pending_ack}
                            pending_invoice={props.pending_invoice}
                            active_orders={props.active_orders}
                            setView={setCurrentView}
                        />
                    )}
                    {currentView === 'rfqs' && (
                        <RfqsView rfqs={props.active_rfqs} />
                    )}
                    {(currentView === 'orders' || currentView === 'invoices') && (
                        <OrdersView orders={props.active_orders ?? []} />
                    )}
                </main>
            </div>
        </>
    );
}
export { SupplierPortal };
