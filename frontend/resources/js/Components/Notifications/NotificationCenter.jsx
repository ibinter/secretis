/**
 * NotificationCenter.jsx — Centre de notifications dans le header
 *
 * Fonctionnement :
 *  - Cloche avec badge compteur (non lus)
 *  - Dropdown liste des notifications non lues
 *  - Mise à jour temps réel via Laravel Echo + Reverb
 *  - Actions : marquer tout comme lu, voir toutes les notifs
 *  - Types : message, tâche assignée, courrier urgent, réunion, visiteur, circulaire
 *
 * Usage (dans le layout header) :
 *   import NotificationCenter from '@/Components/Notifications/NotificationCenter';
 *   <NotificationCenter />
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    BellIcon,
    ChatBubbleLeftRightIcon,
    ClipboardDocumentCheckIcon,
    EnvelopeOpenIcon,
    CalendarIcon,
    UserPlusIcon,
    MegaphoneIcon,
    CogIcon,
    XMarkIcon,
    CheckIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';

// ─── Configuration des types de notifications ─────────────────────────────────

const NOTIFICATION_CONFIG = {
    message: {
        icon: ChatBubbleLeftRightIcon,
        color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
        label: 'Message',
    },
    task_assigned: {
        icon: ClipboardDocumentCheckIcon,
        color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
        label: 'Tâche',
    },
    mail_urgent: {
        icon: EnvelopeOpenIcon,
        color: 'text-red-600 bg-red-50 dark:bg-red-900/30',
        label: 'Courrier urgent',
    },
    meeting: {
        icon: CalendarIcon,
        color: 'text-green-600 bg-green-50 dark:bg-green-900/30',
        label: 'Réunion',
    },
    visitor: {
        icon: UserPlusIcon,
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
        label: 'Visiteur',
    },
    circular: {
        icon: MegaphoneIcon,
        color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
        label: 'Circulaire',
    },
    system: {
        icon: CogIcon,
        color: 'text-gray-600 bg-gray-50 dark:bg-gray-700',
        label: 'Système',
    },
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function NotificationCenter() {
    const { auth } = usePage().props;

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    const [isOpen, setIsOpen]               = useState(false);
    const [loading, setLoading]             = useState(false);
    const [markingAll, setMarkingAll]        = useState(false);

    const dropdownRef = useRef(null);
    const bellRef     = useRef(null);

    // ─── Fermer au clic extérieur ─────────────────────────────────────────────

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                bellRef.current    && !bellRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── Chargement initial des notifications ─────────────────────────────────

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/notifications', {
                params: { per_page: 15, unread_only: false },
            });
            setNotifications(res.data.data || []);
            setUnreadCount(res.data.unread_count ?? 0);
        } catch (err) {
            console.error('Erreur chargement notifications', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ─── Connexion Reverb — notifications temps réel ──────────────────────────

    useEffect(() => {
        if (!window.Echo || !auth?.user?.id) return;

        const channel = window.Echo.private(`user.${auth.user.id}`);

        channel.listen('.notification.created', (event) => {
            const { notification, unread_count } = event;

            // Ajouter la notification en tête de liste
            setNotifications(prev => [notification, ...prev].slice(0, 50)); // Max 50 en mémoire
            setUnreadCount(unread_count);

            // Toast visuel (son + vibration si supporté)
            showToast(notification);

            // Vibration (tablette / mobile)
            if (navigator.vibrate && notification.color === 'red') {
                navigator.vibrate([200, 100, 200]);
            }
        });

        return () => {
            channel.stopListening('.notification.created');
        };
    }, [auth?.user?.id]);

    // ─── Toast de notification ────────────────────────────────────────────────

    const showToast = useCallback((notification) => {
        // Toast natif du navigateur si permission accordée
        if ('Notification' in window && window.Notification.permission === 'granted') {
            new window.Notification(notification.title, {
                body: notification.body,
                icon: '/favicon.ico',
                tag:  `secretis-${notification.id}`,
            });
        }
    }, []);

    // ─── Demander permission notification navigateur ──────────────────────────

    useEffect(() => {
        if ('Notification' in window && window.Notification.permission === 'default') {
            // Attendre une interaction utilisateur avant de demander
            const handler = () => {
                window.Notification.requestPermission();
                document.removeEventListener('click', handler);
            };
            document.addEventListener('click', handler, { once: true });
        }
    }, []);

    // ─── Marquer une notification comme lue ──────────────────────────────────

    const markAsRead = useCallback(async (notifId) => {
        try {
            await axios.post(`/api/notifications/${notifId}/read`);
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notifId ? { ...n, read_at: new Date().toISOString() } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Erreur marquage notification', err);
        }
    }, []);

    // ─── Marquer tout comme lu ────────────────────────────────────────────────

    const markAllAsRead = useCallback(async () => {
        if (unreadCount === 0 || markingAll) return;
        setMarkingAll(true);

        try {
            const res = await axios.post('/api/notifications/read-all');
            setNotifications(prev =>
                prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (err) {
            console.error('Erreur marquage tout lu', err);
        } finally {
            setMarkingAll(false);
        }
    }, [unreadCount, markingAll]);

    // ─── Clic sur une notification ────────────────────────────────────────────

    const handleNotifClick = useCallback((notif) => {
        if (!notif.read_at) {
            markAsRead(notif.id);
        }
        setIsOpen(false);

        if (notif.action_url) {
            window.location.href = notif.action_url;
        }
    }, [markAsRead]);

    // ─── Rendu ───────────────────────────────────────────────────────────────

    return (
        <div className="relative">

            {/* ── Bouton cloche ── */}
            <button
                ref={bellRef}
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen && notifications.length === 0) fetchNotifications();
                }}
                className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
            >
                {unreadCount > 0 ? (
                    <BellAlertIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                ) : (
                    <BellIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                )}

                {/* Badge compteur */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none animate-in zoom-in">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* ══════════════════════════════════════════════════════════
                DROPDOWN NOTIFICATIONS
            ═══════════════════════════════════════════════════════════ */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden"
                    style={{ maxHeight: '80vh' }}
                >
                    {/* Header dropdown */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                        <div className="flex items-center gap-2">
                            <BellIcon className="h-4 w-4 text-gray-500" />
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                                Notifications
                            </h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-full">
                                    {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Marquer tout comme lu */}
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    disabled={markingAll}
                                    className="text-xs text-blue-600 hover:underline disabled:opacity-50 flex items-center gap-1"
                                >
                                    <CheckIcon className="h-3 w-3" />
                                    {markingAll ? 'En cours…' : 'Tout marquer lu'}
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <XMarkIcon className="h-4 w-4 text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Liste des notifications */}
                    <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <BellIcon className="h-10 w-10 opacity-30 mb-3" />
                                <p className="text-sm">Aucune notification</p>
                            </div>
                        ) : (
                            <>
                                {/* Grouper par "non lues" et "lues" */}
                                {notifications.some(n => !n.read_at) && (
                                    <div>
                                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Non lues</p>
                                        </div>
                                        {notifications
                                            .filter(n => !n.read_at)
                                            .map(notif => (
                                                <NotificationItem
                                                    key={notif.id}
                                                    notification={notif}
                                                    onClick={() => handleNotifClick(notif)}
                                                    onMarkRead={() => markAsRead(notif.id)}
                                                />
                                            ))
                                        }
                                    </div>
                                )}

                                {notifications.some(n => n.read_at) && (
                                    <div>
                                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 border-t">
                                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Précédentes</p>
                                        </div>
                                        {notifications
                                            .filter(n => n.read_at)
                                            .map(notif => (
                                                <NotificationItem
                                                    key={notif.id}
                                                    notification={notif}
                                                    onClick={() => handleNotifClick(notif)}
                                                    onMarkRead={() => {}}
                                                    isRead
                                                />
                                            ))
                                        }
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer — Voir toutes */}
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                        <Link
                            href="/notifications"
                            className="flex items-center justify-center gap-2 w-full text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            onClick={() => setIsOpen(false)}
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

// ─── Sous-composant : Item notification ───────────────────────────────────────

function NotificationItem({ notification, onClick, onMarkRead, isRead = false }) {
    const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.system;
    const Icon   = config.icon;

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr);
        if (diff < 60000)   return 'À l\'instant';
        if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
        if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    };

    return (
        <div
            className={`group flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700/50 ${
                !isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
            }`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
            {/* Icône type */}
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${config.color}`}>
                <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${!isRead ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                        {notification.title}
                    </p>
                    {/* Indicateur non lu */}
                    {!isRead && (
                        <span className="flex-shrink-0 w-2 h-2 mt-1.5 bg-blue-500 rounded-full" />
                    )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {notification.body}
                </p>

                <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-gray-400">
                        {timeAgo(notification.created_at)}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Type label */}
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${config.color}`}>
                            {config.label}
                        </span>

                        {/* Marquer comme lu (uniquement si non lu) */}
                        {!isRead && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onMarkRead(); }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                title="Marquer comme lu"
                            >
                                <CheckIcon className="h-3 w-3 text-gray-500" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Hook : useNotifications (exportable pour usage externe) ──────────────────

/**
 * Hook React pour accéder au compte de notifications non lues.
 * Utile pour afficher le badge dans d'autres composants sans ouvrir le dropdown.
 *
 * Usage :
 *   const { unreadCount } = useNotificationCount();
 */
export function useNotificationCount() {
    const { auth } = usePage().props;
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        axios.get('/api/notifications/unread-count')
            .then(res => setUnreadCount(res.data.count ?? 0))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!window.Echo || !auth?.user?.id) return;

        window.Echo.private(`user.${auth.user.id}`)
            .listen('.notification.created', (e) => {
                setUnreadCount(e.unread_count ?? 0);
            });

        return () => {
            window.Echo.private(`user.${auth.user.id}`)
                .stopListening('.notification.created');
        };
    }, [auth?.user?.id]);

    return { unreadCount };
}
