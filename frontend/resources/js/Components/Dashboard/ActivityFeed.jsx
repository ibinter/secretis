/**
 * ActivityFeed.jsx — Flux d'activité récente avec horodatage relatif
 *
 * Props :
 *   activities   {array}   [{id, action, module, resource_type, resource_id,
 *                            user_name, user_avatar, created_at}]
 *   loading      {boolean}
 *   maxItems     {number}  défaut 20
 */

import { useMemo } from 'react';
import { Link } from '@inertiajs/react';
import {
    EnvelopeIcon,
    CalendarDaysIcon,
    ClipboardDocumentListIcon,
    UserGroupIcon,
    BuildingOfficeIcon,
    DocumentTextIcon,
    FolderIcon,
    ChatBubbleLeftRightIcon,
    CogIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow, parseISO, format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';

// ============================================================================
// Mapping module → icône + couleur
// ============================================================================

const MODULE_META = {
    courrier:   { Icon: EnvelopeIcon,                 color: 'text-[#7e22ce] bg-purple-50',    label: 'Courrier' },
    agenda:     { Icon: CalendarDaysIcon,              color: 'text-[#9333EA] bg-indigo-50',  label: 'Agenda' },
    taches:     { Icon: ClipboardDocumentListIcon,     color: 'text-emerald-600 bg-emerald-50',label: 'Tâches' },
    reunions:   { Icon: UserGroupIcon,                 color: 'text-purple-600 bg-purple-50', label: 'Réunions' },
    accueil:    { Icon: BuildingOfficeIcon,            color: 'text-[#F39C12] bg-amber-50',   label: 'Accueil' },
    ged:        { Icon: DocumentTextIcon,              color: 'text-teal-600 bg-teal-50',     label: 'GED' },
    projets:    { Icon: FolderIcon,                   color: 'text-orange-600 bg-orange-50', label: 'Projets' },
    messages:   { Icon: ChatBubbleLeftRightIcon,      color: 'text-pink-600 bg-pink-50',     label: 'Messages' },
    admin:      { Icon: CogIcon,                      color: 'text-gray-600 bg-gray-50',     label: 'Admin' },
    audit:      { Icon: ShieldCheckIcon,              color: 'text-red-600 bg-red-50',       label: 'Audit' },
};

const DEFAULT_META = { Icon: CogIcon, color: 'text-gray-400 bg-gray-50', label: 'Système' };

// Libellés d'actions
const ACTION_LABELS = {
    created: 'a créé',
    updated: 'a modifié',
    deleted: 'a supprimé',
    approved: 'a approuvé',
    rejected: 'a rejeté',
    completed: 'a terminé',
    assigned: 'a assigné',
    sent: 'a envoyé',
    received: 'a reçu',
    checkin: 'a enregistré',
    checkout: 'a libéré',
};

const RESOURCE_LABELS = {
    mail_registry: 'un courrier',
    event: 'un événement',
    task: 'une tâche',
    meeting: 'une réunion',
    visitor: 'un visiteur',
    document: 'un document',
    room_reservation: 'une réservation de salle',
    leave: 'un congé',
    project: 'un projet',
    user: 'un utilisateur',
};

function resourceRoute(resourceType, resourceId) {
    const map = {
        mail_registry: `/courrier`,
        event: `/agenda`,
        task: `/taches`,
        meeting: `/reunions/${resourceId}`,
        visitor: `/accueil`,
        document: `/ged`,
        room_reservation: `/agenda`,
        project: `/projets/${resourceId}`,
    };
    return map[resourceType] ?? null;
}

// ============================================================================
// Groupement par heure
// ============================================================================

function groupByHour(activities) {
    const groups = {};

    for (const activity of activities) {
        const date = parseISO(activity.created_at);
        let key;

        if (isToday(date)) {
            key = `Aujourd'hui — ${format(date, 'HH:00')}`;
        } else if (isYesterday(date)) {
            key = `Hier — ${format(date, 'HH:00')}`;
        } else {
            key = format(date, 'EEEE d MMM — HH:00', { locale: fr });
        }

        if (!groups[key]) groups[key] = [];
        groups[key].push(activity);
    }

    return groups;
}

// ============================================================================
// COMPOSANT
// ============================================================================

function SkeletonFeed() {
    return (
        <div className="space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-1">
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function ActivityFeed({ activities = [], loading = false, maxItems = 20 }) {
    const limited = useMemo(() => activities.slice(0, maxItems), [activities, maxItems]);
    const grouped = useMemo(() => groupByHour(limited), [limited]);

    if (loading) return <SkeletonFeed />;

    if (!limited.length) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <ShieldCheckIcon className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Aucune activité récente</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {Object.entries(grouped).map(([hourLabel, items]) => (
                <div key={hourLabel}>
                    {/* Séparateur horaire */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                            {hourLabel}
                        </span>
                        <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    {/* Activités du groupe */}
                    <ul className="space-y-2.5">
                        {items.map((activity) => {
                            const meta = MODULE_META[activity.module] ?? DEFAULT_META;
                            const { Icon, color } = meta;
                            const actionLabel = ACTION_LABELS[activity.action] ?? activity.action;
                            const resourceLabel = RESOURCE_LABELS[activity.resource_type] ?? activity.resource_type;
                            const href = resourceRoute(activity.resource_type, activity.resource_id);
                            const timeAgo = formatDistanceToNow(parseISO(activity.created_at), {
                                addSuffix: true,
                                locale: fr,
                            });

                            const content = (
                                <div
                                    className={clsx(
                                        'flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                        href ? 'hover:bg-gray-50 cursor-pointer' : '',
                                    )}
                                >
                                    {/* Icône module */}
                                    <div className={clsx('p-1.5 rounded-full shrink-0', color)}>
                                        <Icon className="h-3.5 w-3.5" />
                                    </div>

                                    {/* Texte */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-700 leading-snug">
                                            <span className="font-semibold text-[#9333EA]">
                                                {activity.user_name ?? 'Système'}
                                            </span>{' '}
                                            {actionLabel}{' '}
                                            <span className="text-gray-500">{resourceLabel}</span>
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo}</p>
                                    </div>
                                </div>
                            );

                            return (
                                <li key={activity.id}>
                                    {href ? (
                                        <Link href={href}>{content}</Link>
                                    ) : (
                                        content
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </div>
    );
}
export { ActivityFeed };
