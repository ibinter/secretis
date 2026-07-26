import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    AcademicCapIcon,
    UserGroupIcon,
    StarIcon,
    ClockIcon,
    VideoCameraIcon,
    CheckCircleIcon,
    ChartBarIcon,
    PlusIcon,
    CalendarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }) {
    const colors = {
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
        green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    };
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl ${colors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
        </div>
    );
}

function RatingStars({ value }) {
    return (
        <div className="flex">
            {[1,2,3,4,5].map(i => (
                <StarSolid key={i} className={`w-4 h-4 ${i <= Math.round(value) ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-600'}`} />
            ))}
        </div>
    );
}

const STATUS_LIVE = {
    scheduled:  { label: 'Planifiée', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    live:       { label: 'En direct', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    completed:  { label: 'Terminée',  color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    cancelled:  { label: 'Annulée',   color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
};

// ─── Page principale ─────────────────────────────────────────────────────────

export default function InstructorDashboard({ myCourses = [], myLiveSessions = [], recentRatings = [] }) {
    const [courseTab, setCourseTab] = useState('courses');

    const totalEnrollments    = myCourses.reduce((s, c) => s + (c.enrollments ?? 0), 0);
    const totalCompletions    = myCourses.reduce((s, c) => s + (c.completions ?? 0), 0);
    const avgRating           = myCourses.length > 0
        ? (myCourses.reduce((s, c) => s + parseFloat(c.rating_avg ?? 0), 0) / myCourses.length).toFixed(1)
        : '—';
    const upcomingSessions    = myLiveSessions.filter(s => s.status === 'scheduled').length;
    const totalLearningTime   = myCourses.reduce((s, c) => s + ((c.enrollments ?? 0) * (c.duration_minutes ?? 0)), 0);
    const avgCompletionRate   = myCourses.length > 0
        ? Math.round(myCourses.reduce((s, c) => s + (c.completion_rate ?? 0), 0) / myCourses.length)
        : 0;

    const tabs = [
        { id: 'courses',  label: `Mes cours (${myCourses.length})` },
        { id: 'sessions', label: `Sessions live (${myLiveSessions.length})` },
        { id: 'ratings',  label: `Évaluations (${recentRatings.length})` },
    ];

    return (
        <AppLayout>
            <Head title="Tableau de bord instructeur" />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Tableau de bord instructeur
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Vue d'ensemble de votre activité de formation
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.visit('/training/courses/create')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Nouveau cours
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={UserGroupIcon}  label="Total inscrits"        value={totalEnrollments.toLocaleString()} color="indigo" />
                <StatCard icon={CheckCircleIcon} label="Taux de complétion"   value={`${avgCompletionRate}%`} color="green" />
                <StatCard icon={StarIcon}        label="Note moyenne"          value={avgRating}
                          sub={`${myCourses.length} cours`} color="yellow" />
                <StatCard icon={ClockIcon}       label="Minutes apprises générées"
                          value={totalLearningTime > 0 ? `${Math.round(totalLearningTime / 60)}h` : '—'}
                          sub="cumulé sur tous vos cours" color="purple" />
            </div>

            {/* Onglets */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="flex gap-6">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setCourseTab(t.id)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors
                                ${courseTab === t.id
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Mes cours */}
            {courseTab === 'courses' && (
                <div className="overflow-x-auto">
                    {myCourses.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <AcademicCapIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p>Vous n'avez pas encore créé de cours.</p>
                            <button onClick={() => router.visit('/training/courses/create')}
                                    className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                                Créer mon premier cours
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                                    <th className="pb-3 font-medium">Cours</th>
                                    <th className="pb-3 font-medium text-center">Inscrits</th>
                                    <th className="pb-3 font-medium text-center">Complétions</th>
                                    <th className="pb-3 font-medium text-center">Taux</th>
                                    <th className="pb-3 font-medium text-center">Note</th>
                                    <th className="pb-3 font-medium" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {myCourses.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                {c.thumbnail_path ? (
                                                    <img src={`/storage/${c.thumbnail_path}`} alt={c.title}
                                                         className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                                                        <AcademicCapIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                )}
                                                <span className="font-medium text-gray-900 dark:text-white">{c.title}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-center font-semibold text-gray-900 dark:text-white">
                                            {(c.enrollments ?? 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 text-center text-gray-700 dark:text-gray-300">
                                            {(c.completions ?? 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className={`font-semibold ${c.completion_rate >= 70 ? 'text-green-600' : c.completion_rate >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                                                {c.completion_rate ?? 0}%
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <RatingStars value={c.rating_avg ?? 0} />
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {c.rating_avg > 0 ? Number(c.rating_avg).toFixed(1) : '—'}
                                                    {c.rating_count > 0 && ` (${c.rating_count})`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <button
                                                onClick={() => router.visit(`/training/courses/${c.id}`)}
                                                className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs"
                                            >
                                                Voir →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Sessions live */}
            {courseTab === 'sessions' && (
                <div className="space-y-3">
                    {myLiveSessions.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <VideoCameraIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p>Aucune session live planifiée.</p>
                        </div>
                    ) : (
                        myLiveSessions.map(s => {
                            const stat = STATUS_LIVE[s.status] ?? STATUS_LIVE.scheduled;
                            return (
                                <div key={s.id}
                                     className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                                        <VideoCameraIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 dark:text-white truncate">{s.title}</p>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <CalendarIcon className="w-3.5 h-3.5" />
                                                {new Date(s.scheduled_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <UserGroupIcon className="w-3.5 h-3.5" />
                                                {s.registrant_count ?? 0} inscrits
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${stat.color}`}>
                                        {stat.label}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Évaluations */}
            {courseTab === 'ratings' && (
                <div className="space-y-4">
                    {recentRatings.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <StarIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p>Aucune évaluation pour le moment.</p>
                        </div>
                    ) : (
                        recentRatings.map((r, i) => (
                            <div key={i}
                                 className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                                        {r.user_name?.[0]}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="font-medium text-sm text-gray-900 dark:text-white">{r.user_name}</span>
                                            <span className="text-xs text-gray-400">sur</span>
                                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{r.course_title}</span>
                                        </div>
                                        <RatingStars value={r.rating} />
                                        {r.comment && <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{r.comment}</p>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </AppLayout>
    );
}
export { InstructorDashboard };
