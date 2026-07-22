/**
 * queryOptimizer.js — Configuration TanStack Query optimisée pour SECRETIS ERP
 *
 * Stratégie par type de données :
 *  - KPIs dashboard    : staleTime 5min  — métriques tolèrent un léger délai
 *  - Calendrier        : staleTime 1min  — données interactives, fraîcheur importante
 *  - Tâches            : staleTime 2min  — Kanban interactif mais mise à jour tolérée
 *  - Référentiels      : staleTime 1h    — pays, rôles, plans changent rarement
 *  - Notifications     : staleTime 30s   — doivent être quasi temps-réel
 *
 * Fonctionnalités activées :
 *  - Déduplication automatique des requêtes identiques (natif TanStack Query)
 *  - Retry intelligent (0 retry sur 4xx, 3 retries sur 5xx)
 *  - Background refetch sur focus fenêtre
 *  - Prefetching des pages adjacentes pour la pagination
 */

import { QueryClient } from '@tanstack/react-query';

// =============================================================================
// Constantes de staleTime par type de données
// =============================================================================

export const STALE_TIME = {
  /** KPIs et métriques agrégées — tolèrent 5 minutes de délai */
  KPI:           5 * 60 * 1000,   // 5 minutes

  /** Événements calendrier — interactifs, doivent être frais */
  CALENDAR:      1 * 60 * 1000,   // 1 minute

  /** Tâches Kanban/Liste */
  TASKS:         2 * 60 * 1000,   // 2 minutes

  /** Données de réunion */
  MEETINGS:      3 * 60 * 1000,   // 3 minutes

  /** Courrier entrant/sortant */
  MAIL:          2 * 60 * 1000,   // 2 minutes

  /** Documents GED */
  DOCUMENTS:     5 * 60 * 1000,   // 5 minutes

  /** Données RH */
  HR:            5 * 60 * 1000,   // 5 minutes

  /** Notifications — quasi temps-réel */
  NOTIFICATIONS: 30 * 1000,        // 30 secondes

  /** Référentiels statiques (rôles, pays, plans) */
  REFERENCE:     60 * 60 * 1000,  // 1 heure

  /** Profil utilisateur et permissions */
  USER:          5 * 60 * 1000,   // 5 minutes

  /** Configuration organisation */
  ORG:           10 * 60 * 1000,  // 10 minutes

  /** Données temps-réel (ne jamais stale) */
  REALTIME:      0,
};

// =============================================================================
// Logique de retry intelligente
// =============================================================================

/**
 * Détermine si une requête échouée doit être retentée.
 *
 * Règles :
 *  - Erreurs 4xx (400-499) : pas de retry (erreur client, inutile de réessayer)
 *    Exception : 429 (rate limit) → on retente avec backoff exponentiel
 *  - Erreurs 5xx (500-599) : 3 retries avec backoff exponentiel
 *  - Erreurs réseau        : 3 retries (pas de status HTTP)
 *
 * @param {number}    failureCount  — Nombre d'échecs successifs
 * @param {Error}     error         — Erreur retournée par la queryFn
 * @returns {boolean}
 */
export function shouldRetry(failureCount, error) {
  // Pas plus de 3 tentatives au total
  if (failureCount >= 3) return false;

  const status = error?.response?.status ?? error?.status ?? null;

  // Erreurs client (4xx) : pas de retry sauf rate limit
  if (status >= 400 && status < 500) {
    return status === 429; // Rate limit → on retente
  }

  // Erreurs serveur (5xx) et erreurs réseau : on retente
  return true;
}

/**
 * Délai de retry avec backoff exponentiel + jitter pour éviter les thundering herds.
 *
 * @param {number} failureCount — Index de l'échec (0-based)
 * @param {Error}  error
 * @returns {number} Délai en millisecondes
 */
export function retryDelay(failureCount, error) {
  const status = error?.response?.status ?? null;

  // Pour le rate limit (429), respecter Retry-After si disponible
  if (status === 429) {
    const retryAfter = parseInt(error?.response?.headers?.['retry-after'] ?? '0', 10);
    if (retryAfter > 0) return retryAfter * 1000;
  }

  // Backoff exponentiel : 1s, 2s, 4s + jitter aléatoire de 0-500ms
  const base  = Math.min(1000 * Math.pow(2, failureCount), 30000);
  const jitter = Math.random() * 500;
  return base + jitter;
}

// =============================================================================
// QueryClient principal — instance singleton
// =============================================================================

/**
 * Crée et configure le QueryClient pour SECRETIS ERP.
 *
 * Pattern singleton recommandé : créer une seule instance et la passer
 * au QueryClientProvider de l'application.
 *
 * Usage dans app.js / bootstrap :
 *   import { createSecretisQueryClient } from './utils/queryOptimizer';
 *   const queryClient = createSecretisQueryClient();
 *   // <QueryClientProvider client={queryClient}>...</QueryClientProvider>
 */
export function createSecretisQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Par défaut : données fraîches pendant 2 minutes
        staleTime: STALE_TIME.TASKS,

        // Garder les données en cache 10 minutes après que le composant est démonté
        // Évite de re-fetcher quand on revient sur la page (navigation SPA)
        gcTime: 10 * 60 * 1000,

        // Retry intelligent (pas de retry sur 4xx)
        retry: shouldRetry,
        retryDelay,

        // Refetch en arrière-plan quand la fenêtre reprend le focus
        // (utilisateur revient d'un autre onglet)
        refetchOnWindowFocus: true,

        // Refetch quand la connexion est restaurée (offline → online)
        refetchOnReconnect: true,

        // Ne pas refetch au montage si les données sont déjà fraîches
        refetchOnMount: true,

        // Désactiver le polling automatique (utiliser refetchInterval explicitement)
        refetchInterval: false,
        refetchIntervalInBackground: false,
      },

      mutations: {
        // Pas de retry sur les mutations (opérations non-idempotentes)
        retry: 0,

        // Timeout pour les mutations (évite les requêtes bloquées indéfiniment)
        networkMode: 'always',
      },
    },
  });
}

// =============================================================================
// Query Keys — Convention de nommage pour SECRETIS
// =============================================================================

/**
 * Factory de query keys organisées hiérarchiquement.
 *
 * Convention : [scope, orgId, entity, ...params]
 * Cela permet l'invalidation par préfixe :
 *   queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.all(orgId) })
 *   → invalide toutes les requêtes de tâches pour cette organisation
 *
 * Usage :
 *   useQuery({ queryKey: QUERY_KEYS.tasks.list(orgId, { status: 'todo' }), ... })
 */
export const QUERY_KEYS = {
  // Tâches
  tasks: {
    all:    (orgId)                    => ['tasks', orgId],
    list:   (orgId, filters = {})      => ['tasks', orgId, 'list', filters],
    kanban: (orgId, projectId)         => ['tasks', orgId, 'kanban', projectId],
    detail: (orgId, taskId)            => ['tasks', orgId, 'detail', taskId],
    subtasks: (orgId, taskId)          => ['tasks', orgId, taskId, 'subtasks'],
  },

  // Calendrier / Événements
  calendar: {
    all:    (orgId)                    => ['calendar', orgId],
    events: (orgId, start, end)        => ['calendar', orgId, 'events', { start, end }],
    detail: (orgId, eventId)           => ['calendar', orgId, 'events', eventId],
  },

  // Réunions
  meetings: {
    all:    (orgId)                    => ['meetings', orgId],
    list:   (orgId, filters = {})      => ['meetings', orgId, 'list', filters],
    detail: (orgId, meetingId)         => ['meetings', orgId, 'detail', meetingId],
  },

  // Courrier
  mail: {
    all:    (orgId)                    => ['mail', orgId],
    list:   (orgId, filters = {})      => ['mail', orgId, 'list', filters],
    detail: (orgId, mailId)            => ['mail', orgId, 'detail', mailId],
  },

  // GED
  documents: {
    all:    (orgId)                    => ['documents', orgId],
    folder: (orgId, folderId)          => ['documents', orgId, 'folder', folderId],
    detail: (orgId, docId)             => ['documents', orgId, 'detail', docId],
  },

  // Dashboard KPIs
  dashboard: {
    kpis:     (orgId)                  => ['dashboard', orgId, 'kpis'],
    activity: (orgId)                  => ['dashboard', orgId, 'activity'],
  },

  // Notifications
  notifications: {
    all:      (userId)                 => ['notifications', userId],
    unread:   (userId)                 => ['notifications', userId, 'unread'],
  },

  // Référentiels
  reference: {
    roles:    ()                       => ['reference', 'roles'],
    countries: ()                      => ['reference', 'countries'],
    plans:    ()                       => ['reference', 'plans'],
    departments: (orgId)               => ['reference', orgId, 'departments'],
    rooms:    (orgId)                  => ['reference', orgId, 'rooms'],
  },

  // Utilisateur courant
  user: {
    profile:     ()                    => ['user', 'profile'],
    permissions: ()                    => ['user', 'permissions'],
    preferences: ()                    => ['user', 'preferences'],
  },
};

// =============================================================================
// Helpers de prefetching pour la pagination
// =============================================================================

/**
 * Prefetch la page suivante et précédente d'une liste paginée.
 *
 * À appeler quand l'utilisateur est sur une page de liste — la page N+1
 * sera déjà en cache quand il cliquera "Suivant".
 *
 * @param {QueryClient} queryClient
 * @param {Function}    queryFn      — Fonction fetch acceptant { page }
 * @param {Array}       baseKey      — Query key de base (sans page)
 * @param {number}      currentPage
 * @param {number}      totalPages
 * @param {number}      staleTime    — Durée de fraîcheur du prefetch
 */
export async function prefetchAdjacentPages(queryClient, queryFn, baseKey, currentPage, totalPages, staleTime = 60000) {
  const pagesToPrefetch = [
    currentPage + 1,
    currentPage - 1,
  ].filter(p => p >= 1 && p <= totalPages && p !== currentPage);

  await Promise.all(
    pagesToPrefetch.map(page =>
      queryClient.prefetchQuery({
        queryKey: [...baseKey, { page }],
        queryFn:  () => queryFn({ page }),
        staleTime,
      })
    )
  );
}

// =============================================================================
// Invalidation groupée post-mutation
// =============================================================================

/**
 * Invalide toutes les queries liées à une entité après une mutation.
 * À appeler dans le onSuccess de useMutation.
 *
 * @param {QueryClient} queryClient
 * @param {string}      entity      — 'tasks' | 'calendar' | 'meetings' | 'mail' | 'documents'
 * @param {string|number} orgId
 */
export function invalidateEntityQueries(queryClient, entity, orgId) {
  const keyMap = {
    tasks:     QUERY_KEYS.tasks.all(orgId),
    calendar:  QUERY_KEYS.calendar.all(orgId),
    meetings:  QUERY_KEYS.meetings.all(orgId),
    mail:      QUERY_KEYS.mail.all(orgId),
    documents: QUERY_KEYS.documents.all(orgId),
    dashboard: QUERY_KEYS.dashboard.kpis(orgId),
  };

  const key = keyMap[entity];
  if (! key) return;

  // Invalide toutes les queries dont la key commence par le préfixe
  queryClient.invalidateQueries({ queryKey: key });

  // Les mutations sur la plupart des entités impactent aussi les KPIs
  if (entity !== 'documents') {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.kpis(orgId) });
  }
}
