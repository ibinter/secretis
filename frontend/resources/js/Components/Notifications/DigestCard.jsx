/**
 * DigestCard.jsx — Carte de digest quotidien affichée sur le Dashboard
 *
 * Affichée le matin sur le dashboard, elle présente :
 *  - Un message de bienvenue personnalisé
 *  - La mini timeline des événements du jour
 *  - Les 3 tâches prioritaires
 *  - Un résumé de la veille
 *  - Dismissable pour aujourd'hui (mémorisé dans localStorage)
 *
 * Usage dans Dashboard :
 *   import DigestCard from '@/Components/Notifications/DigestCard';
 *   <DigestCard />
 */

import { useCallback, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    BellIcon,
    CalendarIcon,
    CheckCircleIcon,
    ClipboardDocumentListIcon,
    ClockIcon,
    EnvelopeIcon,
    XMarkIcon,
    ArrowRightIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { useDigest } from '@/hooks/useNotificationCenter';

// ─── Clé localStorage pour le dismiss ─────────────────────────────────────────
const DISMISS_KEY = 'secretis_digest_dismissed';

function isDismissedToday() {
    try {
        const val = localStorage.getItem(DISMISS_KEY);
        return val === new Date().toDateString();
    } catch {
        return false;
    }
}

function dismissToday() {
    try {
        localStorage.setItem(DISMISS_KEY, new Date().toDateString());
    } catch (_) {}
}

// =============================================================================
// Composant principal DigestCard
// =============================================================================

export default function DigestCard({ className = '' }) {
    const { digest, isLoading } = useDigest();
    const [dismissed, setDismissed] = useState(isDismissedToday);

    const handleDismiss = useCallback(() => {
        dismissToday();
        setDismissed(true);
    }, []);

    // Ne pas afficher si dismissé ou si pas de digest
    if (dismissed) return null;

    // Afficher seulement le matin (avant 12h) ou si le digest a du contenu urgent
    const hour = new Date().getHours();
    const hasUrgent = digest?.urgent_tasks?.length > 0 || digest?.urgent_mails?.length > 0;
    if (hour >= 14 && !hasUrgent) return null;

    if (isLoading) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 ${className}`}>
                <div className="animate-pulse space-y-3">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                </div>
            </div>
        );
    }

    if (!digest) return null;

    return (
        <div className={`relative bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800/50
            rounded-2xl border border-purple-100 dark:border-purple-900/30 overflow-hidden ${className}`}
        >
            {/* Bouton fermer */}
            <button
                onClick={handleDismiss}
                title="Masquer pour aujourd'hui"
                className="absolute top-3 right-3 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors z-10"
                aria-label="Fermer le digest"
            >
                <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>

            <div className="p-5">
                {/* ── En-tête ──────────────────────────────────────────────────── */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                        <SparklesIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">
                            {digest.greeting}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{digest.day_summary}</p>
                    </div>
                </div>

                {/* ── Grille de contenu ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    {/* Agenda du jour */}
                    <DigestSection
                        icon={CalendarIcon}
                        title="Agenda du jour"
                        color="text-purple-600"
                        empty={digest.today_events?.length === 0}
                        emptyText="Aucun événement"
                    >
                        {digest.today_events?.slice(0, 3).map((event, i) => (
                            <EventLine key={i} event={event} />
                        ))}
                        {digest.today_events?.length > 3 && (
                            <p className="text-xs text-gray-400 mt-1">
                                +{digest.today_events.length - 3} autre(s)
                            </p>
                        )}
                    </DigestSection>

                    {/* Tâches prioritaires */}
                    <DigestSection
                        icon={ClipboardDocumentListIcon}
                        title="Tâches prioritaires"
                        color="text-orange-600"
                        empty={digest.urgent_tasks?.length === 0}
                        emptyText="Aucune tâche urgente"
                    >
                        {digest.urgent_tasks?.slice(0, 3).map((task, i) => (
                            <TaskLine key={i} task={task} />
                        ))}
                    </DigestSection>

                    {/* Courriers urgents */}
                    {digest.urgent_mails?.length > 0 ? (
                        <DigestSection
                            icon={EnvelopeIcon}
                            title="Courriers urgents"
                            color="text-red-600"
                            empty={false}
                        >
                            {digest.urgent_mails.slice(0, 3).map((mail, i) => (
                                <MailLine key={i} mail={mail} />
                            ))}
                        </DigestSection>
                    ) : (
                        // Résumé de la veille si pas de courriers urgents
                        <DigestSection
                            icon={BellIcon}
                            title="Résumé de la veille"
                            color="text-gray-600"
                            empty={!digest.yesterday?.total}
                            emptyText="Journée calme hier"
                        >
                            {digest.yesterday?.total > 0 && (
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-700 dark:text-gray-300">
                                        <span className="font-semibold">{digest.yesterday.total}</span> notification(s) reçues
                                    </p>
                                    {Object.entries(digest.yesterday.by_type || {}).slice(0, 3).map(([type, count]) => (
                                        <p key={type} className="text-xs text-gray-500 capitalize">
                                            · {count} {type.replace(/_/g, ' ')}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </DigestSection>
                    )}
                </div>

                {/* ── Pied de carte ─────────────────────────────────────────────── */}
                <div className="mt-4 pt-3 border-t border-purple-100 dark:border-purple-900/30 flex items-center justify-between">
                    <Link
                        href="/notifications/center"
                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                        Voir toutes les notifications
                        <ArrowRightIcon className="h-3 w-3" />
                    </Link>
                    <button
                        onClick={handleDismiss}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        Masquer pour aujourd'hui
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Sous-composants
// =============================================================================

function DigestSection({ icon: Icon, title, color, children, empty, emptyText }) {
    return (
        <div className="bg-white/60 dark:bg-gray-700/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">{title}</h4>
            </div>
            {empty ? (
                <p className="text-xs text-gray-400 italic">{emptyText}</p>
            ) : (
                <div className="space-y-1.5">{children}</div>
            )}
        </div>
    );
}

function EventLine({ event }) {
    const start = event.start_at ? new Date(event.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    return (
        <div className="flex items-start gap-2">
            <span className="flex-shrink-0 text-[10px] font-mono text-purple-600 dark:text-purple-400 mt-0.5 w-10">{start}</span>
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1">{event.title}</p>
        </div>
    );
}

function TaskLine({ task }) {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date();
    return (
        <div className="flex items-start gap-2">
            <ExclamationCircleIcon className={`flex-shrink-0 h-3.5 w-3.5 mt-0.5 ${isOverdue ? 'text-red-500' : 'text-orange-500'}`} />
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1">{task.title}</p>
        </div>
    );
}

function MailLine({ mail }) {
    return (
        <div className="flex items-start gap-2">
            <EnvelopeIcon className="flex-shrink-0 h-3.5 w-3.5 mt-0.5 text-red-500" />
            <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-1">{mail.subject}</p>
                <p className="text-[10px] text-gray-400">Réf. {mail.reference}</p>
            </div>
        </div>
    );
}
export { DigestCard };
