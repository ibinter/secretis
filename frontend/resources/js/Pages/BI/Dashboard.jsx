/**
 * Dashboard BI principal — IBIG SECRETIS
 * Vue d'ensemble avec 6 mini-dashboards, sélecteur de période et export.
 */
import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    BarChart2, FileText, Plus, RefreshCw, Download,
    Mail, CheckSquare, Calendar, Users, UserCheck, DollarSign,
    TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { useAllBiModules } from '../../hooks/useBiData';
import { useQueryClient } from '@tanstack/react-query';
import {
    ResponsiveContainer, AreaChart, Area,
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip,
} from 'recharts';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';

// ---------------------------------------------------------------------------
// Données mock — développement
// ---------------------------------------------------------------------------
const MOCK = {
    correspondence: {
        summary: { total: 247, avg_processing_min: 312, sla_rate: 87.3, period_days: 30 },
        time_series: Array.from({ length: 30 }, (_, i) => ({ period: `J-${30 - i}`, total: Math.floor(Math.random() * 12) + 2, incoming: Math.floor(Math.random() * 8) + 1, outgoing: Math.floor(Math.random() * 5) + 1 })),
        by_urgency: { haute: 34, normale: 167, basse: 46 },
    },
    tasks: {
        summary: { total: 183, completed: 141, overdue: 12, completion_rate: 77.0, avg_hours: 4.2 },
        created_vs_done: Array.from({ length: 4 }, (_, i) => ({ period: `Sem ${i + 1}`, created: Math.floor(Math.random() * 20) + 30, completed: Math.floor(Math.random() * 15) + 25 })),
        by_priority: { haute: 42, normale: 98, basse: 43 },
    },
    meetings: {
        summary: { total: 68, avg_planned_min: 62, avg_actual_min: 74, acceptance_rate: 83.4, with_minutes: 51, without_minutes: 17, total_decisions: 204 },
        by_period: Array.from({ length: 4 }, (_, i) => ({ period: `Sem ${i + 1}`, total: Math.floor(Math.random() * 8) + 10 })),
    },
    hr: {
        summary: { total_absences: 38, total_absence_days: 96, total_expenses: 4250000, avg_approval_hours: 18.5 },
        by_leave_type: [
            { type: 'Congé annuel', total: 22, total_days: 64 },
            { type: 'Maladie', total: 9, total_days: 18 },
            { type: 'Maternité', total: 4, total_days: 120 },
            { type: 'Sans solde', total: 3, total_days: 7 },
        ],
    },
    visitors: {
        summary: { total: 312, avg_wait_min: 8.4, appointments: 198, walk_ins: 114 },
        flux: Array.from({ length: 30 }, (_, i) => ({ period: `J-${30 - i}`, total: Math.floor(Math.random() * 15) + 5 })),
    },
    accounting: {
        summary: { total_invoiced: 85400000, total_collected: 71200000, total_pending: 14200000, dso_days: 28.3, recovery_rate: 83.4 },
        revenue_by_month: Array.from({ length: 6 }, (_, i) => ({
            month: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'][i],
            invoiced: Math.floor(Math.random() * 5000000) + 12000000,
            collected: Math.floor(Math.random() * 4000000) + 9000000,
        })),
    },
};

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
const PERIODS = [
    { value: 'today',   label: "Aujourd'hui" },
    { value: 'week',    label: 'Cette semaine' },
    { value: 'month',   label: 'Ce mois' },
    { value: 'quarter', label: 'Ce trimestre' },
    { value: 'year',    label: 'Cette année' },
    { value: 'custom',  label: 'Personnalisé' },
];

const PALETTE = ['#1d4ed8', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2'];

function fmt(n, currency = false) {
    if (n === null || n === undefined) return '—';
    if (currency) return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
    return new Intl.NumberFormat('fr-FR').format(n);
}

function KpiTile({ label, value, sub, trend, color = '#1d4ed8', icon: Icon }) {
    const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">{label}</span>
                {Icon && <span className="p-1.5 rounded-lg" style={{ background: color + '18' }}><Icon size={14} style={{ color }} /></span>}
            </div>
            <span className="text-2xl font-bold text-slate-800">{value}</span>
            {sub && <span className="text-xs text-slate-400">{sub}</span>}
            {trend !== undefined && (
                <span className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    <TrendIcon size={11} /> {trend > 0 ? '+' : ''}{trend}% vs période préc.
                </span>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Mini-dashboards par module
// ---------------------------------------------------------------------------
function MiniDashboard({ title, icon: Icon, color, children, href }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100" style={{ background: color + '0a' }}>
                <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg" style={{ background: color + '20' }}><Icon size={15} style={{ color }} /></span>
                    <span className="font-semibold text-sm text-slate-800">{title}</span>
                </div>
                <Link href={href} className="text-xs text-purple-600 hover:underline font-medium">Voir détail →</Link>
            </div>
            <div className="p-4 flex-1">{children}</div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
export default function BIDashboard() {
    const [period, setPeriod]         = useState('month');
    const [customStart, setStart]     = useState('');
    const [customEnd, setEnd]         = useState('');
    const [modules, setModules]       = useState(['correspondence', 'tasks', 'meetings', 'hr', 'visitors', 'accounting']);
    const [exporting, setExporting]   = useState(false);

    const queryClient = useQueryClient();

    // En développement, on utilise les mocks
    const isDev   = import.meta.env.DEV;
    const allData = isDev ? MOCK : MOCK; // remplacer par useAllBiModules({ preset: period }) en prod

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await axios.post('/api/bi/export', { format: 'pdf', config: { module: 'correspondence', period: { preset: period } } }, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a   = document.createElement('a');
            a.href    = url;
            a.download = `rapport_bi_${period}.pdf`;
            a.click();
        } catch (e) { console.error(e); }
        setExporting(false);
    };

    const handleRefresh = () => queryClient.invalidateQueries(['bi']);

    // Répartition urgence courrier
    const urgencyData = Object.entries(allData.correspondence?.by_urgency ?? {}).map(([k, v]) => ({ name: k, value: v }));
    // Priorité tâches
    const priorityData = Object.entries(allData.tasks?.by_priority ?? {}).map(([k, v]) => ({ name: k, value: v }));
    // Congés
    const leaveData = (allData.hr?.by_leave_type ?? []).map(l => ({ name: l.type, value: l.total_days }));

    return (
        <AppLayout>
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-700 rounded-xl"><BarChart2 size={20} className="text-white" /></div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">Business Intelligence</h1>
                            <p className="text-xs text-slate-500">Tableau de bord analytique — IBIG SECRETIS</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Sélecteur de période */}
                        <div className="flex bg-slate-100 rounded-lg p-0.5">
                            {PERIODS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => setPeriod(p.value)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${period === p.value ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {period === 'custom' && (
                            <div className="flex items-center gap-1">
                                <input type="date" value={customStart} onChange={e => setStart(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1.5" />
                                <span className="text-slate-400 text-xs">→</span>
                                <input type="date" value={customEnd} onChange={e => setEnd(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1.5" />
                            </div>
                        )}

                        <button onClick={handleRefresh} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                            <RefreshCw size={13} /> Actualiser
                        </button>

                        <Link href="/bi/reports/build" className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-800">
                            <Plus size={13} /> Construire un rapport
                        </Link>

                        <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-700 text-white rounded-lg hover:bg-purple-800 disabled:opacity-60">
                            <Download size={13} /> {exporting ? 'Export…' : 'Rapport PDF'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Contenu */}
            <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

                {/* KPI globaux */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <KpiTile label="Courriers" value={fmt(allData.correspondence?.summary?.total)} sub="ce mois" icon={Mail} color="#1d4ed8" trend={5.2} />
                    <KpiTile label="Tâches terminées" value={fmt(allData.tasks?.summary?.completed)} sub={`/ ${fmt(allData.tasks?.summary?.total)} créées`} icon={CheckSquare} color="#16a34a" trend={12.1} />
                    <KpiTile label="Réunions" value={fmt(allData.meetings?.summary?.total)} sub={`${allData.meetings?.summary?.total_decisions} décisions`} icon={Calendar} color="#7c3aed" trend={-3.0} />
                    <KpiTile label="Congés (jours)" value={fmt(allData.hr?.summary?.total_absence_days)} sub="approuvés" icon={Users} color="#dc2626" />
                    <KpiTile label="Visiteurs" value={fmt(allData.visitors?.summary?.total)} sub={`Attente moy. ${allData.visitors?.summary?.avg_wait_min} min`} icon={UserCheck} color="#0891b2" trend={8.4} />
                    <KpiTile label="Recouvrement" value={`${allData.accounting?.summary?.recovery_rate}%`} sub={`DSO: ${allData.accounting?.summary?.dso_days}j`} icon={DollarSign} color="#d97706" trend={2.1} />
                </div>

                {/* Grille 6 mini-dashboards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">

                    {/* Courrier */}
                    <MiniDashboard title="Courrier" icon={Mail} color="#1d4ed8" href="/bi/correspondence">
                        <div className="mb-3 flex gap-3">
                            <div className="text-center"><p className="text-2xl font-bold text-purple-700">{allData.correspondence?.summary?.sla_rate}%</p><p className="text-xs text-slate-500">Taux SLA</p></div>
                            <div className="text-center"><p className="text-2xl font-bold text-slate-700">{Math.round((allData.correspondence?.summary?.avg_processing_min ?? 0) / 60)}h</p><p className="text-xs text-slate-500">Délai moy.</p></div>
                        </div>
                        <ResponsiveContainer width="100%" height={90}>
                            <AreaChart data={allData.correspondence?.time_series?.slice(-14) ?? []}>
                                <Area type="monotone" dataKey="incoming" stroke="#1d4ed8" fill="#dbeafe" strokeWidth={1.5} />
                                <Tooltip contentStyle={{ fontSize: 10 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </MiniDashboard>

                    {/* Tâches */}
                    <MiniDashboard title="Tâches" icon={CheckSquare} color="#16a34a" href="/bi/tasks">
                        <div className="mb-3 flex gap-3">
                            <div className="text-center"><p className="text-2xl font-bold text-green-600">{allData.tasks?.summary?.completion_rate}%</p><p className="text-xs text-slate-500">Complétion</p></div>
                            <div className="text-center"><p className="text-2xl font-bold text-red-500">{allData.tasks?.summary?.overdue}</p><p className="text-xs text-slate-500">En retard</p></div>
                        </div>
                        <ResponsiveContainer width="100%" height={90}>
                            <BarChart data={allData.tasks?.created_vs_done ?? []}>
                                <Bar dataKey="created" fill="#bbf7d0" radius={[2, 2, 0, 0]} />
                                <Bar dataKey="completed" fill="#16a34a" radius={[2, 2, 0, 0]} />
                                <Tooltip contentStyle={{ fontSize: 10 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </MiniDashboard>

                    {/* Réunions */}
                    <MiniDashboard title="Réunions" icon={Calendar} color="#7c3aed" href="/bi/meetings">
                        <div className="mb-3 flex gap-3">
                            <div className="text-center"><p className="text-2xl font-bold text-violet-600">{allData.meetings?.summary?.acceptance_rate}%</p><p className="text-xs text-slate-500">Acceptation</p></div>
                            <div className="text-center"><p className="text-2xl font-bold text-slate-700">{allData.meetings?.summary?.avg_actual_min}'</p><p className="text-xs text-slate-500">Durée moy.</p></div>
                        </div>
                        <ResponsiveContainer width="100%" height={90}>
                            <BarChart data={allData.meetings?.by_period ?? []}>
                                <Bar dataKey="total" fill="#7c3aed" radius={[2, 2, 0, 0]} />
                                <Tooltip contentStyle={{ fontSize: 10 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </MiniDashboard>

                    {/* RH */}
                    <MiniDashboard title="Ressources Humaines" icon={Users} color="#dc2626" href="/bi/hr">
                        <div className="mb-3"><p className="text-2xl font-bold text-red-600">{fmt(allData.hr?.summary?.total_expenses, true)}</p><p className="text-xs text-slate-500">Notes de frais approuvées</p></div>
                        <ResponsiveContainer width="100%" height={90}>
                            <PieChart>
                                <Pie data={leaveData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={38} label={false}>
                                    {leaveData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ fontSize: 10 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </MiniDashboard>

                    {/* Visiteurs */}
                    <MiniDashboard title="Visiteurs" icon={UserCheck} color="#0891b2" href="/bi/visitors">
                        <div className="mb-3 flex gap-3">
                            <div className="text-center"><p className="text-2xl font-bold text-cyan-600">{allData.visitors?.summary?.appointments}</p><p className="text-xs text-slate-500">RDV</p></div>
                            <div className="text-center"><p className="text-2xl font-bold text-slate-600">{allData.visitors?.summary?.walk_ins}</p><p className="text-xs text-slate-500">Passages libres</p></div>
                        </div>
                        <ResponsiveContainer width="100%" height={90}>
                            <AreaChart data={allData.visitors?.flux?.slice(-14) ?? []}>
                                <Area type="monotone" dataKey="total" stroke="#0891b2" fill="#cffafe" strokeWidth={1.5} />
                                <Tooltip contentStyle={{ fontSize: 10 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </MiniDashboard>

                    {/* Comptabilité */}
                    <MiniDashboard title="Comptabilité" icon={DollarSign} color="#d97706" href="/bi/accounting">
                        <div className="mb-3">
                            <p className="text-2xl font-bold text-amber-600">{fmt(allData.accounting?.summary?.total_invoiced, true)}</p>
                            <p className="text-xs text-slate-500">Facturé — {allData.accounting?.summary?.recovery_rate}% recouvré</p>
                        </div>
                        <ResponsiveContainer width="100%" height={90}>
                            <BarChart data={allData.accounting?.revenue_by_month ?? []}>
                                <Bar dataKey="invoiced" fill="#fde68a" radius={[2, 2, 0, 0]} />
                                <Bar dataKey="collected" fill="#d97706" radius={[2, 2, 0, 0]} />
                                <Tooltip contentStyle={{ fontSize: 10 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </MiniDashboard>
                </div>
            </div>
        </div>
        </AppLayout>
    );
}
export { BIDashboard };
