import React from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell,
} from 'recharts';

// ── Utilitaires ──────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const CATEGORY_LABELS = {
    materiel: 'Matériel', services: 'Services', consommables: 'Consommables',
    travaux: 'Travaux', it: 'IT', autre: 'Autre',
};

const CATEGORY_COLORS = {
    materiel: '#3b82f6', services: '#8b5cf6', consommables: '#10b981',
    travaux: '#f59e0b', it: '#6366f1', autre: '#94a3b8',
};

const STATUS_LABELS = {
    brouillon: 'Brouillon', approuve: 'Approuvé', envoye: 'Envoyé',
    accuse: 'Accusé', livre_partiel: 'Livraison partielle', livre: 'Livré',
    facture: 'Facturé', clos: 'Clôturé', annule: 'Annulé',
};

const STATUS_COLORS = {
    brouillon: 'bg-gray-100 text-gray-700',
    approuve: 'bg-purple-100 text-purple-700',
    envoye: 'bg-indigo-100 text-indigo-700',
    accuse: 'bg-yellow-100 text-yellow-800',
    livre_partiel: 'bg-orange-100 text-orange-800',
    livre: 'bg-green-100 text-green-700',
    facture: 'bg-purple-100 text-purple-700',
    clos: 'bg-slate-100 text-slate-700',
    annule: 'bg-red-100 text-red-700',
};

const fmt = (n) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n ?? 0);

// ── Composants ───────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color = 'blue' }) {
    const colors = {
        blue:   'bg-purple-50 text-purple-600 border-purple-200',
        green:  'bg-green-50 text-green-600 border-green-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
        amber:  'bg-amber-50 text-amber-600 border-amber-200',
    };
    return (
        <div className={`rounded-xl border p-5 flex gap-4 items-start ${colors[color]}`}>
            <div className="text-3xl">{icon}</div>
            <div>
                <p className="text-sm font-medium opacity-80">{label}</p>
                <p className="text-2xl font-bold mt-0.5">{value}</p>
                {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
            </div>
        </div>
    );
}

function CustomTooltipXOF({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>
                    {p.name} : {fmt(p.value)} XOF
                </p>
            ))}
        </div>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function Dashboard({ kpis, by_category, monthly, late_pos, top_suppliers }) {
    const categoryData = (by_category ?? []).map(c => ({
        name: CATEGORY_LABELS[c.category] ?? c.category,
        total: c.total,
        color: CATEGORY_COLORS[c.category] ?? '#94a3b8',
    }));

    const monthlyData = (monthly ?? []).map(m => ({
        name: MONTHS[m.month - 1],
        total: m.total,
    }));

    return (
        <AuthenticatedLayout>
            <Head title="Tableau de bord Achats" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* ── Titre ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Achats</h1>
                        <p className="text-sm text-gray-500 mt-1">Vue consolidée — {new Date().getFullYear()}</p>
                    </div>
                    <div className="flex gap-2">
                        <a
                            href="/procurement/purchase-requests"
                            className="btn btn-sm bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition"
                        >
                            + Nouvelle DA
                        </a>
                        <a
                            href="/procurement/rfqs"
                            className="btn btn-sm bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                        >
                            + Nouvel AO
                        </a>
                    </div>
                </div>

                {/* ── KPIs ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                        icon="📋"
                        label="DA en attente d'approbation"
                        value={kpis?.pending_prs ?? 0}
                        color="amber"
                    />
                    <KpiCard
                        icon="💰"
                        label="Économies réalisées"
                        value={`${fmt(kpis?.savings_xof)} XOF`}
                        sub="Estimé vs réel"
                        color="green"
                    />
                    <KpiCard
                        icon="🏢"
                        label="Fournisseurs actifs"
                        value={kpis?.active_suppliers ?? 0}
                        color="blue"
                    />
                    <KpiCard
                        icon="📦"
                        label="BC en cours"
                        value={kpis?.active_pos ?? 0}
                        color="purple"
                    />
                </div>

                {/* ── Graphiques ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Dépenses par catégorie */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-base font-semibold text-gray-800 mb-4">
                            Dépenses par catégorie fournisseur
                        </h2>
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={categoryData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis
                                        tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`}
                                        tick={{ fontSize: 10 }}
                                    />
                                    <Tooltip content={<CustomTooltipXOF />} />
                                    <Bar dataKey="total" name="Dépenses" radius={[4, 4, 0, 0]}>
                                        {categoryData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-60 flex items-center justify-center text-gray-400">
                                Aucune donnée pour cette période
                            </div>
                        )}
                    </div>

                    {/* Évolution mensuelle */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-base font-semibold text-gray-800 mb-4">
                            Évolution des dépenses (12 mois)
                        </h2>
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis
                                    tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`}
                                    tick={{ fontSize: 10 }}
                                />
                                <Tooltip content={<CustomTooltipXOF />} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    name="Dépenses XOF"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── BC en retard ── */}
                {late_pos?.length > 0 && (
                    <div className="bg-white rounded-xl border border-red-200 p-6">
                        <h2 className="text-base font-semibold text-red-700 mb-4 flex items-center gap-2">
                            <span>⚠️</span> BC en retard de livraison ({late_pos.length})
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-2 px-3 font-medium text-gray-600">N° BC</th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Fournisseur</th>
                                        <th className="text-right py-2 px-3 font-medium text-gray-600">Montant</th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Livraison prévue</th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Retard</th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-600">Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {late_pos.map(po => {
                                        const daysLate = po.expected_delivery_date
                                            ? Math.floor((Date.now() - new Date(po.expected_delivery_date)) / 86400000)
                                            : 0;
                                        return (
                                            <tr key={po.id} className="border-b border-gray-100 hover:bg-red-50/30">
                                                <td className="py-2 px-3">
                                                    <a href={`/procurement/purchase-orders/${po.id}`}
                                                       className="text-purple-600 hover:underline font-mono font-medium">
                                                        {po.po_number}
                                                    </a>
                                                </td>
                                                <td className="py-2 px-3">{po.supplier?.company_name ?? '—'}</td>
                                                <td className="py-2 px-3 text-right font-medium">
                                                    {fmt(po.total_amount_xof)} XOF
                                                </td>
                                                <td className="py-2 px-3 text-gray-500">
                                                    {po.expected_delivery_date
                                                        ? new Date(po.expected_delivery_date).toLocaleDateString('fr-FR')
                                                        : '—'}
                                                </td>
                                                <td className="py-2 px-3">
                                                    <span className="text-red-600 font-semibold">
                                                        +{daysLate}j
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[po.status] ?? 'bg-gray-100'}`}>
                                                        {STATUS_LABELS[po.status] ?? po.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Top 5 fournisseurs ── */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">
                        Top 5 fournisseurs par volume d'achat
                    </h2>
                    <div className="space-y-3">
                        {(top_suppliers ?? []).map((s, idx) => {
                            const maxTotal = top_suppliers[0]?.total ?? 1;
                            const pct = Math.round((s.total / maxTotal) * 100);
                            return (
                                <div key={s.id} className="flex items-center gap-4">
                                    <span className="text-lg font-bold text-gray-300 w-6 text-center">
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <a
                                                href={`/procurement/suppliers/${s.id}`}
                                                className="text-sm font-medium text-gray-800 hover:text-purple-600 truncate"
                                            >
                                                {s.company_name}
                                            </a>
                                            <span className="text-sm font-bold text-gray-700 ml-4 whitespace-nowrap">
                                                {fmt(s.total)} XOF
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full transition-all"
                                                style={{
                                                    width: `${pct}%`,
                                                    backgroundColor: Object.values(CATEGORY_COLORS)[idx] ?? '#3b82f6',
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400 w-20 text-right">
                                        {CATEGORY_LABELS[s.category] ?? s.category}
                                    </span>
                                </div>
                            );
                        })}
                        {!top_suppliers?.length && (
                            <p className="text-gray-400 text-sm text-center py-6">
                                Aucune commande enregistrée cette année.
                            </p>
                        )}
                    </div>
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
export { Dashboard };
