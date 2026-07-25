import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    AcademicCapIcon,
    ClockIcon,
    CheckCircleIcon,
    TrophyIcon,
    ArrowDownTrayIcon,
    UserGroupIcon,
    ChartBarIcon,
} from '@heroicons/react/24/outline';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color = 'indigo', trend }) {
    const colors = {
        indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' },
        green:  { bg: 'bg-green-50 dark:bg-green-900/20',   text: 'text-green-600 dark:text-green-400' },
        yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400' },
        blue:   { bg: 'bg-purple-50 dark:bg-purple-900/20',     text: 'text-purple-600 dark:text-purple-400' },
    };
    const c = colors[color] ?? colors.indigo;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${c.bg}`}>
                    <Icon className={`w-6 h-6 ${c.text}`} />
                </div>
                {trend != null && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full
                        ${trend >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {trend >= 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
            {sub && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
    );
}

// ─── BarChart simple ──────────────────────────────────────────────────────────

function BarChart({ data, labelKey = 'title', valueKey = 'enrollments', title, color = '#6366f1' }) {
    const max = Math.max(...data.map(d => d[valueKey] ?? 0), 1);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-5">{title}</h3>
            <div className="space-y-3">
                {data.slice(0, 8).map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="w-32 lg:w-40 text-xs text-gray-600 dark:text-gray-400 truncate flex-shrink-0">
                            {item[labelKey]}
                        </div>
                        <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                            <div
                                className="h-full rounded-lg flex items-center pl-2 text-xs font-medium text-white transition-all duration-700"
                                style={{
                                    width: `${Math.max(4, (item[valueKey] / max) * 100)}%`,
                                    backgroundColor: color,
                                }}
                            >
                                {item[valueKey] > 0 && item[valueKey]}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── LineChart simple (activité sur 12 mois) ──────────────────────────────────

function LineChart({ data, title }) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
                <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                    Pas encore de données
                </div>
            </div>
        );
    }

    const maxVal  = Math.max(...data.map(d => d.count), 1);
    const W = 540, H = 140, PAD = 20;
    const xStep   = (W - PAD * 2) / Math.max(data.length - 1, 1);

    const points  = data.map((d, i) => ({
        x: PAD + i * xStep,
        y: H - PAD - ((d.count / maxVal) * (H - PAD * 2)),
        label: d.month?.slice(5) ?? '',
        val: d.count,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${H - PAD} L ${points[0].x} ${H - PAD} Z`;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
                {/* Grilles horizontales */}
                {[0.25, 0.5, 0.75, 1].map(f => (
                    <line key={f}
                          x1={PAD} y1={H - PAD - f * (H - PAD * 2)}
                          x2={W - PAD} y2={H - PAD - f * (H - PAD * 2)}
                          stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-gray-700" />
                ))}
                {/* Aire */}
                <path d={areaD} fill="#6366f1" fillOpacity="0.08" />
                {/* Ligne */}
                <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* Points et labels */}
                {points.map((p, i) => (
                    <g key={i}>
                        <circle cx={p.x} cy={p.y} r="3" fill="#6366f1" />
                        {i % 2 === 0 && (
                            <text x={p.x} y={H - 4} textAnchor="middle" fontSize="9" className="fill-gray-400">
                                {p.label}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
}

// ─── Tableau conformité ───────────────────────────────────────────────────────

function ComplianceTable({ topCourses }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-900 dark:text-white">Formations & taux de complétion</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                            <th className="pb-3 font-medium">Formation</th>
                            <th className="pb-3 font-medium text-right">Inscrits</th>
                            <th className="pb-3 font-medium text-right">Terminé</th>
                            <th className="pb-3 font-medium text-right">Taux</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {topCourses.map(c => {
                            const rate = c.enrollments > 0
                                ? Math.round(c.completions / c.enrollments * 100)
                                : 0;
                            return (
                                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                    <td className="py-3 pr-4">
                                        <p className="font-medium text-gray-900 dark:text-white">{c.title}</p>
                                        {c.category && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{c.category}</p>
                                        )}
                                    </td>
                                    <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                                        {(c.enrollments ?? 0).toLocaleString()}
                                    </td>
                                    <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                                        {(c.completions ?? 0).toLocaleString()}
                                    </td>
                                    <td className="py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${rate >= 70 ? 'bg-green-500' : rate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                    style={{ width: `${rate}%` }}
                                                />
                                            </div>
                                            <span className={`font-semibold text-xs w-8 text-right
                                                ${rate >= 70 ? 'text-green-600 dark:text-green-400' : rate >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'}`}>
                                                {rate}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function AdminDashboard({ kpis = {}, topCourses = [], activityByMonth = [] }) {
    const handleExport = () => {
        window.open('/training/export/report', '_blank');
    };

    return (
        <AppLayout>
            <Head title="Formation — Tableau de bord RH" />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Tableau de bord Formation
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Activité de formation de l'organisation
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Export rapport DRH
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KpiCard
                    icon={AcademicCapIcon}
                    label="Formations actives"
                    value={kpis.active_courses ?? 0}
                    color="indigo"
                />
                <KpiCard
                    icon={UserGroupIcon}
                    label="Inscriptions totales"
                    value={(kpis.total_enrollments ?? 0).toLocaleString()}
                    color="blue"
                />
                <KpiCard
                    icon={CheckCircleIcon}
                    label="Taux de complétion"
                    value={`${kpis.completion_rate ?? 0}%`}
                    color="green"
                />
                <KpiCard
                    icon={TrophyIcon}
                    label="Certifications ce mois"
                    value={kpis.certs_this_month ?? 0}
                    sub="émises ce mois-ci"
                    color="yellow"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <BarChart
                    data={topCourses}
                    labelKey="title"
                    valueKey="enrollments"
                    title="Formations les plus suivies"
                />
                <LineChart
                    data={activityByMonth}
                    title="Activité de formation — 12 mois"
                />
            </div>

            {/* Tableau conformité */}
            {topCourses.length > 0 && (
                <ComplianceTable topCourses={topCourses} />
            )}
        </AppLayout>
    );
}
export { AdminDashboard };
