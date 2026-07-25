/**
 * Center.jsx — Centre de notifications SECRETIS
 *
 * Page complète de gestion des notifications :
 *  - Vue liste paginée avec filtres (non lus, par module, archivées)
 *  - Groupement par date (Aujourd'hui, Hier, Cette semaine, Plus ancien)
 *  - Actions inline : marquer lu, archiver, snooze, feedback
 *  - Prévisualisation au hover
 *  - Recherche dans les notifications
 *  - Onglet "Archivées"
 *  - Bouton "Tout marquer comme lu"
 *
 * Route : GET /notifications/center
 */

import { useCallback, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    ArchiveBoxIcon,
    BellIcon,
    CalendarIcon,
    ChatBubbleLeftRightIcon,
    CheckCircleIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon,
    EnvelopeOpenIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    MegaphoneIcon,
    UserPlusIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    HandThumbDownIcon,
    HandThumbUpIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import {
    useNotifications,
    useNotificationActions,
    useRealtimeNotifications,
} from '@/hooks/useNotificationCenter';

// ─── Types et configuration ────────────────────────────────────────────────────

const TYPE_CONFIG = {
    message:          { icon: ChatBubbleLeftRightIcon,    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',   label: 'Message',       module: 'messages' },
    task_assigned:    { icon: ClipboardDocumentCheckIcon, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30',   label: 'Tâche',         module: 'taches' },
    task_overdue:     { icon: ExclamationTriangleIcon,    color: 'text-red-600 bg-red-50 dark:bg-red-900/30',            label: 'Retard',        module: 'taches' },
    mail_urgent:      { icon: EnvelopeOpenIcon,           color: 'text-red-600 bg-red-50 dark:bg-red-900/30',            label: 'Courrier urgent', module: 'courrier' },
    mail_received:    { icon: EnvelopeOpenIcon,           color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',         label: 'Courrier',      module: 'courrier' },
    meeting_reminder: { icon: CalendarIcon,               color: 'text-green-600 bg-green-50 dark:bg-green-900/30',      label: 'Réunion',       module: 'agenda' },
    event_created:    { icon: CalendarIcon,               color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',   label: 'Agenda',        module: 'agenda' },
    visitor_arrived:  { icon: UserPlusIcon,               color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',         label: 'Visiteur',      module: 'accueil' },
    circular:         { icon: MegaphoneIcon,              color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',   label: 'Circulaire',    module: 'messages' },
    stock_alert:      { icon: ExclamationTriangleIcon,    color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',   label: 'Stock',         module: 'stock' },
    digest:           { icon: BellIcon,                   color: 'text-gray-600 bg-gray-50 dark:bg-gray-700',            label: 'Digest',        module: 'system' },
};

const MODULES = [
    { value: '',        label: 'Tous les modules' },
    { value: 'agenda',  label: 'Agenda' },
    { value: 'courrier',label: 'Courrier' },
    { value: 'taches',  label: 'Tâches' },
    { value: 'messages',label: 'Messages' },
    { value: 'accueil', label: 'Accueil' },
    { value: 'rh',      label: 'RH' },
    { value: 'stock',   label: 'Ressources' },
    { value: 'system',  label: 'Système' },
];

const SNOOZE_OPTIONS = [
    { value: '1h', label: 'Dans 1 heure' },
    { value: '1d', label: 'Demain matin' },
    { value: '1w', label: 'Dans 1 semaine' },
];

// =============================================================================
// Page principale
// =============================================================================

export default function NotificationCenter({ initialNotifications, unreadCount: initialUnread }) {
    const [filters, setFilters] = useState({
        unread_only: false,
        archived:    false,
        module:      '',
        search:      '',
        page:        1,
    });
    const [snoozeTarget, setSnoozeTarget] = useState(null); // ID de la notif en cours de snooze
    const [searchInput, setSearchInput]   = useState('');

    // ── Données ──────────────────────────────────────────────────────────────
    const {
        notifications, grouped, totalCount, currentPage, lastPage, unreadCount, isLoading,
    } = useNotifications(filters);

    const { markRead, markAllRead, snooze, archive, feedback, isMarkingAll } = useNotificationActions();

    // ── Temps réel ──────────────────────────────────────────────────────────
    useRealtimeNotifications();

    // ── Handlers ─────────────────────────────────────────────────────────────
    const updateFilter = useCallback((key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    }, []);

    const handleSearch = useCallback((e) => {
        e.preventDefault();
        updateFilter('search', searchInput);
    }, [searchInput, updateFilter]);

    const handleSnooze = useCallback((id, delay) => {
        snooze(id, delay);
        setSnoozeTarget(null);
    }, [snooze]);

    const handleNotifClick = useCallback((notif) => {
        if (!notif.read_at) markRead(notif.id);
        if (notif.data?.action_url) window.location.href = notif.data.action_url;
    }, [markRead]);

    // ── Groupes de notifications pour l'affichage ──────────────────────────
    const groupedNotifs = grouped();
    const groupOrder    = ['Aujourd\'hui', 'Hier', 'Cette semaine', 'Plus ancien'];

    return (
        <>
            <Head title="Centre de notifications" />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="max-w-4xl mx-auto px-4 py-8">

                    {/* ── En-tête ──────────────────────────────────────────────── */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <BellIcon className="h-7 w-7 text-purple-600" />
                                Notifications
                            </h1>
                            {unreadCount > 0 && (
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                href="/notifications/preferences"
                                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Préférences
                            </Link>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    disabled={isMarkingAll}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                >
                                    <CheckCircleSolid className="h-4 w-4" />
                                    {isMarkingAll ? 'En cours…' : 'Tout marquer lu'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Filtres + Recherche ───────────────────────────────────── */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-6 space-y-3">
                        {/* Onglets */}
                        <div className="flex items-center gap-1 border-b border-gray-100 dark:border-gray-700 pb-3">
                            <FilterTab
                                active={!filters.unread_only && !filters.archived}
                                onClick={() => setFilters(prev => ({ ...prev, unread_only: false, archived: false, page: 1 }))}
                                label="Toutes"
                            />
                            <FilterTab
                                active={filters.unread_only && !filters.archived}
                                onClick={() => setFilters(prev => ({ ...prev, unread_only: true, archived: false, page: 1 }))}
                                label={`Non lues${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                                badge={unreadCount > 0}
                            />
                            <FilterTab
                                active={filters.archived}
                                onClick={() => setFilters(prev => ({ ...prev, archived: true, unread_only: false, page: 1 }))}
                                label="Archivées"
                            />
                        </div>

                        {/* Module + Recherche */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <FunnelIcon className="h-4 w-4 text-gray-400" />
                                <select
                                    value={filters.module}
                                    onChange={(e) => updateFilter('module', e.target.value)}
                                    className="text-sm border-0 bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500"
                                >
                                    {MODULES.map((m) => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>

                            <form onSubmit={handleSearch} className="flex items-center gap-1.5 flex-1 min-w-48">
                                <div className="relative flex-1">
                                    <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher dans les notifications…"
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg
                                            bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                                            focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                    {searchInput && (
                                        <button type="button" onClick={() => { setSearchInput(''); updateFilter('search', ''); }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <XMarkIcon className="h-3.5 w-3.5 text-gray-400" />
                                        </button>
                                    )}
                                </div>
                                <button type="submit" className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                                    Chercher
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* ── Liste des notifications ───────────────────────────────── */}
                    <div className="space-y-6">
                        {isLoading ? (
                            <LoadingSkeleton />
                        ) : totalCount === 0 ? (
                            <EmptyState filters={filters} />
                        ) : (
                            groupOrder
                                .filter((g) => groupedNotifs[g]?.length > 0)
                                .map((groupName) => (
                                    <div key={groupName}>
                                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                            {groupName}
                                        </h2>
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
                                            {groupedNotifs[groupName].map((notif) => (
                                                <NotifRow
                                                    key={notif.id}
                                                    notification={notif}
                                                    onClick={() => handleNotifClick(notif)}
                                                    onMarkRead={() => markRead(notif.id)}
                                                    onArchive={() => archive(notif.id)}
                                                    onSnoozeClick={() => setSnoozeTarget(notif.id)}
                                                    onFeedback={(action) => feedback(notif.id, action)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>

                    {/* ── Pagination ────────────────────────────────────────────── */}
                    {lastPage > 1 && (
                        <div className="flex justify-center gap-2 mt-8">
                            <button
                                disabled={currentPage <= 1}
                                onClick={() => updateFilter('page', currentPage - 1)}
                                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Précédent
                            </button>
                            <span className="px-4 py-2 text-sm text-gray-500">
                                {currentPage} / {lastPage}
                            </span>
                            <button
                                disabled={currentPage >= lastPage}
                                onClick={() => updateFilter('page', currentPage + 1)}
                                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Suivant
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal Snooze ───────────────────────────────────────────────── */}
            {snoozeTarget && (
                <SnoozeModal
                    onSelect={(delay) => handleSnooze(snoozeTarget, delay)}
                    onClose={() => setSnoozeTarget(null)}
                />
            )}
        </>
    );
}

// =============================================================================
// Sous-composants
// =============================================================================

function FilterTab({ active, onClick, label, badge }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                active
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
        >
            {label}
        </button>
    );
}

function NotifRow({ notification, onClick, onMarkRead, onArchive, onSnoozeClick, onFeedback }) {
    const config  = TYPE_CONFIG[notification.type] || { icon: BellIcon, color: 'text-gray-600 bg-gray-50', label: 'Notification' };
    const Icon    = config.icon;
    const isRead  = !!notification.read_at;
    const [hovered, setHovered] = useState(false);

    const timeStr = (d) => new Date(d).toLocaleString('fr-FR', {
        day:    '2-digit',
        month:  'short',
        hour:   '2-digit',
        minute: '2-digit',
    });

    return (
        <div
            className={`group relative flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors
                hover:bg-gray-50 dark:hover:bg-gray-700/30
                ${!isRead ? 'bg-purple-50/30 dark:bg-purple-900/10' : ''}`}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
            {/* Indicateur non lu */}
            {!isRead && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-purple-500 rounded-full" />
            )}

            {/* Icône type */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
                <Icon className="h-5 w-5" />
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className={`text-sm font-${!isRead ? 'semibold' : 'medium'} text-gray-${!isRead ? '900' : '700'} dark:text-${!isRead ? 'white' : 'gray-300'} truncate`}>
                            {notification.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {notification.body}
                        </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">
                        {timeStr(notification.created_at)}
                    </span>
                </div>

                {/* Badge module */}
                <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${config.color}`}>
                        {config.label}
                    </span>
                    {notification.data?.action_url && (
                        <span className="text-[10px] text-purple-500">Cliquez pour ouvrir</span>
                    )}
                </div>
            </div>

            {/* Actions au hover */}
            <div className={`flex-shrink-0 flex items-center gap-1 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
                {!isRead && (
                    <ActionBtn title="Marquer comme lu" onClick={(e) => { e.stopPropagation(); onMarkRead(); }}>
                        <CheckCircleIcon className="h-4 w-4" />
                    </ActionBtn>
                )}
                <ActionBtn title="Reporter" onClick={(e) => { e.stopPropagation(); onSnoozeClick(); }}>
                    <ClockIcon className="h-4 w-4" />
                </ActionBtn>
                <ActionBtn title="Archiver" onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                    <ArchiveBoxIcon className="h-4 w-4" />
                </ActionBtn>
                <ActionBtn title="Pertinent" onClick={(e) => { e.stopPropagation(); onFeedback('liked'); }}>
                    <HandThumbUpIcon className="h-4 w-4 text-green-500" />
                </ActionBtn>
                <ActionBtn title="Non pertinent" onClick={(e) => { e.stopPropagation(); onFeedback('disliked'); }}>
                    <HandThumbDownIcon className="h-4 w-4 text-red-400" />
                </ActionBtn>
            </div>
        </div>
    );
}

function ActionBtn({ title, onClick, children }) {
    return (
        <button
            title={title}
            onClick={onClick}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
            {children}
        </button>
    );
}

function SnoozeModal({ onSelect, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-72">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClockIcon className="h-5 w-5 text-purple-600" />
                        Reporter à…
                    </h3>
                    <button onClick={onClose}><XMarkIcon className="h-4 w-4 text-gray-400" /></button>
                </div>
                <div className="space-y-2">
                    {SNOOZE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => onSelect(opt.value)}
                            className="w-full text-left px-4 py-3 text-sm rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-700 transition-colors"
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-gray-50 dark:border-gray-700 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function EmptyState({ filters }) {
    return (
        <div className="flex flex-col items-center py-16 text-gray-400">
            <BellIcon className="h-12 w-12 opacity-20 mb-4" />
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">
                {filters.search
                    ? `Aucune notification pour « ${filters.search} »`
                    : filters.archived
                    ? 'Aucune notification archivée'
                    : filters.unread_only
                    ? 'Toutes vos notifications sont lues !'
                    : 'Aucune notification'}
            </p>
            <p className="text-sm mt-1">Vous êtes à jour.</p>
        </div>
    );
}
export { NotificationCenter };
