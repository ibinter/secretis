/**
 * Dashboard/Index.jsx — Tableau de bord principal SECRETIS ERP
 *
 * Reçoit les props depuis DashboardController@index :
 *   - auth            : { user: { id, name, email, role } }
 *   - organization    : { id, name, plan_id, trial_ends_at } | null
 *   - stats           : { events_this_week, pending_tasks, documents_this_month, visitors_today }
 *   - recentEvents    : array
 *   - pendingTasks    : array
 *   - recentDocuments : array
 *   - trial_days_remaining : number
 */

import { Head, usePage, Link } from '@inertiajs/react';
import {
    CalendarDaysIcon,
    ClipboardDocumentListIcon,
    DocumentDuplicateIcon,
    UserGroupIcon,
    BellAlertIcon,
} from '@heroicons/react/24/outline';
import AppLayout from '@/Layouts/AppLayout';

// ─── Tuile KPI ────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color = '#9333EA' }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 flex items-center gap-4">
            <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}20` }}
            >
                <Icon className="w-6 h-6" style={{ color }} />
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? 0}</p>
            </div>
        </div>
    );
}

// ─── Bannière d'essai ─────────────────────────────────────────────────────────
function TrialBanner({ days }) {
    if (!days && days !== 0) return null;
    const urgent = days <= 3;
    return (
        <div
            className={`rounded-xl px-5 py-3 flex items-center gap-3 mb-6 ${
                urgent ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                       : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700'
            }`}
        >
            <BellAlertIcon className={`w-5 h-5 flex-shrink-0 ${urgent ? 'text-red-500' : 'text-amber-500'}`} />
            <p className={`text-sm font-medium ${urgent ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {days === 0
                    ? 'Votre période d\'essai se termine aujourd\'hui.'
                    : `Il vous reste ${days} jour${days > 1 ? 's' : ''} d'essai.`}{' '}
                <Link href="/abonnement" className="underline font-semibold">
                    Souscrire maintenant
                </Link>
            </p>
        </div>
    );
}

// ─── Liste d'événements ───────────────────────────────────────────────────────
function EventList({ events }) {
    if (!events?.length) {
        return <p className="text-sm text-gray-400 py-4 text-center">Aucun événement à venir</p>;
    }
    return (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {events.slice(0, 6).map((ev) => (
                <li key={ev.id} className="py-3 flex items-start gap-3">
                    <span
                        className="mt-1 w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ev.color ?? '#9333EA' }}
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ev.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {ev.start_at
                                ? new Date(ev.start_at).toLocaleString('fr-FR', {
                                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                                  })
                                : '—'}
                            {ev.location ? ` · ${ev.location}` : ''}
                        </p>
                    </div>
                </li>
            ))}
        </ul>
    );
}

// ─── Liste de tâches ──────────────────────────────────────────────────────────
const PRIORITY_COLOR = { urgent: '#E74C3C', high: '#F39C12', medium: '#3498DB', low: '#95A5A6' };

function TaskList({ tasks }) {
    if (!tasks?.length) {
        return <p className="text-sm text-gray-400 py-4 text-center">Aucune tâche en cours</p>;
    }
    return (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {tasks.slice(0, 6).map((t) => (
                <li key={t.id} className="py-3 flex items-center gap-3">
                    <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PRIORITY_COLOR[t.priority] ?? '#95A5A6' }}
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.title}</p>
                        {t.due_date && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Échéance : {new Date(t.due_date).toLocaleDateString('fr-FR')}
                            </p>
                        )}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">
                        {t.status}
                    </span>
                </li>
            ))}
        </ul>
    );
}

// ─── Liste de documents ───────────────────────────────────────────────────────
function DocumentList({ docs }) {
    if (!docs?.length) {
        return <p className="text-sm text-gray-400 py-4 text-center">Aucun document récent</p>;
    }
    return (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {docs.slice(0, 6).map((d) => (
                <li key={d.id} className="py-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {d.updated_at ? new Date(d.updated_at).toLocaleDateString('fr-FR') : '—'}
                        {d.file_type ? ` · ${d.file_type.toUpperCase()}` : ''}
                    </p>
                </li>
            ))}
        </ul>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function DashboardIndex() {
    const {
        auth,
        organization,
        stats = {},
        recentEvents = [],
        pendingTasks = [],
        recentDocuments = [],
        trial_days_remaining,
    } = usePage().props;

    const user = auth?.user ?? {};

    const kpis = [
        {
            icon: CalendarDaysIcon,
            label: 'Événements cette semaine',
            value: stats.events_this_week ?? 0,
            color: '#9333EA',
        },
        {
            icon: ClipboardDocumentListIcon,
            label: 'Tâches en cours',
            value: stats.pending_tasks ?? 0,
            color: '#F39C12',
        },
        {
            icon: DocumentDuplicateIcon,
            label: 'Documents ce mois',
            value: stats.documents_this_month ?? 0,
            color: '#27AE60',
        },
        {
            icon: UserGroupIcon,
            label: 'Visiteurs aujourd\'hui',
            value: stats.visitors_today ?? 0,
            color: '#3498DB',
        },
    ];

    return (
        <AppLayout>
            <Head title="Tableau de bord" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* En-tête */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Bonjour, {user.name ?? 'Utilisateur'} 👋
                    </h1>
                    {organization && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {organization.name}
                        </p>
                    )}
                </div>

                {/* Bannière période d'essai */}
                {trial_days_remaining != null && trial_days_remaining <= 14 && (
                    <TrialBanner days={trial_days_remaining} />
                )}

                {/* KPI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                    {kpis.map((k) => (
                        <KpiCard key={k.label} {...k} />
                    ))}
                </div>

                {/* Grille principale */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Événements à venir */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <CalendarDaysIcon className="w-5 h-5 text-[#9333EA]" />
                            Événements à venir
                        </h2>
                        <EventList events={recentEvents} />
                        <Link
                            href="/agenda"
                            className="mt-4 block text-xs text-center text-[#9333EA] hover:underline"
                        >
                            Voir l'agenda complet →
                        </Link>
                    </div>

                    {/* Mes tâches */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <ClipboardDocumentListIcon className="w-5 h-5 text-[#F39C12]" />
                            Mes tâches
                        </h2>
                        <TaskList tasks={pendingTasks} />
                        <Link
                            href="/taches"
                            className="mt-4 block text-xs text-center text-[#9333EA] hover:underline"
                        >
                            Voir toutes les tâches →
                        </Link>
                    </div>

                    {/* Documents récents */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <DocumentDuplicateIcon className="w-5 h-5 text-[#27AE60]" />
                            Documents récents
                        </h2>
                        <DocumentList docs={recentDocuments} />
                        <Link
                            href="/ged"
                            className="mt-4 block text-xs text-center text-[#9333EA] hover:underline"
                        >
                            Voir la GED →
                        </Link>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
