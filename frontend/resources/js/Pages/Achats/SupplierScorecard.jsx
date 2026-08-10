import React from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
} from 'recharts';

// ── Utilitaires ───────────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n ?? 0);

function Stars({ rating, max = 5 }) {
    return (
        <span className="flex gap-0.5">
            {Array.from({ length: max }, (_, i) => (
                <span key={i} className={`text-lg ${i < Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
            ))}
        </span>
    );
}

function TrendBadge({ trend }) {
    const config = {
        hausse: { icon: '↑', label: 'En hausse', cls: 'bg-green-100 text-green-700' },
        baisse: { icon: '↓', label: 'En baisse', cls: 'bg-red-100 text-red-600' },
        stable: { icon: '→', label: 'Stable',    cls: 'bg-gray-100 text-gray-600' },
    };
    const c = config[trend] ?? config.stable;
    return (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${c.cls}`}>
            {c.icon} {c.label}
        </span>
    );
}

function StatCard({ label, value, sub, color = 'blue' }) {
    const colors = {
        blue:  'border-purple-200 bg-purple-50 text-purple-700',
        green: 'border-green-200 bg-green-50 text-green-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        red:   'border-red-200 bg-red-50 text-red-700',
    };
    return (
        <div className={`rounded-xl border p-4 ${colors[color]}`}>
            <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
        </div>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function SupplierScorecard({
    supplier,
    evaluations,
    averages,
    trend,
    total_evaluations,
    total_orders,
    total_spend_xof,
    on_time_orders,
    late_orders,
    on_time_rate,
}) {
    // Données pour le radar
    const radarData = [
        { subject: 'Qualité',       value: averages?.quality ?? 0 },
        { subject: 'Délai',         value: averages?.delivery ?? 0 },
        { subject: 'Prix',          value: averages?.price ?? 0 },
        { subject: 'Communication', value: averages?.communication ?? 0 },
    ];

    // Données pour l'évolution du score dans le temps
    const lineData = [...(evaluations ?? [])]
        .slice(0, 12)
        .reverse()
        .map((e, idx) => ({
            date: new Date(e.evaluation_date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
            score: parseFloat(e.overall_score),
        }));

    return (
        <AuthenticatedLayout>
            <Head title={`Scorecard — ${supplier?.company_name}`} />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* En-tête fournisseur */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <a href="/achats/fournisseurs" className="text-purple-600 text-sm hover:underline">← Base fournisseurs</a>
                                <span className="text-gray-300">/</span>
                                <span className="text-sm text-gray-500">{supplier?.supplier_number}</span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">{supplier?.company_name}</h1>
                            <div className="flex flex-wrap gap-3 mt-3">
                                <Stars rating={supplier?.rating ?? 0} />
                                <TrendBadge trend={trend} />
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    supplier?.status === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {supplier?.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                {supplier?.contact_name} — {supplier?.email} — {supplier?.phone}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black text-purple-600">{averages?.overall?.toFixed(1)}</p>
                            <p className="text-xs text-gray-400">Score moyen / 5</p>
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Évaluations" value={total_evaluations ?? 0} color="blue" />
                    <StatCard
                        label="Volume d'achat"
                        value={`${fmt(total_spend_xof)} XOF`}
                        sub={`${total_orders ?? 0} commandes`}
                        color="green"
                    />
                    <StatCard
                        label="Livraisons à l'heure"
                        value={on_time_rate != null ? `${on_time_rate}%` : '—'}
                        sub={`${on_time_orders ?? 0} sur ${(on_time_orders ?? 0) + (late_orders ?? 0)}`}
                        color="amber"
                    />
                    <StatCard
                        label="Livraisons en retard"
                        value={late_orders ?? 0}
                        color={late_orders > 0 ? 'red' : 'green'}
                    />
                </div>

                {/* Graphiques */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Radar */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-base font-semibold text-gray-800 mb-4">Performance par critère</h2>
                        <ResponsiveContainer width="100%" height={260}>
                            <RadarChart data={radarData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontWeight: 500 }} />
                                <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                                <Radar
                                    name={supplier?.company_name}
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    fill="#3b82f6"
                                    fillOpacity={0.15}
                                    strokeWidth={2}
                                />
                                <Tooltip formatter={(v) => [`${v.toFixed(2)}/5`, '']} />
                            </RadarChart>
                        </ResponsiveContainer>

                        {/* Barres de score */}
                        <div className="mt-4 space-y-3">
                            {[
                                { key: 'quality',       label: 'Qualité',        icon: '⭐' },
                                { key: 'delivery',      label: 'Délais',         icon: '📅' },
                                { key: 'price',         label: 'Prix',           icon: '💰' },
                                { key: 'communication', label: 'Communication',  icon: '💬' },
                            ].map(c => {
                                const val = averages?.[c.key] ?? 0;
                                return (
                                    <div key={c.key} className="flex items-center gap-3">
                                        <span className="text-sm w-28 text-gray-600">{c.icon} {c.label}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full bg-purple-500 transition-all"
                                                style={{ width: `${(val / 5) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-purple-600 w-8 text-right">
                                            {val?.toFixed(1)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Évolution du score */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-base font-semibold text-gray-800 mb-4">
                            Évolution du score (12 dernières évaluations)
                        </h2>
                        {lineData.length > 1 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={lineData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                    <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                                    <Tooltip formatter={(v) => [`${v.toFixed(2)}/5`, 'Score']} />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        name="Score global"
                                        stroke="#3b82f6"
                                        strokeWidth={2.5}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                    {/* Ligne référence 3/5 */}
                                    <Line
                                        dataKey={() => 3}
                                        stroke="#e5e7eb"
                                        strokeDasharray="4 4"
                                        name="Seuil minimum"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-60 flex items-center justify-center text-gray-400">
                                Pas encore assez d'évaluations pour afficher une tendance.
                            </div>
                        )}
                    </div>
                </div>

                {/* Historique des évaluations */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-200">
                        <h2 className="text-base font-semibold text-gray-800">Historique des évaluations</h2>
                    </div>
                    {evaluations?.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">
                            Aucune évaluation enregistrée.
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600">Qualité</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600">Délais</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600">Prix</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600">Communication</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600">Score global</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600">Commentaires</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600">Recommande</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(evaluations ?? []).map(e => (
                                    <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                                        <td className="py-3 px-4 text-gray-500">
                                            {new Date(e.evaluation_date).toLocaleDateString('fr-FR')}
                                        </td>
                                        {['quality_score', 'delivery_score', 'price_score', 'communication_score'].map(k => (
                                            <td key={k} className="py-3 px-4 text-center">
                                                <span className="font-bold text-gray-700">{e[k]}</span>
                                                <span className="text-gray-400">/5</span>
                                            </td>
                                        ))}
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                                                parseFloat(e.overall_score) >= 4 ? 'bg-green-100 text-green-700' :
                                                parseFloat(e.overall_score) >= 3 ? 'bg-purple-100 text-purple-700' :
                                                                                   'bg-red-100 text-red-600'
                                            }`}>
                                                {parseFloat(e.overall_score).toFixed(1)}/5
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 max-w-xs truncate">
                                            {e.comments || '—'}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {e.recommend ? '✅' : '❌'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
export { SupplierScorecard };
