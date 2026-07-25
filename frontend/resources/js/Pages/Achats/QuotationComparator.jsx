import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, Legend,
} from 'recharts';

// ── Utilitaires ───────────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n ?? 0);

const SUPPLIER_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ value, max = 100, color }) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-sm font-bold w-10 text-right" style={{ color }}>
                {value?.toFixed(1)}
            </span>
        </div>
    );
}

// ── Carte fournisseur ─────────────────────────────────────────────────────────

function SupplierCard({ quotation, color, isWinner, rank }) {
    return (
        <div className={`rounded-xl border-2 p-4 transition ${
            isWinner
                ? 'border-green-400 bg-green-50'
                : 'border-gray-200 bg-white'
        }`}>
            {isWinner && (
                <div className="text-center mb-2">
                    <span className="text-xs bg-green-500 text-white px-3 py-1 rounded-full font-bold">
                        🏆 Gagnant
                    </span>
                </div>
            )}
            <div
                className="text-center font-bold text-lg mb-1"
                style={{ color }}
            >
                #{rank}
            </div>
            <div className="text-center">
                <p className="font-semibold text-gray-800 text-sm">{quotation.supplier_name}</p>
                <p className="text-xs text-gray-500 font-mono">{quotation.quotation_number}</p>
            </div>
            <div className="mt-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{quotation.total_score?.toFixed(1)}</p>
                <p className="text-xs text-gray-400">Score total / 100</p>
            </div>
            <div className="mt-2 text-center">
                <p className="text-sm font-semibold text-gray-700">{fmt(quotation.total_amount)} XOF</p>
            </div>
        </div>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function QuotationComparator({ rfq, quotations: initialQuotations, evaluation_results }) {
    const [technicalScores, setTechnicalScores] = useState(
        () => Object.fromEntries((initialQuotations ?? []).map(q => [q.id, q.technical_score ?? 0]))
    );
    const [results, setResults] = useState(evaluation_results ?? []);
    const [justification, setJustification] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);

    const quotations = initialQuotations ?? [];

    // Trier par score total
    const ranked = useMemo(() =>
        [...results].sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0)),
    [results]);

    // Données Radar
    const radarData = useMemo(() => {
        const axes = ['Score financier', 'Score technique', 'Score total'];
        return axes.map(axis => {
            const row = { subject: axis };
            ranked.forEach((q, i) => {
                row[q.supplier_name] = axis === 'Score financier' ? q.financial_score :
                                       axis === 'Score technique' ? q.technical_score :
                                       q.total_score;
            });
            return row;
        });
    }, [ranked]);

    // Évaluer les devis
    const evaluate = async () => {
        setIsEvaluating(true);
        const scores = {};
        quotations.forEach(q => { scores[q.id] = technicalScores[q.id] ?? 0; });

        router.post(
            `/procurement/rfqs/${rfq.id}/evaluate`,
            { technical_scores: scores },
            {
                onSuccess: (page) => {
                    setResults(page.props.results ?? []);
                    setIsEvaluating(false);
                },
                onError: () => setIsEvaluating(false),
                preserveState: true,
            }
        );
    };

    // Sélectionner le gagnant
    const selectWinner = () => {
        if (!selectedId || !justification.trim()) return;
        setIsSelecting(true);
        router.post(
            `/procurement/rfqs/${rfq.id}/select`,
            { quotation_id: selectedId, justification },
            { onFinish: () => setIsSelecting(false) }
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Comparateur — ${rfq.rfq_number}`} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* En-tête */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <a href="/procurement/rfqs" className="text-purple-600 hover:underline text-sm">
                                ← Appels d'offres
                            </a>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Comparateur de devis</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {rfq.rfq_number} — {rfq.title} — {quotations.length} offre(s) reçue(s)
                        </p>
                    </div>
                </div>

                {quotations.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
                        <p className="text-4xl mb-3">📭</p>
                        <p>Aucune offre reçue pour cet appel d'offres.</p>
                    </div>
                ) : (
                    <>
                        {/* Tableau de comparaison */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="p-5 border-b border-gray-200">
                                <h2 className="text-base font-semibold text-gray-800">
                                    Tableau de comparaison
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left py-3 px-4 font-medium text-gray-600 w-48">
                                                Critère
                                            </th>
                                            {quotations.map((q, idx) => (
                                                <th key={q.id} className="py-3 px-4 font-medium text-center" style={{ color: SUPPLIER_COLORS[idx] }}>
                                                    <div>{q.supplier?.company_name ?? q.supplier_id}</div>
                                                    <div className="text-xs font-normal text-gray-400">{q.quotation_number}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Prix total */}
                                        <tr className="border-t border-gray-100">
                                            <td className="py-3 px-4 font-medium text-gray-700">💰 Montant total HT</td>
                                            {quotations.map((q, idx) => {
                                                const isMin = q.total_amount_xof === Math.min(...quotations.map(x => x.total_amount_xof));
                                                return (
                                                    <td key={q.id} className={`py-3 px-4 text-center font-semibold ${isMin ? 'text-green-700' : 'text-gray-700'}`}>
                                                        {fmt(q.total_amount_xof)} XOF
                                                        {isMin && <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓ Moins cher</span>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        {/* Délai */}
                                        <tr className="border-t border-gray-100 bg-gray-50/30">
                                            <td className="py-3 px-4 font-medium text-gray-700">📅 Délai livraison</td>
                                            {quotations.map(q => (
                                                <td key={q.id} className="py-3 px-4 text-center text-gray-600">
                                                    {q.delivery_days ? `${q.delivery_days} j` : '—'}
                                                </td>
                                            ))}
                                        </tr>
                                        {/* Validité */}
                                        <tr className="border-t border-gray-100">
                                            <td className="py-3 px-4 font-medium text-gray-700">📋 Validité offre</td>
                                            {quotations.map(q => (
                                                <td key={q.id} className="py-3 px-4 text-center text-gray-600">
                                                    {q.validity_days ? `${q.validity_days} j` : '—'}
                                                </td>
                                            ))}
                                        </tr>
                                        {/* Score financier */}
                                        <tr className="border-t border-gray-100 bg-purple-50/30">
                                            <td className="py-3 px-4 font-semibold text-purple-700">📊 Score financier</td>
                                            {quotations.map((q, idx) => {
                                                const res = results.find(r => r.quotation_id === q.id);
                                                return (
                                                    <td key={q.id} className="py-3 px-4">
                                                        <ScoreBar value={res?.financial_score ?? 0} color={SUPPLIER_COLORS[idx]} />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        {/* Score technique (saisie manuelle) */}
                                        <tr className="border-t border-gray-100 bg-purple-50/30">
                                            <td className="py-3 px-4 font-semibold text-purple-700">🔬 Score technique (0-100)</td>
                                            {quotations.map((q, idx) => (
                                                <td key={q.id} className="py-3 px-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={technicalScores[q.id] ?? 0}
                                                        onChange={e => setTechnicalScores(prev => ({
                                                            ...prev, [q.id]: parseFloat(e.target.value) || 0,
                                                        }))}
                                                        className="w-full border border-purple-200 rounded px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-purple-400 outline-none"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                        {/* Score total */}
                                        <tr className="border-t-2 border-gray-300 bg-gray-50">
                                            <td className="py-3 px-4 font-bold text-gray-800">🏆 Score total pondéré</td>
                                            {quotations.map((q, idx) => {
                                                const res = results.find(r => r.quotation_id === q.id);
                                                const isWinner = ranked[0]?.quotation_id === q.id;
                                                return (
                                                    <td key={q.id} className={`py-3 px-4 text-center ${isWinner ? 'bg-green-50' : ''}`}>
                                                        {res ? (
                                                            <div>
                                                                <span
                                                                    className="text-2xl font-bold"
                                                                    style={{ color: SUPPLIER_COLORS[idx] }}
                                                                >
                                                                    {res.total_score?.toFixed(1)}
                                                                </span>
                                                                <span className="text-gray-400 text-sm">/100</span>
                                                                {isWinner && <div className="text-xs text-green-600 font-bold mt-1">🏆 #1</div>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 flex justify-end">
                                <button
                                    onClick={evaluate}
                                    disabled={isEvaluating}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {isEvaluating ? 'Calcul en cours…' : '🔄 Calculer les scores'}
                                </button>
                            </div>
                        </div>

                        {/* Podium + Radar */}
                        {ranked.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Podium */}
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <h2 className="text-base font-semibold text-gray-800 mb-4">Classement</h2>
                                    <div className="grid grid-cols-3 gap-3">
                                        {ranked.slice(0, 3).map((q, idx) => (
                                            <SupplierCard
                                                key={q.quotation_id}
                                                quotation={q}
                                                color={SUPPLIER_COLORS[idx]}
                                                isWinner={idx === 0}
                                                rank={idx + 1}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Radar */}
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <h2 className="text-base font-semibold text-gray-800 mb-4">
                                        Visualisation des scores
                                    </h2>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <RadarChart data={radarData}>
                                            <PolarGrid />
                                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                                            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                                            <Tooltip />
                                            <Legend />
                                            {ranked.map((q, idx) => (
                                                <Radar
                                                    key={q.quotation_id}
                                                    name={q.supplier_name}
                                                    dataKey={q.supplier_name}
                                                    stroke={SUPPLIER_COLORS[idx]}
                                                    fill={SUPPLIER_COLORS[idx]}
                                                    fillOpacity={0.1}
                                                    strokeWidth={2}
                                                />
                                            ))}
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Sélection du gagnant */}
                        {rfq.status !== 'clos' && ranked.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h2 className="text-base font-semibold text-gray-800 mb-4">
                                    Sélectionner le fournisseur retenu
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Fournisseur sélectionné *</label>
                                        <div className="mt-2 space-y-2">
                                            {ranked.map((q, idx) => (
                                                <label key={q.quotation_id} className="flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition hover:bg-gray-50"
                                                    style={{ borderColor: selectedId === q.quotation_id ? SUPPLIER_COLORS[idx] : '#e5e7eb' }}>
                                                    <input
                                                        type="radio"
                                                        name="winner"
                                                        value={q.quotation_id}
                                                        checked={selectedId === q.quotation_id}
                                                        onChange={() => setSelectedId(q.quotation_id)}
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-800">{q.supplier_name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            Score : {q.total_score?.toFixed(1)}/100 — {fmt(q.total_amount)} XOF
                                                        </p>
                                                    </div>
                                                    {idx === 0 && (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                                            Recommandé
                                                        </span>
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">
                                            Justification de la sélection *
                                        </label>
                                        <textarea
                                            value={justification}
                                            onChange={e => setJustification(e.target.value)}
                                            rows={6}
                                            className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="Expliquez les raisons de ce choix (qualité technique, rapport qualité/prix, délais, références…)"
                                        />
                                        <button
                                            onClick={selectWinner}
                                            disabled={!selectedId || !justification.trim() || isSelecting}
                                            className="mt-3 w-full px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {isSelecting ? 'Sélection en cours…' : '✅ Confirmer la sélection et notifier les fournisseurs'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {rfq.status === 'clos' && rfq.selected_quotation_id && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                                <p className="text-green-700 font-semibold">
                                    ✅ Appel d'offres clôturé — Fournisseur sélectionné et notifié.
                                </p>
                                <a
                                    href="/procurement/purchase-orders"
                                    className="mt-3 inline-block px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                                >
                                    Créer le bon de commande →
                                </a>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
export { QuotationComparator };
