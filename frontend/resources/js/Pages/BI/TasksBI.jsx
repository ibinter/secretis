/**
 * TasksBI — Analytics détaillés tâches et projets
 */
import React, { useState } from 'react';
import { CheckSquare, Clock, AlertTriangle, TrendingUp, ArrowLeft } from 'lucide-react';
import { Link } from '@inertiajs/react';
import {
    ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Mock data réaliste
// ---------------------------------------------------------------------------
const PALETTE = ['#1d4ed8', '#16a34a', '#dc2626', '#d97706', '#7c3aed'];

const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
});

const MOCK = {
    summary: { total: 183, completed: 141, overdue: 12, completion_rate: 77.0, avg_hours: 4.2 },
    created_vs_done: Array.from({ length: 8 }, (_, i) => ({
        period: `Sem ${i + 1}`,
        created:   Math.floor(Math.random() * 15) + 18,
        completed: Math.floor(Math.random() * 12) + 15,
    })),
    burndown_ideal: days30.map((d, i) => ({ day: d, remaining: Math.max(0, 100 - i * 3.3) })),
    burndown_real:  days30.map((d, i) => ({ day: d, remaining: Math.max(0, 100 - i * 2.8 + Math.sin(i) * 6) })),
    by_assignee: [
        { assignee: 'Awa Diallo',        total: 32, completed: 28 },
        { assignee: 'Kouamé Brou',       total: 27, completed: 19 },
        { assignee: 'Fatou Sangaré',     total: 24, completed: 21 },
        { assignee: 'Ibrahim Touré',     total: 21, completed: 16 },
        { assignee: 'Cécile Ahouandé',  total: 18, completed: 15 },
        { assignee: 'Marc Zouzoua',      total: 15, completed: 11 },
    ],
    by_priority: [
        { name: 'Haute',  value: 42, fill: '#dc2626' },
        { name: 'Normale', value: 98, fill: '#1d4ed8' },
        { name: 'Basse',  value: 43, fill: '#16a34a' },
    ],
    by_status: [
        { name: 'À faire',    value: 22, fill: '#94a3b8' },
        { name: 'En cours',   value: 20, fill: '#d97706' },
        { name: 'En revue',   value: 12, fill: '#7c3aed' },
        { name: 'Terminé',    value: 141, fill: '#16a34a' },
        { name: 'Bloqué',     value: 8, fill: '#dc2626' },
    ],
    by_project: [
        { project: 'Migration ERP',     total: 45, completed: 38, rate: 84.4 },
        { project: 'Audit interne Q2',  total: 31, completed: 28, rate: 90.3 },
        { project: 'Formation SECRETIS',total: 24, completed: 18, rate: 75.0 },
        { project: 'Refonte site web',  total: 19, completed: 11, rate: 57.9 },
        { project: 'Plan stratégique',  total: 15, completed: 13, rate: 86.7 },
    ],
};

function KpiCard({ label, value, sub, color = '#1d4ed8', icon: Icon }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                {Icon && <Icon size={14} style={{ color }} />} {label}
            </div>
            <p className="text-3xl font-bold" style={{ color }}>{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
    );
}

export default function TasksBI() {
    const [preset, setPreset] = useState('month');
    const data = MOCK;

    // Fusion burndown idéal + réel
    const burndown = data.burndown_ideal.map((d, i) => ({
        day:      d.day,
        idéal:    Math.round(d.remaining),
        réel:     Math.round(data.burndown_real[i]?.remaining ?? d.remaining),
    }));

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <Link href="/bi" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft size={16} /></Link>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-600 rounded-xl"><CheckSquare size={18} className="text-white" /></div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">Analytics Tâches</h1>
                            <p className="text-xs text-slate-500">Complétion, burndown, performance par assigné</p>
                        </div>
                    </div>
                    <div className="ml-auto flex gap-2">
                        {['week', 'month', 'quarter'].map(p => (
                            <button key={p} onClick={() => setPreset(p)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${preset === p ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                {({ week: 'Semaine', month: 'Mois', quarter: 'Trimestre' })[p]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <KpiCard label="Créées"       value={data.summary.total}           sub="cette période"             icon={CheckSquare}    color="#1d4ed8" />
                    <KpiCard label="Terminées"    value={data.summary.completed}        sub={`/${data.summary.total}`}  icon={TrendingUp}     color="#16a34a" />
                    <KpiCard label="Taux"         value={`${data.summary.completion_rate}%`} sub="de complétion"        icon={TrendingUp}     color="#7c3aed" />
                    <KpiCard label="En retard"    value={data.summary.overdue}          sub="tâches dépassées"          icon={AlertTriangle}  color="#dc2626" />
                    <KpiCard label="Durée moy."   value={`${data.summary.avg_hours}h`}  sub="par tâche"                icon={Clock}          color="#d97706" />
                </div>

                {/* Créées vs Terminées */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <h2 className="font-semibold text-slate-800 mb-4">Tâches créées vs terminées par semaine</h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={data.created_vs_done}>
                            <defs>
                                <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="created"   name="Créées"   stroke="#1d4ed8" fill="url(#gradCreated)" strokeWidth={2} />
                            <Area type="monotone" dataKey="completed" name="Terminées" stroke="#16a34a" fill="url(#gradDone)"    strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Burndown chart */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <h2 className="font-semibold text-slate-800 mb-1">Burndown Chart</h2>
                    <p className="text-xs text-slate-400 mb-4">Idéal vs réel — tâches restantes à terminer</p>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={burndown.filter((_, i) => i % 3 === 0)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="idéal" stroke="#94a3b8" strokeDasharray="5 3" strokeWidth={1.5} dot={false} />
                            <Line type="monotone" dataKey="réel"  stroke="#1d4ed8" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Par assigné + Priorité + Statut */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
                        <h2 className="font-semibold text-slate-800 mb-4">Tâches terminées par assigné</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data.by_assignee} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="assignee" tick={{ fontSize: 10 }} width={120} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="total"     name="Total"     fill="#dbeafe" radius={[0, 3, 3, 0]} />
                                <Bar dataKey="completed" name="Terminées" fill="#1d4ed8" radius={[0, 3, 3, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <h2 className="font-semibold text-slate-800 mb-4">Par priorité</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={data.by_priority} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {data.by_priority.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Par projet */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <h2 className="font-semibold text-slate-800 mb-4">Taux de complétion par projet</h2>
                    <table className="w-full text-sm">
                        <thead><tr className="text-xs text-slate-500 border-b border-slate-100">
                            <th className="text-left py-2">Projet</th>
                            <th className="text-right py-2">Créées</th>
                            <th className="text-right py-2">Terminées</th>
                            <th className="text-right py-2">Taux</th>
                            <th className="py-2 pl-4 text-left">Progression</th>
                        </tr></thead>
                        <tbody>
                            {data.by_project.map((p, i) => (
                                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                    <td className="py-2.5 text-slate-800 font-medium">{p.project}</td>
                                    <td className="py-2.5 text-right text-slate-600">{p.total}</td>
                                    <td className="py-2.5 text-right text-green-600 font-semibold">{p.completed}</td>
                                    <td className="py-2.5 text-right">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.rate >= 80 ? 'bg-green-50 text-green-700' : p.rate >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                                            {p.rate}%
                                        </span>
                                    </td>
                                    <td className="py-2.5 pl-4">
                                        <div className="h-2 bg-slate-100 rounded-full w-32 overflow-hidden">
                                            <div className="h-full rounded-full bg-green-500" style={{ width: `${p.rate}%` }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
export { TasksBI };
