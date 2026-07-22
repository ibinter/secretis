/**
 * useDashboard.js — Hook TanStack Query pour les données des tableaux de bord
 *
 * Gestion du cache, rafraîchissement auto et invalidation Reverb (Laravel Echo).
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import axios from 'axios';

const API = '/api/v1';

// ============================================================================
// FETCHERS
// ============================================================================

const fetchExecutiveKpis = async () => {
    const { data } = await axios.get(`${API}/dashboard/kpis`);
    return data.data;
};

const fetchTrends = async ({ metric = 'mail', days = 30 } = {}) => {
    const { data } = await axios.get(`${API}/dashboard/trends`, {
        params: { metric, days },
    });
    return data.data;
};

const fetchHeatmap = async () => {
    const { data } = await axios.get(`${API}/dashboard/heatmap`);
    return data.data;
};

const fetchModuleUsage = async () => {
    const { data } = await axios.get(`${API}/dashboard/module-usage`);
    return data.data;
};

const fetchReport = async (type, params = {}) => {
    const { data } = await axios.get(`${API}/reports/${type}`, { params });
    return data.data;
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * KPIs dirigeant — refetch toutes les 5 minutes
 */
export function useExecutiveKpis() {
    return useQuery({
        queryKey: ['dashboard', 'kpis'],
        queryFn: fetchExecutiveKpis,
        refetchInterval: 5 * 60 * 1000, // 5 minutes
        staleTime: 2 * 60 * 1000,       // considéré frais 2 min
    });
}

/**
 * Tendance pour un métrique donné
 * @param {'mail'|'tasks'|'visitors'|'meetings'|'rooms'} metric
 * @param {number} days
 */
export function useTrends(metric = 'mail', days = 30) {
    return useQuery({
        queryKey: ['dashboard', 'trends', metric, days],
        queryFn: () => fetchTrends({ metric, days }),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Heatmap d'activité (90 derniers jours)
 */
export function useActivityHeatmap() {
    return useQuery({
        queryKey: ['dashboard', 'heatmap'],
        queryFn: fetchHeatmap,
        staleTime: 10 * 60 * 1000,
    });
}

/**
 * Utilisation des modules
 */
export function useModuleUsage() {
    return useQuery({
        queryKey: ['dashboard', 'module-usage'],
        queryFn: fetchModuleUsage,
        staleTime: 10 * 60 * 1000,
    });
}

/**
 * Données d'un rapport spécifique
 * @param {'mail'|'tasks'|'visitors'|'meetings'|'leaves'|'rooms'|'supplies'|'global'|'audit'} type
 * @param {object} params  start_date, end_date, ...
 */
export function useReport(type, params = {}) {
    return useQuery({
        queryKey: ['reports', type, params],
        queryFn: () => fetchReport(type, params),
        enabled: !!type,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Invalide les caches dashboard à chaque événement Reverb pertinent.
 *
 * Appeler ce hook dans le composant racine des dashboards pour que
 * les données se mettent à jour en temps réel sans polling.
 */
export function useInvalidateOnWebsocketEvent() {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Vérifie que Laravel Echo est disponible (configuré par Reverb)
        if (!window.Echo) return;

        const channel = window.Echo.private('organization.' + window.__org_id);

        const invalidateAll = () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        };

        // Événements qui déclenchent un rafraîchissement du dashboard
        const events = [
            'MailRegistry.Created',
            'MailRegistry.Updated',
            'Task.Created',
            'Task.Updated',
            'Task.Completed',
            'Visitor.CheckedIn',
            'Visitor.CheckedOut',
            'Meeting.Created',
            'Meeting.Updated',
            'RoomReservation.Created',
            'Leave.Approved',
        ];

        events.forEach((event) => channel.listen('.' + event, invalidateAll));

        return () => {
            channel.stopListening();
        };
    }, [queryClient]);
}

/**
 * Hook complet pour le tableau de bord secrétariat
 * (regroupe les données initiales passées par Inertia + refetch API)
 */
export function useSecretariatData(initialData = {}) {
    const kpis = useQuery({
        queryKey: ['dashboard', 'secretariat', 'kpis'],
        queryFn: fetchExecutiveKpis,
        initialData: initialData.kpis,
        refetchInterval: 3 * 60 * 1000,
    });

    return { kpis };
}
