/**
 * SmartBell.jsx — Cloche de notifications intelligente pour le header SECRETIS
 *
 * Fonctionnalités :
 *  - Badge avec compteur (max 99+)
 *  - Animation pulse pour les notifications urgentes
 *  - Dropdown avec les 5 dernières notifications + actions rapides
 *  - Son de notification configurable
 *  - Connexion Reverb temps réel
 *  - Lien "Voir tout" → Centre de notifications
 *
 * Usage dans le layout AppLayout :
 *   import SmartBell from '@/Components/Notifications/SmartBell';
 *   <SmartBell />
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    BellIcon,
    CalendarIcon,
    ChatBubbleLeftRightIcon,
    CheckIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon,
    EnvelopeOpenIcon,
    MegaphoneIcon,
    UserPlusIcon,
    XMarkIcon,
    ArchiveBoxIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { BellAlertIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import {
    useNotifications,
    useUnreadCount,
    useNotificationActions,
    useRealtimeNotifications,
} from '@/hooks/useNotificationCenter';

// ─── Icônes par type de notification ──────────────────────────────────────────

const TYPE_CONFIG = {
    message:           { icon: ChatBubbleLeftRightIcon, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',   label: 'Message' },
    task_assigned:     { icon: ClipboardDocumentCheckIcon, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30', label: 'Tâche' },
    task_overdue:      { icon: ExclamationTriangleIcon, color: 'text-red-600 bg-red-50 dark:bg-red-900/30',            label: 'Retard' },
    mail_urgent:       { icon: EnvelopeOpenIcon, color: 'text-red-600 bg-red-50 dark:bg-red-900/30',                   label: 'Courrier urgent' },
    mail_received:     { icon: EnvelopeOpenIcon, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',                label: 'Courrier' },
    meeting_reminder:  { icon: CalendarIcon, color: 'text-green-600 bg-green-50 dark:bg-green-900/30',                 label: 'Réunion' },
    meeting:           { icon: CalendarIcon, color: 'text-green-600 bg-green-50 dark:bg-green-900/30',                 label: 'Réunion' },
    event_created:     { icon: CalendarIcon, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',              label: 'Agenda' },
    visitor_arrived:   { icon: UserPlusIcon, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',                    label: 'Visiteur' },
    circular:          { icon: MegaphoneIcon, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',             label: 'Circulaire' },
    stock_alert:       { icon: ExclamationTriangleIcon, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',   label: 'Stock' },
    birthday:          { icon: BellIcon, color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30',                        label: 'Anniversaire' },
    digest:            { icon: BellIcon, color: 'text-gray-600 bg-gray-50 dark:bg-gray-700',                          label: 'Digest' },
    default:           { icon: BellIcon, color: 'text-gray-600 bg-gray-50 dark:bg-gray-700',                          label: 'Notification' },
};

const URGENT_TYPES = ['visitor_arrived', 'mail_urgent', 'task_overdue', 'stock_alert'];

// =============================================================================
// Composant principal SmartBell
// =============================================================================

export default function SmartBell() {
    const [isOpen, setIsOpen]             = useState(false);
    const [hasUrgent, setHasUrgent]       = useState(false);
    const [toastNotif, setToastNotif]     = useState(null);
    const dropdownRef                     = useRef(null);
    const bellRef                         = useRef(null);
    const audioRef                        = useRef(null);

    // ── Données ────────────────────────────────────────────────────────────────
    const { unreadCount }                = useUnreadCount();
    const { notifications, isLoading }   = useNotifications({ per_page: 5, page: 1 });
    const { markRead, markAllRead, archive, isMarkingAll } = useNotificationActions();

    // ── Vérifier la présence de notifications urgentes ─────────────────────────
    useEffect(() => {
        const urgent = notifications.some(
            (n) => !n.read_at && URGENT_TYPES.includes(n.type)
        );
        setHasUrgent(urgent);
    }, [notifications]);

    // ── Fermer au clic extérieur ───────────────────────────────────────────────
    useEffect(() => {
        const handleOutside = (e) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                bellRef.current    && !bellRef.current.contains(e.target)
            ) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    // ── Notifications Reverb temps réel ───────────────────────────────────────
    useRealtimeNotifications(useCallback((notif) => {
        // Afficher un mini toast
        setToastNotif(notif);
        setTimeout(() => setToastNotif(null), 4000);

        // Son de notification (si activé)
        playNotificationSound(notif);

        // Vibration mobile pour les urgences
        if (navigator.vibrate && URGENT_TYPES.includes(notif.type)) {
            navigator.vibrate([150, 80, 150]);
        }
    }, []));

    // ── Son de notification ─────────────────────────────────────────────────────
    const playNotificationSound = useCallback((notif) => {
        try {
            // Son différent selon l'urgence
            const isUrgent = URGENT_TYPES.includes(notif?.type);
            const ctx      = new (window.AudioContext || window.webkitAudioContext)();
            const osc      = ctx.createOscillator();
            const gain     = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = isUrgent ? 880 : 440;
            osc.type            = 'sine';
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } catch (_) {
            // Ignorer si AudioContext non disponible
        }
    }, []);

    // ── Clic sur une notification ──────────────────────────────────────────────
    const handleNotifClick = useCallback((notif) => {
        if (!notif.read_at) markRead(notif.id);
        setIsOpen(false);
        if (notif.data?.action_url) {
            window.location.href = notif.data.action_url;
        }
    }, [markRead]);

    // ── Rendu ──────────────────────────────────────────────────────────────────
    return (
        <div className="relative">

            {/* ── Toast notification temps réel ───────────────────────────────── */}
            {toastNotif && (
                <div className="fixed top-4 right-4 z-[100] max-w-sm animate-in slide-in-from-top-2">
                    <ToastNotification
                        notification={toastNotif}
                        onClose={() => setToastNotif(null)}
                        onClick={() => {
                            setToastNotif(null);
                            if (toastNotif.data?.action_url) window.location.href = toastNotif.data.action_url;
                        }}
                    />
                </div>
            )}

            {/* ── Bouton cloche ────────────────────────────────────────────────── */}
            <button
                ref={bellRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                    focus:outline-none focus:ring-2 focus:ring-purple-500
                    ${hasUrgent ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                {/* Icône cloche */}
                {unreadCount > 0 ? (
                    <BellAlertIcon className={`h-6 w-6 ${hasUrgent ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`} />
                ) : (
                    <BellIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                )}

                {/* Badge compteur */}
                {unreadCount > 0 && (
                    <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
                        ${hasUrgent ? 'bg-red-500 animate-pulse' : 'bg-purple-600'}
                        text-white text-[10px] font-bold rounded-full flex items-center justify-center`}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}

                {/* Anneau pulse pour urgences */}
                {hasUrgent && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 rounded-full animate-ping opacity-50" />
                )}
            </button>

            {/* ══════════════════════════════════════════════════════════════════
                DROPDOWN
            ═══════════════════════════════════════════════════════════════════ */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    role="dialog"
                    aria-label="Notifications"
                    className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-1rem)]
                        bg-white dark:bg-gray-800 rounded-2xl shadow-2xl
                        border border-gray-100 dark:border-gray-700 z-50 overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                        <div className="flex items-center gap-2">
                            <BellIcon className="h-4 w-4 text-gray-500" />
                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold rounded-full">
                                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => { markAllRead(); }}
                                    disabled={isMarkingAll}
                                    className="text-xs text-purple-600 hover:underline disabled:opacity-50 flex items-center gap-1"
                                >
                                    <CheckIcon className="h-3 w-3" />
                                    Tout lire
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
                                <XMarkIcon className="h-4 w-4 text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Liste */}
                    <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-gray-400">
                                <BellIcon className="h-8 w-8 opacity-30 mb-2" />
                                <p className="text-sm">Aucune notification</p>
                            </div>
                        ) : (
                            notifications.slice(0, 5).map((notif) => (
                                <BellNotifItem
                                    key={notif.id}
                                    notification={notif}
                                    onClick={() => handleNotifClick(notif)}
                                    onMarkRead={() => markRead(notif.id)}
                                    onArchive={() => archive(notif.id)}
                                />
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                        <Link
                            href="/notifications"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-center gap-2 w-full text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium"
                        >
                            Voir toutes les notifications
                            <ArrowRightIcon className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// BellNotifItem — Élément de notification dans le dropdown
// =============================================================================

function BellNotifItem({ notification, onClick, onMarkRead, onArchive }) {
    const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.default;
    const Icon   = config.icon;
    const isRead = !!notification.read_at;

    const timeAgo = (d) => {
        const diff = Date.now() - new Date(d);
        if (diff < 60_000)    return 'À l\'instant';
        if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`;
        if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
        return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
            className={`group flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50
                cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700/50
                ${!isRead ? 'bg-purple-50/40 dark:bg-purple-900/10' : ''}`}
        >
            {/* Icône */}
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${config.color}`}>
                <Icon className="h-[18px] w-[18px]" />
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                    <p className={`text-sm leading-snug truncate ${!isRead ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-300'}`}>
                        {notification.title}
                    </p>
                    {!isRead && <span className="flex-shrink-0 w-2 h-2 mt-1.5 bg-purple-500 rounded-full" />}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {notification.body}
                </p>
                <span className="text-[10px] text-gray-400">{timeAgo(notification.created_at)}</span>
            </div>

            {/* Actions au hover */}
            <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isRead && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onMarkRead(); }}
                        title="Marquer comme lu"
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                        <CheckIcon className="h-3 w-3 text-gray-500" />
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onArchive(); }}
                    title="Archiver"
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                >
                    <ArchiveBoxIcon className="h-3 w-3 text-gray-500" />
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// ToastNotification — Mini toast pour les notifications temps réel
// =============================================================================

function ToastNotification({ notification, onClose, onClick }) {
    const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.default;
    const Icon   = config.icon;
    const isUrgent = URGENT_TYPES.includes(notification.type);

    return (
        <div
            role="alert"
            className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border cursor-pointer
                ${isUrgent
                    ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
            onClick={onClick}
        >
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${config.color}`}>
                <Icon className="h-[18px] w-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{notification.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.body}</p>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
                <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>
        </div>
    );
}
export { SmartBell };
