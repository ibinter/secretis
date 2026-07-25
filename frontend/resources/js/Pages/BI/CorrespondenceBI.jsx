/**
 * CorrespondenceBI — Analytics détaillés courrier
 */
import React, { useState } from 'react';
import { Mail, Clock, Target, TrendingUp, ArrowLeft } from 'lucide-react';
import { Link } from '@inertiajs/react';
import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useCorrespondenceBI } from '../../hooks/useBiData';

// ---------------------------------------------------------------------------
// Mock data réaliste
// ---------------------------------------------------------------------------
const generateDailyData = (days = 30) =>
    Array.from({ length: days }, (_, i) => ({
        period: new Date(Date.now() - (days - i) * 86400000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        total:    Math.floor(Math.random() * 15) + 3,
        incoming: Math.floor(Math.random() * 10) + 2,
        outgoing: Math.floor(Math.random() * 6) + 1,
        avg_min:  Math.floor(Math.random() * 200) + 60,
    }));

const MOCK = {
    summary: { total: 247, avg_processing_min: 312, sla_rate: 87.3, period_days: 30 },
    time_series: generateDailyData(30),
    by_urgency: [
        { name: 'Haute urgence', value: 34, fill: '#dc2626' },
        { name: 'Normale',       value: 167, fill: '#1d4ed8' },
        { name: 'Basse urgence', value: 46, fill: '#16a34a' },
    ],
    processing_trend: generateDailyData(30).map(d => ({ period: d.period, avg_minutes: d.avg_min })),
    top_senders: [
        { sender: 'Ministère du Budget',     total: 28 },
        { sender: 'Banque Atlantique',        total: 22 },
        { sender: 'Direction des Impôts',     total: 19 },
        { sender: 'Cabinet du Président',     total: 15 },
        { sender: 'Société Générale CI',      total: 12 },
    ],
    top_recipients: [
        { recipient: 'DG — Jean-Paul Kouassi', total: 31 },
        { recipient: 'DAF — Mariame Traoré',   total: 25 },
        { recipient: 'DRH — Adama Coulibaly',  total: 18 },
        { recipient: 'DSI — Cédric Mensah',    total: 14 },
        { recipient: 'Secrétariat Général',    total: 11 },
    ],
};

// ---------------------------------------------------------------------------
// KPI Tile
// ---------------------------------------------------------------------------
function KpiCard({ label, value, sub, color = '#1d4ed8', icon: Icon }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                {Icon && <Icon size={14} style={{ color }} />} {label}
            </div>
            <p className="text-3xl font-bold" style={{ color }}>{value}</p>
            {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
export default function CorrespondenceBI() {
    const [preset, setPreset] = useState('month');

    // En prod: const { data, isLoading } = useCorrespondenceBI({ preset });
    const data = MOCK;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <Link href="/bi" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft size={16} /></Link>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-700 rounded-xl"><Mail size={18} className="text-white" /></div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">Analytics Courrier</h1>
                            <p className="text-xs text-slate-500">Volume, urgences, délais de traitement</p>
                        </div>
                    </div>
                    <div className="ml-auto flex gap-2">
                        {['today', 'week', 'month', 'quarter', 'year'].map(p => (
                            <button key={p} onClick={() => setPreset(p)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${preset === p ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                {({ today: "Auj.", week: "Sem.", month: "Mois", quarter: "Trim.", year: "An." })[p]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label="Volume total" value={data.summary.total} sub={`sur ${data.summary.period_days} jours`} icon={Mail} color="#1d4ed8" />
                    <KpiCard label="Taux SLA ≤ 48h" value={`${data.summary.sla_rate}%`} sub="traités dans les délais" icon={Target} color="#16a34a" />
                    <KpiCard label="Délai moyen" value={`${Math.round(data.summary.avg_processing_min / 60)}h${data.summary.avg_processing_min % 60}min`} sub="de réception à traitement" icon={Clock} color="#d97706" />
                    <KpiCard label="Par jour" value={(data.summary.total / data.summary.period_days).toFixed(1)} sub="courriers en moyenne/jour" icon={TrendingUp} color="#7c3aed" />
                </div>

                {/* Volume courriers par jour */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <h2 className="font-semibold text-slate-800 mb-4">Volume de courriers — entrants vs sortants</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={data.time_series}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={4} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="incoming" name="Entrants" stroke="#1d4ed8" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="outgoing" name="Sortants" stroke="#16a34a" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="total" name="Total" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Urgence + Délai de traitement */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <h2 className="font-semibold text-slate-800 mb-4">Répartition par urgence</h2>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={data.by_urgency} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                                <Tooltip />
                                <Bar dataKey="value" name="Courriers" radius={[0, 4, 4, 0]}>
                                    {data.by_urgency.map((entry, i) => (
                                        <rect key={i} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <h2 className="font-semibold text-slate-800 mb-4">Délai de traitement (tendance en minutes)</h2>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={data.processing_trend}>
                                <defs>
                                    <linearGradient id="gradDelay" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#d97706" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={4} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(v) => [`${v} min`, 'Délai moyen']} />
                                <Area type="monotone" dataKey="avg_minutes" stroke="#d97706" fill="url(#gradDelay)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top expéditeurs et destinataires */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {[
                        { title: 'Top 5 expéditeurs', rows: data.top_senders, keyLabel: 'sender', label: 'Expéditeur' },
                        { title: 'Top 5 destinataires', rows: data.top_recipients, keyLabel: 'recipient', label: 'Destinataire' },
                    ].map(({ title, rows, keyLabel, label }) => (
                        <div key={title} className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h2 className="font-semibold text-slate-800 mb-4">{title}</h2>
                            <table className="w-full text-sm">
                                <thead><tr className="text-xs text-slate-500 border-b border-slate-100"><th className="text-left py-1.5">{label}</th><th className="text-right py-1.5">Courriers</th></tr></thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                            <td className="py-2 text-slate-700">
                                                <span className="text-xs font-bold text-slate-400 mr-2">#{i + 1}</span>
                                                {r[keyLabel]}
                                            </td>
                                            <td className="py-2 text-right">
                                                <span className="bg-purple-50 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">{r.total}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
export { CorrespondenceBI };
