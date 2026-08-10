/**
 * useNotificationCenter — Hooks React pour le Centre de Notifications SECRETIS
 *
 * Hooks disponibles :
 *  - useNotifications(filters)  : Liste paginée + filtrée (TanStack Query)
 *  - useUnreadCount()           : Compteur de non-lues (polling léger 30s)
 *  - useDigest()                : Carte de digest du jour
 *  - useNotificationActions()   : markRead, markAllRead, snooze, archive, feedback
 *  - useRealtimeNotifications() : Connexion Reverb pour les mises à jour temps réel
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePage } from '@inertiajs/react';
import axios from 'axios';

// ─── Clés de cache TanStack Query ─────────────────────────────────────────────

export const NOTIF_KEYS = {
    all:         ['notifications'],
    list:        (filters) => ['notifications', 'list', filters],
    unreadCount: () => ['notifications', 'unread-count'],
    digest:      () => ['notifications', 'digest'],
    preferences: () => ['notifications', 'preferences'],
    stats:       () => ['notifications', 'stats'],
};

// ─── Helper axios ──────────────────────────────────────────────────────────────

const api = {
    getList:       (params) => axios.get('/api/notifications', { params }),
    getUnreadCount:()       => axios.get('/api/notifications/unread-count'),
    getDigest:     ()       => axios.get('/api/notifications/digest'),
    getPreferences:()       => axios.get('/api/notifications/preferences'),
    updatePreferences: (data) => axios.put('/api/notifications/preferences', data),
    markRead:      (id)     => axios.post(`/api/notifications/${id}/read`),
    markAllRead:   ()       => axios.post('/api/notifications/read-all'),
    snooze:        (id, delay) => axios.post(`/api/notifications/snooze/${id}`, { delay }),
    archive:       (id)     => axios.post(`/api/notifications/archive/${id}`),
    feedback:      (id, action) => axios.post('/api/notifications/feedback', {
        notification_id: id,
        action,
    }),
    getStats:      ()       => axios.get('/api/notifications/stats'),
};

// =============================================================================
// useNotifications() — Liste paginée et filtrée
// =============================================================================

/**
 * Charge les notifications avec filtres et pagination.
 *
 * @param {Object} filters { unread_only, module, archived, search, page }
 * @returns TanStack Query result + helpers de pagination
 */
export function useNotifications(filters = {}) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: NOTIF_KEYS.list(filters),
        queryFn:  async () => {
            const res = await api.getList(filters);
            return res.data;
        },
        staleTime:    30_000,    // 30 secondes
        refetchOnWindowFocus: true,
    });

    // Grouper par date pour l'affichage
    const grouped = useCallback(() => {
        if (!query.data?.data) return {};

        const today     = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86_400_000).toDateString();

        return query.data.data.reduce((acc, notif) => {
            const notifDate = new Date(notif.created_at).toDateString();
            let   group     = 'Plus ancien';

            if (notifDate === today)     group = 'Aujourd\'hui';
            else if (notifDate === yesterday) group = 'Hier';
            else {
                const diffDays = Math.floor((Date.now() - new Date(notif.created_at)) / 86_400_000);
                if (diffDays < 7) group = 'Cette semaine';
            }

            if (!acc[group]) acc[group] = [];
            acc[group].push(notif);
            return acc;
        }, {});
    }, [query.data]);

    return {
        ...query,
        notifications:  query.data?.data ?? [],
        totalCount:     query.data?.total ?? 0,
        currentPage:    query.data?.current_page ?? 1,
        lastPage:       query.data?.last_page ?? 1,
        unreadCount:    query.data?.unread_count ?? 0,
        grouped,
    };
}

// =============================================================================
// useUnreadCount() — Compteur léger (polling 30s)
// =============================================================================

/**
 * Hook léger pour le compteur de notifications non-lues dans le header.
 * Polling toutes les 30 secondes pour rester à jour sans WebSocket.
 */
export function useUnreadCount() {
    const query = useQuery({
        queryKey:        NOTIF_KEYS.unreadCount(),
        queryFn:         async () => {
            const res = await api.getUnreadCount();
            return res.data.count ?? 0;
        },
        staleTime:       20_000,
        refetchInterval: 30_000, // Polling 30s
        refetchOnWindowFocus: true,
    });

    return {
        unreadCount: query.data ?? 0,
        isLoading:   query.isLoading,
    };
}

// =============================================================================
// useDigest() — Carte de digest quotidien
// =============================================================================

/**
 * Charge le digest personnalisé du jour.
 * Mis en cache jusqu'à la fin de la journée pour éviter les requêtes répétées.
 */
export function useDigest() {
    const query = useQuery({
        queryKey: NOTIF_KEYS.digest(),
        queryFn:  async () => {
            const res = await api.getDigest();
            return res.data;
        },
        staleTime: 30 * 60_000, // 30 minutes (le digest ne change pas beaucoup)
        refetchOnWindowFocus: false,
    });

    return {
        digest:    query.data?.digest ?? null,
        isLoading: query.isLoading,
        error:     query.error,
    };
}

// =============================================================================
// useNotificationActions() — Actions sur les notifications
// =============================================================================

/**
 * Toutes les mutations (markRead, markAllRead, snooze, archive, feedback).
 * Invalide automatiquement les caches pertinents après chaque action.
 */
export function useNotificationActions() {
    const queryClient = useQueryClient();

    const invalidate = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: NOTIF_KEYS.all });
        queryClient.invalidateQueries({ queryKey: NOTIF_KEYS.unreadCount() });
    }, [queryClient]);

    // Marquer une notification comme lue
    const markReadMutation = useMutation({
        mutationFn: (id) => api.markRead(id),
        onMutate: async (id) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: NOTIF_KEYS.all });
            const prev = queryClient.getQueriesData({ queryKey: NOTIF_KEYS.all });

            queryClient.setQueriesData({ queryKey: NOTIF_KEYS.all }, (old) => {
                if (!old?.data) return old;
                return {
                    ...old,
                    data: old.data.map((n) =>
                        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
                    ),
                    unread_count: Math.max(0, (old.unread_count ?? 0) - 1),
                };
            });

            return { prev };
        },
        onError: (_, __, ctx) => {
            if (ctx?.prev) {
                ctx.prev.forEach(([key, val]) => queryClient.setQueryData(key, val));
            }
        },
        onSettled: invalidate,
    });

    // Marquer toutes comme lues
    const markAllReadMutation = useMutation({
        mutationFn: () => api.markAllRead(),
        onSuccess:  invalidate,
    });

    // Snooze
    const snoozeMutation = useMutation({
        mutationFn: ({ id, delay }) => api.snooze(id, delay),
        onSuccess:  invalidate,
    });

    // Archiver
    const archiveMutation = useMutation({
        mutationFn: (id) => api.archive(id),
        onSuccess:  invalidate,
    });

    // Feedback
    const feedbackMutation = useMutation({
        mutationFn: ({ id, action }) => api.feedback(id, action),
        onSuccess:  invalidate,
    });

    return {
        markRead:    (id)          => markReadMutation.mutate(id),
        markAllRead: ()            => markAllReadMutation.mutate(),
        snooze:      (id, delay)   => snoozeMutation.mutate({ id, delay }),
        archive:     (id)          => archiveMutation.mutate(id),
        feedback:    (id, action)  => feedbackMutation.mutate({ id, action }),

        isMarkingRead:    markReadMutation.isPending,
        isMarkingAll:     markAllReadMutation.isPending,
        isSnoozePending:  snoozeMutation.isPending,
        isArchivePending: archiveMutation.isPending,
    };
}

// =============================================================================
// useNotificationPreferences() — Préférences de notifications
// =============================================================================

export function useNotificationPreferences() {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: NOTIF_KEYS.preferences(),
        queryFn:  async () => {
            const res = await api.getPreferences();
            return res.data;
        },
        staleTime: 5 * 60_000, // 5 minutes
    });

    const updateMutation = useMutation({
        mutationFn: (data) => api.updatePreferences(data),
        onSuccess:  () => {
            queryClient.invalidateQueries({ queryKey: NOTIF_KEYS.preferences() });
        },
    });

    return {
        preferences:   query.data ?? null,
        isLoading:     query.isLoading,
        update:        (data) => updateMutation.mutate(data),
        isSaving:      updateMutation.isPending,
        saveSuccess:   updateMutation.isSuccess,
    };
}

// =============================================================================
// useNotificationStats() — Statistiques personnelles
// =============================================================================

export function useNotificationStats() {
    const query = useQuery({
        queryKey: NOTIF_KEYS.stats(),
        queryFn:  async () => {
            const res = await api.getStats();
            return res.data;
        },
        staleTime: 10 * 60_000, // 10 minutes
    });

    return {
        stats:     query.data ?? null,
        isLoading: query.isLoading,
    };
}

// =============================================================================
// useRealtimeNotifications() — Connexion Reverb temps réel
// =============================================================================

/**
 * Connecte l'utilisateur au canal Reverb privé pour les notifications en temps réel.
 * Invalide le cache TanStack Query à chaque nouvelle notification.
 *
 * @param {Function} onNew Callback appelé avec la nouvelle notification
 */
export function useRealtimeNotifications(onNew = null) {
    const { auth }    = usePage().props;
    const queryClient = useQueryClient();
    const callbackRef = useRef(onNew);

    useEffect(() => {
        callbackRef.current = onNew;
    }, [onNew]);

    useEffect(() => {
        if (!window.Echo || !auth?.user?.id) return;

        const channel = window.Echo.private(`user.${auth.user.id}`);

        channel.listen('.notification.created', (event) => {
            const { notification, unread_count } = event;

            // Invalider les listes de notifications pour forcer un rechargement
            queryClient.invalidateQueries({ queryKey: NOTIF_KEYS.all });

            // Mise à jour optimiste du compteur
            queryClient.setQueryData(NOTIF_KEYS.unreadCount(), unread_count);

            // Appeler le callback si fourni
            if (callbackRef.current) {
                callbackRef.current(notification);
            }
        });

        return () => {
            channel.stopListening('.notification.created');
        };
    }, [auth?.user?.id, queryClient]);
}
