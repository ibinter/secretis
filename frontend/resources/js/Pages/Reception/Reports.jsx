/**
 * Reception/Reports.jsx — Rapports d'affluence de l'accueil
 *
 * Présentation migrée sur `@/Components/UI`.
 * Logique métier inchangée : mêmes props Inertia (`report`, `last30`, `date`),
 * même navigation (`/reception/reports?date=`), même export
 * (`/reception/reports/pdf?date=`), mêmes calculs dérivés.
 */

import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import AppLayout from '@/Layouts/AppLayout';
import {
    BarChart3, FileText, Users, UserCheck, LogOut, UserX, Timer,
    TrendingDown, Clock, PieChart as PieChartIcon, Trophy,
} from 'lucide-react';
import {
    PageHeader, Button, Card, EmptyState, StatCard,
    cx, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT,
} from '@/Components/UI';

// ─── Rapports Reception ───────────────────────────────────────────────────────
const COLORS = ['#9333EA', '#0284C7', '#059669', '#D97706', '#DC2626', '#64748B'];

/* Réglages Recharts lisibles en clair comme en sombre. */
const AXIS_TICK  = { fontSize: 11, fill: '#94A3B8' };
const GRID_STROKE = 'rgba(148, 163, 184, 0.25)';
const TOOLTIP_STYLE = {
    borderRadius: 8,
    border: '1px solid #E2E8F0',
    fontSize: 12,
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
};

export default function Reports({ report = {}, last30 = [], date = '' }) {
    const [selectedDate, setSelectedDate] = useState(date);

    const handleDateChange = (d) => {
        setSelectedDate(d);
        router.get('/reception/reports', { date: d }, { preserveState: true });
    };

    const exportPdf = () => {
        window.location.href = `/reception/reports/pdf?date=${selectedDate}`;
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

    const trend      = Array.isArray(last30) ? last30 : [];
    const topHosts   = Array.isArray(report.top_hosts) ? report.top_hosts : [];
    const hasTrend   = trend.some(d => (d?.count ?? 0) > 0);
    const hasPeak    = peakHoursData.some(d => d.visits > 0);

    /* ─── Rendu ────────────────────────────────────────────────────────────── */

    return (
        <AppLayout>
            <Head title="Rapports Réception" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

                <PageHeader
                    icon={BarChart3}
                    title="Rapports de l'accueil"
                    breadcrumbs={[{ label: 'Réception' }, { label: 'Rapports' }]}
                    subtitle="Affluence, durée de présence et taux d'absence, jour par jour."
                    actions={
                        <>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => handleDateChange(e.target.value)}
                                aria-label="Date du rapport"
                                className={cx(CONTROL, 'h-10 w-auto')}
                            />
                            <Button variant="primary" icon={FileText} onClick={exportPdf}>
                                Export PDF
                            </Button>
                        </>
                    }
                />

                {/* Indicateurs du jour */}
                <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                    <StatCard label="Total visites"  value={report.total_visits ?? 0}  icon={Users}        tone="accent"  />
                    <StatCard label="Présents"       value={report.checked_in ?? 0}    icon={UserCheck}    tone="success" />
                    <StatCard label="Partis"         value={report.checked_out ?? 0}   icon={LogOut}       tone="neutral" />
                    <StatCard label="No-show"        value={report.no_show ?? 0}       icon={UserX}        tone="danger"  />
                    <StatCard label="Durée moyenne"  value={report.average_duration_min ?? 0} unit="min" icon={Timer} tone="info" />
                    <StatCard label="Taux no-show"   value={noShowRate} unit="%"       icon={TrendingDown} tone={noShowRate > 20 ? 'danger' : 'warning'} />
                </div>

                {/* Graphiques */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                    {/* Visites sur 30 jours */}
                    <Card
                        icon={BarChart3}
                        title="Visites sur 30 jours"
                        subtitle="Volume quotidien d'entrées enregistrées."
                    >
                        {!hasTrend ? (
                            <EmptyState
                                compact
                                icon={BarChart3}
                                title="Pas encore d'historique"
                                description="La courbe se construit à partir des check-in enregistrés ; revenez après quelques journées d'activité."
                            />
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                                    <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false}
                                        tickFormatter={d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} />
                                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={TOOLTIP_STYLE}
                                        cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                                        labelFormatter={d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        formatter={v => [v, 'visites']}
                                    />
                                    <Bar dataKey="count" fill="#9333EA" radius={[4, 4, 0, 0]} name="Visites" maxBarSize={22} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Card>

                    {/* Affluence par heure */}
                    <Card
                        icon={Clock}
                        title="Pic d'affluence"
                        subtitle="Répartition des arrivées entre 8 h et 18 h."
                    >
                        {!hasPeak ? (
                            <EmptyState
                                compact
                                icon={Clock}
                                title="Aucune arrivée sur la journée"
                                description="Sélectionnez une autre date : les heures d'affluence se calculent à partir des check-in du jour choisi."
                            />
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={peakHoursData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                                    <XAxis dataKey="hour" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [v, 'arrivées']} />
                                    <Line type="monotone" dataKey="visits" stroke="#0284C7" strokeWidth={2}
                                        dot={{ fill: '#0284C7', r: 3 }} activeDot={{ r: 5 }} name="Arrivées" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </Card>

                    {/* Répartition par motif */}
                    <Card
                        icon={PieChartIcon}
                        title="Répartition par motif"
                        subtitle="Objet déclaré des visites du jour."
                    >
                        {purposeData.length === 0 ? (
                            <EmptyState
                                compact
                                icon={PieChartIcon}
                                title="Aucun motif renseigné"
                                description="Le motif est saisi au check-in, à la borne comme à l'accueil ; il alimente ce graphique."
                            />
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={purposeData} cx="50%" cy="50%" outerRadius={80}
                                        dataKey="value" labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {purposeData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </Card>

                    {/* Top hôtes */}
                    <Card
                        icon={Trophy}
                        title="Hôtes les plus visités"
                        subtitle="Classement des 10 collaborateurs recevant le plus de visiteurs."
                    >
                        {topHosts.length === 0 ? (
                            <EmptyState
                                compact
                                icon={Trophy}
                                title="Aucun hôte à classer"
                                description="Le classement se construit dès que des visites sont rattachées à un collaborateur."
                            />
                        ) : (
                            <ol className="space-y-3">
                                {topHosts.map((item, i) => {
                                    const max = topHosts[0]?.count || 1;
                                    const pct = Math.max(2, Math.round((item.count / max) * 100));
                                    return (
                                        <li key={i} className="flex items-center gap-3">
                                            <span className={cx('w-5 shrink-0 text-xs font-semibold tabular-nums', TEXT_FAINT)}>
                                                {i + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1 flex items-center justify-between gap-3">
                                                    <span className={cx('truncate text-sm font-medium', TEXT_TITLE)}>
                                                        {item.host || '—'}
                                                    </span>
                                                    <span className={cx('shrink-0 text-sm font-semibold tabular-nums', TEXT_MUTED)}>
                                                        {item.count}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                                                    <div className="h-full rounded-full bg-purple-600" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
export { Reports };
