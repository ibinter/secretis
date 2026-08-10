/**
 * Hooks TanStack Query pour le module Business Intelligence — IBIG SECRETIS
 * Cache 5 minutes, refetch en arrière-plan au focus de la fenêtre.
 */
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Construit les query params communs (période + orgId).
 */
function buildParams({ preset = 'month', start, end, granularity } = {}) {
    const params = { preset };
    if (preset === 'custom' && start && end) {
        params.start = start;
        params.end   = end;
    }
    if (granularity) params.granularity = granularity;
    return params;
}

// ---------------------------------------------------------------------------
// Fetcher générique
// ---------------------------------------------------------------------------

async function fetchBi(endpoint, params) {
    const { data } = await axios.get(`/api/bi/${endpoint}`, { params });
    return data;
}

// ---------------------------------------------------------------------------
// Hook universel interne
// ---------------------------------------------------------------------------

function useBiModule(module, params = {}) {
    const queryParams = buildParams(params);
    return useQuery({
        queryKey:  ['bi', module, queryParams],
        queryFn:   () => fetchBi(module, queryParams),
        staleTime: STALE_TIME,
        refetchOnWindowFocus: true,
        retry: 2,
    });
}

// ---------------------------------------------------------------------------
// Hooks publics par module
// ---------------------------------------------------------------------------

export function useCorrespondenceBI(params = {}) {
    return useBiModule('correspondence', params);
}

export function useTasksBI(params = {}) {
    return useBiModule('tasks', params);
}

export function useMeetingsBI(params = {}) {
    return useBiModule('meetings', params);
}

export function useHrBI(params = {}) {
    return useBiModule('hr', params);
}

export function useVisitorsBI(params = {}) {
    return useBiModule('visitors', params);
}

export function useAccountingBI(params = {}) {
    return useBiModule('accounting', params);
}

// ---------------------------------------------------------------------------
// Rapport personnalisé
// ---------------------------------------------------------------------------

export function useCustomReport(config, enabled = true) {
    return useQuery({
        queryKey:  ['bi', 'custom', config],
        queryFn:   async () => {
            const { data } = await axios.post('/api/bi/custom', config);
            return data;
        },
        staleTime: STALE_TIME,
        enabled:   enabled && !!config?.module,
        retry: 1,
    });
}

// ---------------------------------------------------------------------------
// Rapports sauvegardés
// ---------------------------------------------------------------------------

export function useSavedReports(page = 1) {
    return useQuery({
        queryKey:  ['bi', 'saved-reports', page],
        queryFn:   async () => {
            const { data } = await axios.get('/api/bi/reports', { params: { page, per_page: 20 } });
            return data;
        },
        staleTime: STALE_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useRunReport(reportId, enabled = false) {
    return useQuery({
        queryKey:  ['bi', 'run-report', reportId],
        queryFn:   async () => {
            const { data } = await axios.get(`/api/bi/reports/${reportId}/run`);
            return data;
        },
        staleTime: 0, // Toujours rafraîchi
        enabled:   enabled && !!reportId,
        retry: 1,
    });
}

// ---------------------------------------------------------------------------
// Hook agrégé : toutes les analytics en un seul appel
// ---------------------------------------------------------------------------

export function useAllBiModules(params = {}) {
    const correspondence = useCorrespondenceBI(params);
    const tasks          = useTasksBI(params);
    const meetings       = useMeetingsBI(params);
    const hr             = useHrBI(params);
    const visitors       = useVisitorsBI(params);
    const accounting     = useAccountingBI(params);

    const isLoading = [correspondence, tasks, meetings, hr, visitors, accounting].some(q => q.isLoading);
    const isError   = [correspondence, tasks, meetings, hr, visitors, accounting].some(q => q.isError);

    return {
        isLoading,
        isError,
        correspondence: correspondence.data,
        tasks:          tasks.data,
        meetings:       meetings.data,
        hr:             hr.data,
        visitors:       visitors.data,
        accounting:     accounting.data,
    };
}
