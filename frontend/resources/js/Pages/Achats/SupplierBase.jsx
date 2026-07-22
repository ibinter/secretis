import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
    prospect:   'bg-gray-100 text-gray-600',
    actif:      'bg-green-100 text-green-700',
    suspendu:   'bg-orange-100 text-orange-700',
    blackliste: 'bg-red-100 text-red-700',
};

const CATEGORY_LABELS = {
    materiel: 'Matériel', services: 'Services', consommables: 'Consommables',
    travaux: 'Travaux', it: 'IT', autre: 'Autre',
};

const CATEGORY_COLORS = {
    materiel: 'bg-blue-50 text-blue-700', services: 'bg-purple-50 text-purple-700',
    consommables: 'bg-teal-50 text-teal-700', travaux: 'bg-amber-50 text-amber-700',
    it: 'bg-indigo-50 text-indigo-700', autre: 'bg-gray-50 text-gray-600',
};

function Stars({ rating, max = 5, onChange }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: max }, (_, i) => (
                <button
                    key={i}
                    type={onChange ? 'button' : undefined}
                    onClick={() => onChange?.(i + 1)}
                    className={`text-lg ${i < rating ? 'text-amber-400' : 'text-gray-200'} ${onChange ? 'hover:text-amber-300 cursor-pointer' : 'cursor-default'}`}
                >
                    ★
                </button>
            ))}
        </div>
    );
}

// ── Modal création fournisseur ────────────────────────────────────────────────

function CreateSupplierModal({ onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        company_name: '', legal_form: '', country: 'Côte d\'Ivoire', city: '',
        address: '', contact_name: '', email: '', phone: '', website: '',
        tax_number: '', rccm: '', bank_name: '', bank_iban: '', bank_swift: '',
        category: 'services', payment_terms_days: 30, currency_code: 'XOF', notes: '',
    });

    const [tab, setTab] = useState('general');
    const tabs = [
        { id: 'general',  label: 'Informations' },
        { id: 'banking',  label: 'Coordonnées bancaires' },
        { id: 'contract', label: 'Conditions' },
    ];

    const submit = (e) => {
        e.preventDefault();
        post('/procurement/suppliers', { onSuccess: () => onClose() });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">Nouveau fournisseur</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                {/* Onglets */}
                <div className="flex border-b border-gray-200 px-6 pt-4">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`mr-4 pb-2 text-sm font-medium border-b-2 transition ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={submit} className="p-6 space-y-4">
                    {tab === 'general' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-gray-700">Raison sociale *</label>
                                    <input type="text" value={data.company_name} onChange={e => setData('company_name', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                                    {errors.company_name && <p className="text-red-500 text-xs mt-1">{errors.company_name}</p>}
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Forme juridique</label>
                                    <input type="text" placeholder="SARL, SA, GIE…" value={data.legal_form} onChange={e => setData('legal_form', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Catégorie *</label>
                                    <select value={data.category} onChange={e => setData('category', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Pays</label>
                                    <input type="text" value={data.country} onChange={e => setData('country', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Ville</label>
                                    <input type="text" value={data.city} onChange={e => setData('city', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-gray-700">Adresse</label>
                                    <input type="text" value={data.address} onChange={e => setData('address', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Contact principal</label>
                                    <input type="text" value={data.contact_name} onChange={e => setData('contact_name', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Email</label>
                                    <input type="email" value={data.email} onChange={e => setData('email', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Téléphone</label>
                                    <input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">NIF</label>
                                    <input type="text" value={data.tax_number} onChange={e => setData('tax_number', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">RCCM</label>
                                    <input type="text" value={data.rccm} onChange={e => setData('rccm', e.target.value)}
                                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'banking' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Banque</label>
                                <input type="text" value={data.bank_name} onChange={e => setData('bank_name', e.target.value)}
                                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">SWIFT / BIC</label>
                                <input type="text" value={data.bank_swift} onChange={e => setData('bank_swift', e.target.value)}
                                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-sm font-medium text-gray-700">IBAN / Numéro de compte</label>
                                <input type="text" value={data.bank_iban} onChange={e => setData('bank_iban', e.target.value)}
                                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                    )}

                    {tab === 'contract' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Délai de paiement (jours)</label>
                                <select value={data.payment_terms_days} onChange={e => setData('payment_terms_days', parseInt(e.target.value))}
                                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    {[30, 45, 60, 90].map(d => <option key={d} value={d}>{d} jours</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Devise</label>
                                <select value={data.currency_code} onChange={e => setData('currency_code', e.target.value)}
                                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    {['XOF', 'EUR', 'USD', 'GBP', 'XAF'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="text-sm font-medium text-gray-700">Notes internes</label>
                                <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={3}
                                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between pt-2">
                        <div className="flex gap-2">
                            {tabs.map((t, i) => i > 0 && (
                                <button key={t.id} type="button" onClick={() => setTab(tabs[i - 1 < 0 ? 0 : i - 1].id)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">
                                    ←
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">Annuler</button>
                            <button type="submit" disabled={processing} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                {processing ? 'Enregistrement…' : 'Créer le fournisseur'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Modal évaluation ──────────────────────────────────────────────────────────

function EvalModal({ supplier, onClose }) {
    const { data, setData, post, processing } = useForm({
        quality_score: 3, delivery_score: 3, price_score: 3, communication_score: 3,
        comments: '', recommend: true,
    });

    const submit = (e) => {
        e.preventDefault();
        post(`/procurement/suppliers/${supplier.id}/evaluate`, { onSuccess: () => onClose() });
    };

    const criteria = [
        { key: 'quality_score',       label: 'Qualité des produits/services' },
        { key: 'delivery_score',      label: 'Respect des délais de livraison' },
        { key: 'price_score',         label: 'Compétitivité des prix' },
        { key: 'communication_score', label: 'Communication et réactivité' },
    ];

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900">Évaluer {supplier.company_name}</h2>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    {criteria.map(c => (
                        <div key={c.key} className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">{c.label}</label>
                            <Stars rating={data[c.key]} onChange={v => setData(c.key, v)} />
                        </div>
                    ))}
                    <div>
                        <label className="text-sm font-medium text-gray-700">Commentaires</label>
                        <textarea value={data.comments} onChange={e => setData('comments', e.target.value)} rows={3}
                            className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={data.recommend} onChange={e => setData('recommend', e.target.checked)} className="rounded" />
                        <span className="text-sm text-gray-700">Je recommande ce fournisseur</span>
                    </label>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Annuler</button>
                        <button type="submit" disabled={processing} className="px-6 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
                            {processing ? 'Envoi…' : 'Enregistrer l\'évaluation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function SupplierBase({ suppliers, filters }) {
    const [showCreate, setShowCreate] = useState(false);
    const [evaluating, setEvaluating] = useState(null);

    const items = suppliers?.data ?? [];

    return (
        <AuthenticatedLayout>
            <Head title="Base fournisseurs" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* En-tête */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Base fournisseurs</h1>
                        <p className="text-sm text-gray-500 mt-1">{suppliers?.total ?? 0} fournisseur(s)</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowCreate(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                            + Nouveau fournisseur
                        </button>
                    </div>
                </div>

                {/* Filtres */}
                <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200">
                    <input
                        type="text"
                        placeholder="Rechercher…"
                        defaultValue={filters?.search ?? ''}
                        onKeyDown={e => e.key === 'Enter' && router.get('/procurement/suppliers', { ...filters, search: e.target.value }, { preserveState: true, replace: true })}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-56 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <select value={filters?.status ?? ''} onChange={e => router.get('/procurement/suppliers', { ...filters, status: e.target.value || undefined }, { preserveState: true, replace: true })}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="">Tous les statuts</option>
                        <option value="prospect">Prospect</option>
                        <option value="actif">Actif</option>
                        <option value="suspendu">Suspendu</option>
                        <option value="blackliste">Blacklisté</option>
                    </select>
                    <select value={filters?.category ?? ''} onChange={e => router.get('/procurement/suppliers', { ...filters, category: e.target.value || undefined }, { preserveState: true, replace: true })}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="">Toutes les catégories</option>
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </div>

                {/* Tableau */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {items.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">
                            <p className="text-4xl mb-3">🏢</p>
                            <p>Aucun fournisseur trouvé.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">N°</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Raison sociale</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Catégorie</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Contact</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Notation</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Statut</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600">Portail</th>
                                    <th className="py-3 px-4 font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(supplier => (
                                    <tr key={supplier.id} className="border-b border-gray-100 hover:bg-blue-50/20">
                                        <td className="py-3 px-4 font-mono text-xs text-gray-400">{supplier.supplier_number}</td>
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-gray-800">{supplier.company_name}</div>
                                            {supplier.legal_form && <div className="text-xs text-gray-400">{supplier.legal_form}</div>}
                                            <div className="text-xs text-gray-400">{supplier.city}{supplier.country ? `, ${supplier.country}` : ''}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${CATEGORY_COLORS[supplier.category] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {CATEGORY_LABELS[supplier.category] ?? supplier.category}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 text-xs">
                                            <div>{supplier.contact_name}</div>
                                            <div>{supplier.email}</div>
                                            <div>{supplier.phone}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Stars rating={supplier.rating} />
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[supplier.status] ?? 'bg-gray-100'}`}>
                                                {supplier.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className={`w-3 h-3 rounded-full mx-auto ${supplier.portal_access ? 'bg-green-400' : 'bg-gray-300'}`}
                                                title={supplier.portal_access ? 'Accès portail actif' : 'Pas d\'accès portail'} />
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-1.5 justify-center">
                                                <a href={`/procurement/suppliers/${supplier.id}/scorecard`}
                                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                                                    Scorecard
                                                </a>
                                                <button onClick={() => setEvaluating(supplier)}
                                                    className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200">
                                                    Évaluer
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const email = prompt('Email portail fournisseur :');
                                                        if (email) router.post(`/procurement/suppliers/${supplier.id}/portal`, { portal_email: email });
                                                    }}
                                                    className={`text-xs px-2 py-1 rounded ${supplier.portal_access ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                                                    {supplier.portal_access ? 'Désactiver' : 'Portail'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showCreate && <CreateSupplierModal onClose={() => setShowCreate(false)} />}
            {evaluating && <EvalModal supplier={evaluating} onClose={() => setEvaluating(null)} />}
        </AuthenticatedLayout>
    );
}
