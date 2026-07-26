import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

// ─── Constantes ───────────────────────────────────────────────────────────────
const STATUS_COLORS = { green: '#10B981', orange: '#F59E0B', red: '#EF4444', grey: '#9CA3AF' };
const STATUS_LABELS = { green: 'Conforme', orange: 'Attention', red: 'Hors cible', grey: 'N/A' };

const DEFAULT_INDICATORS = [
    { code: 'IQ-01', name: 'Taux de satisfaction client',           unit: '%',    target_value: 85, alert_threshold: 75, frequency: 'mensuel' },
    { code: 'IQ-02', name: 'Taux de NC critiques',                  unit: '%',    target_value: 0,  alert_threshold: 1,  frequency: 'mensuel' },
    { code: 'IQ-03', name: 'Délai moyen de clôture NC',             unit: 'jours',target_value: 15, alert_threshold: 20, frequency: 'mensuel' },
    { code: 'IQ-04', name: 'Taux de livraison à temps',             unit: '%',    target_value: 95, alert_threshold: 90, frequency: 'mensuel' },
    { code: 'IQ-05', name: 'Taux de réclamations clients',          unit: '%',    target_value: 2,  alert_threshold: 3,  frequency: 'mensuel' },
    { code: 'IQ-06', name: "Taux d'audits réalisés dans les délais",unit: '%',    target_value: 100,alert_threshold: 90, frequency: 'trimestriel' },
];

// ─── Composants ───────────────────────────────────────────────────────────────
function TrendIcon({ values }) {
    if (!values || values.length < 2) return <span className="text-gray-400">→</span>;
    const last = values[values.length - 1].value;
    const prev = values[values.length - 2].value;
    if (last > prev) return <span className="text-green-500 text-lg">↑</span>;
    if (last < prev) return <span className="text-red-500 text-lg">↓</span>;
    return <span className="text-gray-400 text-lg">→</span>;
}

function TrafficLight({ status, size = 'md' }) {
    const s = size === 'lg' ? 'w-5 h-5' : 'w-3 h-3';
    return (
        <span
            className={`inline-block ${s} rounded-full`}
            style={{ backgroundColor: STATUS_COLORS[status] ?? STATUS_COLORS.grey }}
        />
    );
}

function IndicatorCard({ indicator, onClick }) {
    const hasCurrent = indicator.current_value !== null;
    return (
        <button
            onClick={() => onClick(indicator)}
            className="bg-white rounded-xl border shadow-sm p-5 text-left hover:shadow-md transition hover:border-purple-300 w-full"
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="text-xs font-mono text-gray-400">{indicator.code}</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5 leading-tight">{indicator.name}</p>
                </div>
                <TrafficLight status={indicator.status} size="lg" />
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-3xl font-bold text-gray-900">
                        {hasCurrent ? indicator.current_value : '—'}
                        {hasCurrent && <span className="text-base font-normal text-gray-400 ml-1">{indicator.unit}</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Cible : {indicator.target_value ?? '—'} {indicator.unit}
                    </p>
                </div>
                <TrendIcon values={indicator.history ?? []} />
            </div>
            {indicator.period && (
                <p className="text-xs text-gray-400 mt-2">Période : {indicator.period}</p>
            )}
        </button>
    );
}

// ─── Modal saisie de valeur ───────────────────────────────────────────────────
function RecordValueModal({ indicator, onClose, onSuccess }) {
    const [year, setYear]     = useState(new Date().getFullYear());
    const [month, setMonth]   = useState(new Date().getMonth() + 1);
    const [value, setValue]   = useState('');
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!value) return;
        setLoading(true);
        try {
            await axios.post(`/qualite/indicators/${indicator.id}/values`, {
                period_year:  year,
                period_month: month,
                value:        parseFloat(value),
                comment,
            });
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Saisir une valeur</h3>
                        <p className="text-sm text-gray-500">{indicator.code} — {indicator.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Année</label>
                            <input
                                type="number"
                                value={year}
                                onChange={e => setYear(parseInt(e.target.value))}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Mois</label>
                            <select
                                value={month}
                                onChange={e => setMonth(parseInt(e.target.value))}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            >
                                {['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'].map((m, i) => (
                                    <option key={i + 1} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Valeur ({indicator.unit}) — Cible : {indicator.target_value}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            placeholder="0.00"
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Commentaire (optionnel)</label>
                        <textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            rows={2}
                            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                        />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={submit}
                            disabled={!value || loading}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                        >
                            {loading ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Panel historique ─────────────────────────────────────────────────────────
function HistoryPanel({ indicator, onClose, onRecord }) {
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        axios.get(`/qualite/indicators/${indicator.id}/history`)
            .then(r => setHistory(r.data.values))
            .finally(() => setLoading(false));
    }, [indicator.id]);

    const chartData = history?.map(v => ({
        label:  `${String(v.period_month).padStart(2, '0')}/${v.period_year}`,
        value:  v.value,
    })) ?? [];

    return (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-xs text-gray-400">{indicator.code}</p>
                        <h3 className="text-lg font-semibold text-gray-900">{indicator.name}</h3>
                        <p className="text-sm text-gray-500">Cible : {indicator.target_value} {indicator.unit}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onRecord}
                            className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700"
                        >
                            + Saisir
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-gray-400">Chargement...</div>
                ) : chartData.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">Aucune valeur enregistrée.</div>
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                            <Tooltip formatter={(v) => [`${v} ${indicator.unit}`]} />
                            {indicator.target_value !== null && (
                                <ReferenceLine
                                    y={indicator.target_value}
                                    stroke="#10B981"
                                    strokeDasharray="4 2"
                                    label={{ value: 'Cible', position: 'right', fontSize: 10 }}
                                />
                            )}
                            {indicator.alert_threshold !== null && (
                                <ReferenceLine
                                    y={indicator.alert_threshold}
                                    stroke="#F59E0B"
                                    strokeDasharray="4 2"
                                    label={{ value: 'Seuil', position: 'right', fontSize: 10 }}
                                />
                            )}
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                                name={indicator.unit}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}

                {/* Tableau des valeurs */}
                {history && history.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs text-gray-500 border-b">
                                <tr>
                                    <th className="py-2">Période</th>
                                    <th className="py-2">Valeur</th>
                                    <th className="py-2">Commentaire</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {[...history].reverse().map(v => (
                                    <tr key={v.id}>
                                        <td className="py-2">{String(v.period_month).padStart(2,'0')}/{v.period_year}</td>
                                        <td className="py-2 font-semibold">{v.value} {indicator.unit}</td>
                                        <td className="py-2 text-gray-500 text-xs">{v.comment ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Indicators() {
    const { indicators } = usePage().props;

    const [selected, setSelected]     = useState(null);
    const [recording, setRecording]   = useState(null);

    const handleCardClick = (ind) => setSelected(ind);
    const handleRecord    = (ind) => { setSelected(null); setRecording(ind); };
    const handleSuccess   = ()    => router.reload({ only: ['indicators'] });

    return (
        <AppLayout>
            <Head title="Indicateurs qualité — ISO 9001" />

            <div className="p-6 max-w-screen-xl mx-auto space-y-5">
                {/* En-tête */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Indicateurs qualité</h1>
                        <p className="text-sm text-gray-500">Pilotage des indicateurs de performance qualité</p>
                    </div>
                </div>

                {/* Légende statuts */}
                <div className="flex gap-4 text-xs text-gray-500">
                    {Object.entries(STATUS_LABELS).filter(([k]) => k !== 'grey').map(([k, v]) => (
                        <span key={k} className="flex items-center gap-1.5">
                            <TrafficLight status={k} />
                            {v}
                        </span>
                    ))}
                </div>

                {/* Grille d'indicateurs */}
                {indicators.length === 0 ? (
                    <div className="bg-white rounded-xl border shadow-sm p-12 text-center space-y-4">
                        <p className="text-gray-400">Aucun indicateur configuré.</p>
                        <p className="text-xs text-gray-400">
                            Les indicateurs par défaut suggérés pour votre SMQ sont :
                        </p>
                        <ul className="text-xs text-gray-500 space-y-1 text-left inline-block">
                            {DEFAULT_INDICATORS.map(i => (
                                <li key={i.code}>• {i.code} — {i.name} (cible : {i.target_value} {i.unit})</li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {indicators.map(ind => (
                            <IndicatorCard
                                key={ind.id}
                                indicator={ind}
                                onClick={handleCardClick}
                            />
                        ))}
                    </div>
                )}

                {/* Modals */}
                {selected && (
                    <HistoryPanel
                        indicator={selected}
                        onClose={() => setSelected(null)}
                        onRecord={() => handleRecord(selected)}
                    />
                )}
                {recording && (
                    <RecordValueModal
                        indicator={recording}
                        onClose={() => setRecording(null)}
                        onSuccess={handleSuccess}
                    />
                )}
            </div>
        </AppLayout>
    );
}
export { Indicators };
