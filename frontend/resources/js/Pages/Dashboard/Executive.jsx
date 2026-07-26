/**
 * Dashboard/Executive.jsx — Tableau de bord Dirigeant SECRETIS ERP
 *
 * Données initiales via Inertia SSR + rafraîchissement TanStack Query toutes les 5 min.
 * Bibliothèque graphiques : Recharts
 * Charte SECRETIS : #9333EA (navy), #7e22ce (bleu), #F39C12 (ambre)
 */

import { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import {
    AreaChart, Area,
    BarChart, Bar,
    PieChart, Pie, Cell, Legend,
    LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
    EnvelopeIcon,
    ClipboardDocumentListIcon,
    CalendarDaysIcon,
    UserGroupIcon,
    ExclamationTriangleIcon,
    HomeModernIcon,
    ArrowPathIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';

import KpiTile from '@/Components/Dashboard/KpiTile';
import ActivityFeed from '@/Components/Dashboard/ActivityFeed';
import { useExecutiveKpis, useTrends, useInvalidateOnWebsocketEvent } from '@/hooks/useDashboard';

// ============================================================================
// Constantes de la charte graphique
// ============================================================================

const C = {
    navy:  '#9333EA',
    blue:  '#7e22ce',
    amber: '#F39C12',
    green: '#27AE60',
    red:   '#E74C3C',
    gray:  '#95A5A6',
};

const PIE_COLORS = [C.navy, C.blue, C.amber, C.green, '#8E44AD', '#16A085'];

const PERIODS = [
    { label: 'Cette semaine',   value: 'week',    days: 7 },
    { label: 'Ce mois',        value: 'month',   days: 30 },
    { label: 'Ce trimestre',   value: 'quarter', days: 90 },
    { label: 'Cette année',    value: 'year',    days: 365 },
];

// ============================================================================
// Sous-composants
// ============================================================================

function SectionTitle({ children }) {
    return (
        <h2 className="text-base font-semibold text-[#9333EA] mb-4">{children}</h2>
    );
}

function Card({ children, className = '' }) {
    return (
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${className}`}>
            {children}
        </div>
    );
}

function PeriodSelector({ value, onChange }) {
    return (
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {PERIODS.map((p) => (
                <button
                    key={p.value}
                    onClick={() => onChange(p)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        value === p.value
                            ? 'bg-white shadow text-[#9333EA]'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}

function TopServicesTable({ departments = [] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-100">
                        <th className="text-left py-2 text-gray-500 font-medium">Service</th>
                        <th className="text-right py-2 text-gray-500 font-medium">Tâches</th>
                        <th className="text-right py-2 text-gray-500 font-medium">Terminées</th>
                        <th className="text-right py-2 text-gray-500 font-medium">En retard</th>
                        <th className="text-right py-2 text-gray-500 font-medium">Taux</th>
                    </tr>
                </thead>
                <tbody>
                    {departments.map((d, i) => {
                        const rate = d.total_tasks > 0
                            ? Math.round((d.done_tasks / d.total_tasks) * 100)
                            : 0;
                        return (
                            <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                <td className="py-2.5 font-medium text-[#9333EA]">{d.department}</td>
                                <td className="py-2.5 text-right text-gray-600">{d.total_tasks}</td>
                                <td className="py-2.5 text-right text-emerald-600">{d.done_tasks}</td>
                                <td className="py-2.5 text-right text-red-500">{d.overdue_tasks}</td>
                                <td className="py-2.5 text-right">
                                    <span
                                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                            rate >= 70 ? 'bg-emerald-50 text-emerald-700'
                                            : rate >= 40 ? 'bg-amber-50 text-amber-700'
                                            : 'bg-red-50 text-red-700'
                                        }`}
                                    >
                                        {rate}%
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                    {!departments.length && (
                        <tr>
                            <td colSpan={5} className="py-6 text-center text-gray-400 text-sm">
                                Aucune donnée disponible
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function Executive() {
    const { props } = usePage();
    const {
        kpis: initialKpis,
        mailTrend: initialMailTrend,
        tasksByStatus,
        visitorsByDept,
        meetingsTrend,
        topDepartments,
        recentActivity,
    } = props;

    const [period, setPeriod] = useState(PERIODS[1]); // défaut : ce mois

    // Données rafraîchies par TanStack Query
    const { data: kpis, isLoading: kpisLoading }       = useExecutiveKpis();
    const { data: mailTrend, isLoading: trendLoading }  = useTrends('mail', period.days);

    // Invalidation temps réel via Reverb
    useInvalidateOnWebsocketEvent();

    // Merge initial (SSR) + live
    const liveKpis     = kpis ?? initialKpis ?? {};
    const liveMailTrend = mailTrend ?? initialMailTrend ?? [];

    // Prépare les données BarChart tâches
    const taskBarData = (() => {
        const groups = {};
        (tasksByStatus ?? []).forEach(({ status, count }) => {
            groups[status] = (groups[status] || 0) + Number(count);
        });
        return Object.entries(groups).map(([status, count]) => ({
            name: { todo: 'À faire', in_progress: 'En cours', review: 'Revue', done: 'Terminée', cancelled: 'Annulée' }[status] ?? status,
            count,
            fill: { todo: C.gray, in_progress: C.blue, review: C.amber, done: C.green, cancelled: C.red }[status] ?? C.gray,
        }));
    })();

    return (
        <>
            <Head title="Tableau de bord Dirigeant" />

            <div className="min-h-screen bg-gray-50">
                {/* En-tête */}
                <div className="bg-white border-b border-gray-100 px-6 py-4">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-[#9333EA]">
                                Tableau de bord Dirigeant
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Vue d'ensemble de l'activité — mise à jour automatique
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <PeriodSelector value={period.value} onChange={setPeriod} />
                            {(kpisLoading || trendLoading) && (
                                <ArrowPathIcon className="h-4 w-4 text-gray-400 animate-spin" />
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-8">

                    {/* ======================================================
                        ROW 1 — 6 KPI tiles
                    ====================================================== */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                        <KpiTile
                            label="Courriers en attente"
                            value={liveKpis.mail_pending ?? 0}
                            icon={EnvelopeIcon}
                            color="blue"
                            critical={20}
                            loading={kpisLoading && !initialKpis}
                        />
                        <KpiTile
                            label="Tâches en retard"
                            value={liveKpis.tasks_overdue ?? 0}
                            icon={ClipboardDocumentListIcon}
                            color="amber"
                            critical={10}
                            loading={kpisLoading && !initialKpis}
                        />
                        <KpiTile
                            label="Réunions semaine"
                            value={liveKpis.meetings_week ?? 0}
                            icon={CalendarDaysIcon}
                            color="navy"
                            loading={kpisLoading && !initialKpis}
                        />
                        <KpiTile
                            label="Visiteurs du jour"
                            value={liveKpis.visitors_today ?? 0}
                            icon={UserGroupIcon}
                            color="green"
                            loading={kpisLoading && !initialKpis}
                        />
                        <KpiTile
                            label="Absences du jour"
                            value={liveKpis.absences_today ?? 0}
                            icon={ExclamationTriangleIcon}
                            color="amber"
                            loading={kpisLoading && !initialKpis}
                        />
                        <KpiTile
                            label="Ressources réservées"
                            value={liveKpis.rooms_reserved_today ?? 0}
                            icon={HomeModernIcon}
                            color="navy"
                            loading={kpisLoading && !initialKpis}
                        />
                    </div>

                    {/* ======================================================
                        ROW 2 — AreaChart Courrier + BarChart Tâches
                    ====================================================== */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <SectionTitle>Activité courrier — {period.label.toLowerCase()}</SectionTitle>
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={liveMailTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor={C.blue}  stopOpacity={0.2} />
                                            <stop offset="95%" stopColor={C.blue}  stopOpacity={0}   />
                                        </linearGradient>
                                        <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor={C.amber} stopOpacity={0.2} />
                                            <stop offset="95%" stopColor={C.amber} stopOpacity={0}   />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="day"
                                        tickFormatter={(d) => d ? d.slice(5) : ''}
                                        tick={{ fontSize: 11, fill: '#94A3B8' }}
                                    />
                                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                                        labelFormatter={(l) => `Jour : ${l}`}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Area
                                        type="monotone"
                                        dataKey="incoming"
                                        name="Entrant"
                                        stroke={C.blue}
                                        fill="url(#gradIn)"
                                        strokeWidth={2}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="outgoing"
                                        name="Sortant"
                                        stroke={C.amber}
                                        fill="url(#gradOut)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card>
                            <SectionTitle>Tâches par statut</SectionTitle>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={taskBarData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                                        cursor={{ fill: 'rgba(46,134,193,0.06)' }}
                                    />
                                    <Bar dataKey="count" name="Tâches" radius={[4, 4, 0, 0]}>
                                        {taskBarData.map((entry, index) => (
                                            <Cell key={index} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    {/* ======================================================
                        ROW 3 — PieChart Visiteurs + LineChart Réunions
                    ====================================================== */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <SectionTitle>Répartition visiteurs par service (30 j.)</SectionTitle>
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={visitorsByDept ?? []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={3}
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, percent }) =>
                                            `${name} ${(percent * 100).toFixed(0)}%`
                                        }
                                        labelLine={false}
                                    >
                                        {(visitorsByDept ?? []).map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                                        formatter={(v, n) => [v, n]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card>
                            <SectionTitle>Tendance réunions — 3 mois</SectionTitle>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart
                                    data={meetingsTrend ?? []}
                                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fontSize: 11, fill: '#94A3B8' }}
                                    />
                                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        name="Réunions"
                                        stroke={C.navy}
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: C.navy }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    {/* ======================================================
                        ROW 4 — Table Top 5 Services + Activité récente
                    ====================================================== */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <SectionTitle>Top 5 services les plus actifs</SectionTitle>
                            <TopServicesTable departments={topDepartments ?? []} />
                        </Card>

                        <Card>
                            <SectionTitle>Activité récente</SectionTitle>
                            <div className="max-h-80 overflow-y-auto pr-1">
                                <ActivityFeed activities={recentActivity ?? []} />
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </>
    );
}
export { Executive };
