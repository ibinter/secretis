import React, { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    RadialBarChart, RadialBar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import AppLayout from '@/Layouts/AppLayout';

// ─── Palettes ────────────────────────────────────────────────────────────────
const SEVERITY_COLORS = { mineure: '#F59E0B', majeure: '#F97316', critique: '#EF4444' };
const SOURCE_COLORS   = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
const STATUS_COLORS   = { green: '#10B981', orange: '#F59E0B', red: '#EF4444', grey: '#9CA3AF' };

// ─── Composants utilitaires ───────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'blue', icon }) {
    const colors = {
        blue:   'bg-purple-50 border-purple-200 text-purple-700',
        red:    'bg-red-50 border-red-200 text-red-700',
        green:  'bg-green-50 border-green-200 text-green-700',
        orange: 'bg-orange-50 border-orange-200 text-orange-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
    };
    return (
        <div className={`rounded-xl border p-5 flex items-center gap-4 ${colors[color]}`}>
            {icon && <span className="text-3xl">{icon}</span>}
            <div>
                <p className="text-sm font-medium opacity-80">{label}</p>
                <p className="text-3xl font-bold mt-0.5">{value}</p>
                {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
            </div>
        </div>
    );
}

function GaugeChart({ value, target = 90 }) {
    const clamped   = Math.min(100, Math.max(0, value));
    const color     = clamped >= target ? '#10B981' : clamped >= target * 0.8 ? '#F59E0B' : '#EF4444';
    const data      = [{ name: 'Taux', value: clamped, fill: color }];

    return (
        <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
                <RadialBarChart
                    cx="50%" cy="90%"
                    innerRadius="60%"
                    outerRadius="100%"
                    startAngle={180}
                    endAngle={0}
                    data={[{ value: 100, fill: '#E5E7EB' }, ...data]}
                >
                    <RadialBar dataKey="value" cornerRadius={6} />
                </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-center -mt-8">
                <span className="text-4xl font-bold" style={{ color }}>{clamped}%</span>
                <p className="text-xs text-gray-500 mt-1">Objectif ≥ {target}%</p>
            </div>
        </div>
    );
}

function TrafficLight({ status }) {
    const dot = { green: 'bg-green-500', orange: 'bg-orange-400', red: 'bg-red-500', grey: 'bg-gray-300' };
    return <span className={`inline-block w-3 h-3 rounded-full ${dot[status] ?? dot.grey}`} />;
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function QualityDashboard() {
    const { dashboard } = usePage().props;
    const { kpis, monthly_trend, nc_by_process, nc_by_source, nc_by_severity, indicators } = dashboard;

    const [activeTab, setActiveTab] = useState('overview');

    return (
        <AppLayout>
            <Head title="Tableau de bord Qualité ISO 9001" />

            <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
                {/* En-tête */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Qualité ISO 9001</h1>
                        <p className="text-sm text-gray-500 mt-1">Pilotage du Système de Management de la Qualité</p>
                    </div>
                    <div className="flex gap-2">
                        <a
                            href="/qualite/nc"
                            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                        >
                            Nouvelle NC
                        </a>
                        <a
                            href="/qualite/report"
                            className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition"
                        >
                            Rapport mensuel
                        </a>
                    </div>
                </div>

                {/* KPI Tiles */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    <KpiCard
                        label="NC ouvertes"
                        value={kpis.open_nc}
                        color={kpis.open_nc > 10 ? 'red' : 'blue'}
                        icon="🔴"
                    />
                    <KpiCard
                        label="NC en retard"
                        value={kpis.overdue_nc}
                        color={kpis.overdue_nc > 0 ? 'red' : 'green'}
                        icon="⏰"
                    />
                    <KpiCard
                        label="Délai moyen clôture"
                        value={`${kpis.avg_closure_days}j`}
                        sub="Objectif ≤ 15j"
                        color={kpis.avg_closure_days <= 15 ? 'green' : 'orange'}
                        icon="📅"
                    />
                    <KpiCard
                        label="Satisfaction client"
                        value={`${kpis.avg_satisfaction}/5`}
                        sub="3 derniers mois"
                        color={kpis.avg_satisfaction >= 4 ? 'green' : kpis.avg_satisfaction >= 3 ? 'orange' : 'red'}
                        icon="⭐"
                    />
                    <KpiCard
                        label="Taux récurrence"
                        value={`${kpis.recurrence_rate}%`}
                        sub="Objectif = 0%"
                        color={kpis.recurrence_rate === 0 ? 'green' : kpis.recurrence_rate < 10 ? 'orange' : 'red'}
                        icon="🔄"
                    />
                    <KpiCard
                        label="NC clôturées"
                        value={kpis.total_closed}
                        color="purple"
                        icon="✅"
                    />
                </div>

                {/* Ligne 2 : Gauge + Évolution */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Gauge clôture dans les délais */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h2 className="font-semibold text-gray-800 mb-3">Taux de clôture dans les délais</h2>
                        <GaugeChart value={kpis.closure_on_time_rate} target={90} />
                    </div>

                    {/* Évolution NC par mois */}
                    <div className="bg-white rounded-xl shadow-sm border p-5 lg:col-span-2">
                        <h2 className="font-semibold text-gray-800 mb-4">Évolution des non-conformités (12 mois)</h2>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={monthly_trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="opened"
                                    stroke="#EF4444"
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    name="NC ouvertes"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="closed"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    name="NC clôturées"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Ligne 3 : BarChart processus + PieChart source */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top 5 processus générateurs */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h2 className="font-semibold text-gray-800 mb-4">Top 5 processus générateurs de NC</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart
                                data={nc_by_process}
                                layout="vertical"
                                margin={{ left: 80 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis
                                    type="category"
                                    dataKey="process_code"
                                    tick={{ fontSize: 11 }}
                                    width={70}
                                />
                                <Tooltip
                                    formatter={(v, n, p) => [v, p.payload.process_name]}
                                />
                                <Bar dataKey="nc_count" fill="#3B82F6" radius={[0, 4, 4, 0]} name="NC" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Répartition par source */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h2 className="font-semibold text-gray-800 mb-4">Répartition NC par source</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={nc_by_source}
                                    dataKey="count"
                                    nameKey="source"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ source, percent }) =>
                                        `${source} (${(percent * 100).toFixed(0)}%)`
                                    }
                                    labelLine={false}
                                >
                                    {nc_by_source.map((entry, i) => (
                                        <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tableau des indicateurs qualité */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                    <h2 className="font-semibold text-gray-800 mb-4">Indicateurs qualité</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-gray-500">
                                    <th className="py-2 pr-4">Code</th>
                                    <th className="py-2 pr-4">Indicateur</th>
                                    <th className="py-2 pr-4">Valeur actuelle</th>
                                    <th className="py-2 pr-4">Cible</th>
                                    <th className="py-2 pr-4">Unité</th>
                                    <th className="py-2 pr-4">Période</th>
                                    <th className="py-2">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {indicators.map((ind) => (
                                    <tr key={ind.id} className="hover:bg-gray-50 transition">
                                        <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">{ind.code}</td>
                                        <td className="py-2.5 pr-4 font-medium text-gray-800">{ind.name}</td>
                                        <td className="py-2.5 pr-4">
                                            {ind.current_value !== null
                                                ? <span className="font-semibold">{ind.current_value}</span>
                                                : <span className="text-gray-400 text-xs">—</span>
                                            }
                                        </td>
                                        <td className="py-2.5 pr-4 text-gray-600">{ind.target_value ?? '—'}</td>
                                        <td className="py-2.5 pr-4 text-gray-500">{ind.unit}</td>
                                        <td className="py-2.5 pr-4 text-gray-400 text-xs">{ind.period ?? '—'}</td>
                                        <td className="py-2.5">
                                            <span className="flex items-center gap-2">
                                                <TrafficLight status={ind.status} />
                                                <span className="capitalize text-xs text-gray-600">
                                                    {{ green: 'Conforme', orange: 'Attention', red: 'Hors cible', grey: 'N/A' }[ind.status]}
                                                </span>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
export { QualityDashboard };
