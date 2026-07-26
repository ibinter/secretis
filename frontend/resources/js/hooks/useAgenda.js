/**
 * useAgenda — Hook React pour le module Agenda & Planning
 *
 * Utilise TanStack Query (React Query) pour :
 *  - La mise en cache des événements par plage de dates
 *  - L'invalidation automatique après mutations
 *  - La gestion des états de chargement et d'erreur
 *
 * Toutes les requêtes sont faites vers l'API Laravel via axios (Inertia).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// -----------------------------------------------------------------------
// Clés de cache TanStack Query
// -----------------------------------------------------------------------

export const AGENDA_KEYS = {
    all: ['agenda'],
    events: () => [...AGENDA_KEYS.all, 'events'],
    eventsList: (filters) => [...AGENDA_KEYS.events(), 'list', filters],
    calendarEvents: (start, end) => [...AGENDA_KEYS.events(), 'calendar', start, end],
    event: (id) => [...AGENDA_KEYS.events(), 'detail', id],
    availability: (userId, start, end) => [...AGENDA_KEYS.all, 'availability', userId, start, end],
    rooms: () => [...AGENDA_KEYS.all, 'rooms'],
    roomsList: (filters) => [...AGENDA_KEYS.rooms(), 'list', filters],
    room: (id) => [...AGENDA_KEYS.rooms(), id],
    roomAvailability: (roomId, start, end) => [...AGENDA_KEYS.rooms(), roomId, 'availability', start, end],
};

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/**
 * Extrait le message d'erreur d'une réponse axios.
 */
const extractErrorMessage = (error) => {
    if (axios.isAxiosError(error)) {
        return (
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            'Une erreur est survenue.'
        );
    }
    return error?.message ?? 'Une erreur inconnue est survenue.';
};

// -----------------------------------------------------------------------
// Hook principal
// -----------------------------------------------------------------------

/**
 * useAgenda — Hook unifié pour toutes les opérations du module agenda.
 *
 * @param {object} options
 * @param {Function} [options.onSuccess] Callback de succès global
 * @param {Function} [options.onError]   Callback d'erreur global
 *
 * @returns {object} Objet avec les queries et mutations
 */
export function useAgenda({ onSuccess, onError } = {}) {
    const queryClient = useQueryClient();

    // -----------------------------------------------------------------------
    // Invalidation des caches après mutation
    // -----------------------------------------------------------------------

    const invalidateEvents = () => {
        queryClient.invalidateQueries({ queryKey: AGENDA_KEYS.events() });
    };

    // -----------------------------------------------------------------------
    // Queries
    // -----------------------------------------------------------------------

    /**
     * Récupère les événements pour FullCalendar dans une plage de dates.
     *
     * @param {string} start  ISO 8601
     * @param {string} end    ISO 8601
     * @param {boolean} enabled  Activer/désactiver la query
     */
    const useFetchCalendarEvents = (start, end, enabled = true) => {
        return useQuery({
            queryKey: AGENDA_KEYS.calendarEvents(start, end),
            queryFn: async () => {
                const { data } = await axios.get('/api/agenda/calendar', {
                    params: { start, end },
                });
                return data; // Array<CalendarEvent>
            },
            enabled: enabled && Boolean(start && end),
            staleTime: 2 * 60 * 1000, // 2 minutes avant re-fetch
            gcTime: 5 * 60 * 1000,    // 5 minutes en cache
        });
    };

    /**
     * Récupère la liste paginée des événements (format tableau).
     *
     * @param {object} filters { start, end, calendar_id, type, per_page }
     */
    const useFetchEvents = (filters = {}) => {
        return useQuery({
            queryKey: AGENDA_KEYS.eventsList(filters),
            queryFn: async () => {
                const { data } = await axios.get('/api/agenda/events', {
                    params: filters,
                });
                return data; // { data: [], meta: {pagination} }
            },
            staleTime: 1 * 60 * 1000,
        });
    };

    /**
     * Récupère le détail d'un événement.
     *
     * @param {string} eventId UUID
     */
    const useFetchEvent = (eventId) => {
        return useQuery({
            queryKey: AGENDA_KEYS.event(eventId),
            queryFn: async () => {
                const { data } = await axios.get(`/api/agenda/events/${eventId}`);
                return data.event;
            },
            enabled: Boolean(eventId),
        });
    };

    // -----------------------------------------------------------------------
    // Mutations
    // -----------------------------------------------------------------------

    /**
     * Crée un nouvel événement.
     *
     * @param {object} data StoreEventRequest payload
     */
    const createEventMutation = useMutation({
        mutationFn: async (data) => {
            const { data: response } = await axios.post('/api/agenda/events', data);
            return response;
        },
        onSuccess: (data) => {
            invalidateEvents();
            onSuccess?.('create', data);
        },
        onError: (error) => {
            const message = extractErrorMessage(error);
            onError?.('create', message, error);
        },
    });

    /**
     * Met à jour un événement existant.
     *
     * @param {{ id: string, data: object }} variables
     */
    const updateEventMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const { data: response } = await axios.put(`/api/agenda/events/${id}`, data);
            return response;
        },
        onSuccess: (data, variables) => {
            invalidateEvents();
            queryClient.invalidateQueries({ queryKey: AGENDA_KEYS.event(variables.id) });
            onSuccess?.('update', data);
        },
        onError: (error) => {
            const message = extractErrorMessage(error);
            onError?.('update', message, error);
        },
    });

    /**
     * Supprime un événement.
     *
     * @param {string} eventId UUID
     */
    const deleteEventMutation = useMutation({
        mutationFn: async (eventId) => {
            const { data } = await axios.delete(`/api/agenda/events/${eventId}`);
            return data;
        },
        onSuccess: (data, eventId) => {
            invalidateEvents();
            queryClient.removeQueries({ queryKey: AGENDA_KEYS.event(eventId) });
            onSuccess?.('delete', data);
        },
        onError: (error) => {
            const message = extractErrorMessage(error);
            onError?.('delete', message, error);
        },
    });

    // -----------------------------------------------------------------------
    // Disponibilité
    // -----------------------------------------------------------------------

    /**
     * Vérifie si un utilisateur a des conflits de créneau.
     *
     * @param {object} params { userId?, startAt, endAt, excludeEventId? }
     * @param {boolean} enabled
     */
    const useCheckAvailability = ({ userId, startAt, endAt, excludeEventId } = {}, enabled = false) => {
        return useQuery({
            queryKey: AGENDA_KEYS.availability(userId, startAt, endAt),
            queryFn: async () => {
                const { data } = await axios.post('/api/agenda/availability', {
                    user_id:          userId,
                    start_at:         startAt,
                    end_at:           endAt,
                    exclude_event_id: excludeEventId,
                });
                return data; // { available: bool, has_conflict: bool }
            },
            enabled: enabled && Boolean(startAt && endAt),
            staleTime: 30 * 1000, // 30 secondes (créneau peut être pris rapidement)
        });
    };

    /**
     * Mutation asynchrone pour vérifier la disponibilité (utilisable à la demande).
     */
    const checkAvailabilityMutation = useMutation({
        mutationFn: async ({ userId, startAt, endAt, excludeEventId }) => {
            const { data } = await axios.post('/api/agenda/availability', {
                user_id:          userId,
                start_at:         startAt,
                end_at:           endAt,
                exclude_event_id: excludeEventId,
            });
            return data;
        },
    });

    // -----------------------------------------------------------------------
    // Salles
    // -----------------------------------------------------------------------

    /**
     * Récupère les salles disponibles pour un créneau.
     *
     * @param {object} filters { capacityMin?, startAt?, endAt? }
     */
    const useFetchRooms = (filters = {}) => {
        return useQuery({
            queryKey: AGENDA_KEYS.roomsList(filters),
            queryFn: async () => {
                const { data } = await axios.get('/api/rooms', {
                    params: {
                        capacity_min: filters.capacityMin,
                        start_at:     filters.startAt,
                        end_at:       filters.endAt,
                        active_only:  true,
                    },
                });
                return data.data; // Array<Room>
            },
            staleTime: 5 * 60 * 1000,
        });
    };

    /**
     * Vérifie la disponibilité d'une salle spécifique.
     *
     * @param {string} roomId
     * @param {object} params { startAt, endAt, excludeReservationId? }
     * @param {boolean} enabled
     */
    const useCheckRoomAvailability = (roomId, { startAt, endAt, excludeReservationId } = {}, enabled = false) => {
        return useQuery({
            queryKey: AGENDA_KEYS.roomAvailability(roomId, startAt, endAt),
            queryFn: async () => {
                const { data } = await axios.get(`/api/rooms/${roomId}/availability`, {
                    params: {
                        start_at:               startAt,
                        end_at:                 endAt,
                        exclude_reservation_id: excludeReservationId,
                    },
                });
                return data; // { available: bool, conflicts: [] }
            },
            enabled: enabled && Boolean(roomId && startAt && endAt),
            staleTime: 30 * 1000,
        });
    };

    return {
        // Queries événements
        useFetchCalendarEvents,
        useFetchEvents,
        useFetchEvent,

        // Mutations événements
        createEvent:  createEventMutation,
        updateEvent:  updateEventMutation,
        deleteEvent:  deleteEventMutation,

        // Disponibilité utilisateur
        useCheckAvailability,
        checkAvailability: checkAvailabilityMutation,

        // Salles
        useFetchRooms,
        useCheckRoomAvailability,

        // Utils
        invalidateEvents,
    };
}

// -----------------------------------------------------------------------
// Hooks simplifiés (wrappers directs pour les cas d'usage courants)
// -----------------------------------------------------------------------

/**
 * Hook dédié pour récupérer les événements du calendrier.
 * Utilisé directement par FullCalendar via sa prop `events`.
 */
export function useFetchEvents(start, end, options = {}) {
    return useQuery({
        queryKey: AGENDA_KEYS.calendarEvents(start, end),
        queryFn: async () => {
            const { data } = await axios.get('/api/agenda/calendar', {
                params: { start, end },
            });
            return data;
        },
        enabled: Boolean(start && end),
        staleTime: 2 * 60 * 1000,
        ...options,
    });
}

/**
 * Hook dédié pour créer un événement.
 */
export function useCreateEvent(options = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => axios.post('/api/agenda/events', data).then((r) => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: AGENDA_KEYS.events() });
        },
        ...options,
    });
}

/**
 * Hook dédié pour mettre à jour un événement.
 */
export function useUpdateEvent(options = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }) =>
            axios.put(`/api/agenda/events/${id}`, data).then((r) => r.data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: AGENDA_KEYS.events() });
            queryClient.invalidateQueries({ queryKey: AGENDA_KEYS.event(id) });
        },
        ...options,
    });
}

/**
 * Hook dédié pour supprimer un événement.
 */
export function useDeleteEvent(options = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id) => axios.delete(`/api/agenda/events/${id}`).then((r) => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: AGENDA_KEYS.events() });
        },
        ...options,
    });
}

/**
 * Hook pour vérifier la disponibilité (query reactive).
 */
export function useCheckAvailability({ userId, startAt, endAt, excludeEventId } = {}, enabled = false) {
    return useQuery({
        queryKey: AGENDA_KEYS.availability(userId, startAt, endAt),
        queryFn: async () => {
            const { data } = await axios.post('/api/agenda/availability', {
                user_id:          userId,
                start_at:         startAt,
                end_at:           endAt,
                exclude_event_id: excludeEventId,
            });
            return data;
        },
        enabled: enabled && Boolean(startAt && endAt),
        staleTime: 30 * 1000,
    });
}
