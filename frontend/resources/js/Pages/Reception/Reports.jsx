import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import AppLayout from '@/Layouts/AppLayout';

// ─── Rapports Reception ───────────────────────────────────────────────────────
const COLORS = ['#1A3A5C', '#F39C12', '#27AE60', '#E74C3C', '#9B59B6', '#3498DB'];

export default function Reports({ report, last30, date }) {
    const [selectedDate, setSelectedDate] = useState(date);

    const handleDateChange = (d) => {
        setSelectedDate(d);
        router.get('/visits/report', { date: d }, { preserveState: true });
    };

    const exportPdf = () => {
        window.location.href = `/visits/report/pdf?date=${selectedDate}`;
    };

    // Donnees graphiques
    const peakHoursData = Array.from({ length: 11 }, (_, i) => {
        const h = (8 + i).toString().padStart(2, '0');
        return { hour: `${h}:00`, visits: report.peak_hours?.[h] ?? 0 };
    });

    const purposeData = Object.entries(report.by_purpose ?? {}).map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1),
        value: v,
    }));

    const noShowRate = report.total_visits > 0
        ? Math.round((report.no_show / report.total_visits) * 100)
        : 0;

    return (
        <AppLayout>
            <Head title="Rapports Réception" />

            <div className="p-6 space-y-6">
                {/* En-tête */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Rapports Réception</h1>
                        <p className="text-gray-500 text-sm mt-1">Analyse des visites et de l'affluence</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => handleDateChange(e.target.value)}
                            className="border border-gray-200 rounded-xl px-4 py-2 text-sm"
                        />
                        <button onClick={exportPdf}
                            className="bg-[#1A3A5C] text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                            📄 Export PDF
                        </button>
                    </div>
                </div>

                {/* KPIs du jour */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                        { label: 'Total visites',      value: report.total_visits,         color: 'bg-blue-50',   text: 'text-blue-700',  icon: '📊' },
                        { label: 'Présents',           value: report.checked_in,           color: 'bg-green-50',  text: 'text-green-700', icon: '🟢' },
                        { label: 'Partis',             value: report.checked_out,          color: 'bg-gray-50',   text: 'text-gray-700',  icon: '🏃' },
                        { label: 'No-show',            value: report.no_show,              color: 'bg-red-50',    text: 'text-red-700',   icon: '❌' },
                        { label: 'Durée moy. (min)',   value: report.average_duration_min, color: 'bg-purple-50', text: 'text-purple-700',icon: '⏱️' },
                        { label: 'Taux no-show',       value: `${noShowRate}%`,            color: 'bg-orange-50', text: 'text-orange-700',icon: '📉' },
                    ].map(kpi => (
                        <div key={kpi.label} className={`${kpi.color} rounded-2xl p-4`}>
                            <div className="text-2xl mb-1">{kpi.icon}</div>
                            <div className={`text-3xl font-black ${kpi.text}`}>{kpi.value}</div>
                            <div className="text-gray-500 text-xs font-medium mt-0.5">{kpi.label}</div>
                        </div>
                    ))}
                </div>

                {/* Graphiques principaux */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar chart — visites 30 jours */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <h3 className="font-bold text-gray-900 mb-4">Visites sur 30 jours</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={last30} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{ fontSize:10 }}
                                    tickFormatter={d => new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })} />
                                <YAxis tick={{ fontSize:10 }} />
                                <Tooltip
                                    labelFormatter={d => new Date(d).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
                                    formatter={v => [v, 'visites']}
                                />
                                <Bar dataKey="count" fill="#1A3A5C" radius={[4,4,0,0]} name="Visites" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Line chart — affluence par heure */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <h3 className="font-bold text-gray-900 mb-4">Pic d'affluence (8h–18h)</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={peakHoursData} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="hour" tick={{ fontSize:10 }} />
                                <YAxis tick={{ fontSize:10 }} />
                                <Tooltip formatter={v => [v, 'arrivées']} />
                                <Line type="monotone" dataKey="visits" stroke="#F39C12" strokeWidth={3}
                                    dot={{ fill:'#F39C12', r:4 }} activeDot={{ r:6 }} name="Arrivées" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Pie chart — répartition par motif */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <h3 className="font-bold text-gray-900 mb-4">Répartition par motif</h3>
                        {purposeData.length === 0 ? (
                            <div className="text-center text-gray-400 py-12">Aucune donnée</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={purposeData} cx="50%" cy="50%" outerRadius={85}
                                        dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                                        labelLine={false}>
                                        {purposeData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Top hôtes */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <h3 className="font-bold text-gray-900 mb-4">TOP 10 — Hôtes les plus visités</h3>
                        {(!report.top_hosts || report.top_hosts.length === 0) ? (
                            <div className="text-center text-gray-400 py-12">Aucune donnée</div>
                        ) : (
                            <div className="space-y-2">
                                {report.top_hosts.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-gray-400 w-5">{i+1}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-sm font-semibold text-gray-800">{item.host}</span>
                                                <span className="text-sm font-bold text-[#1A3A5C]">{item.count}</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#1A3A5C] rounded-full"
                                                    style={{ width: `${(item.count / report.top_hosts[0]?.count) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
