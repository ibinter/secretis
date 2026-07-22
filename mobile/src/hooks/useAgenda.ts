import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import SecretisAPI from '../config/api';
import type { AgendaEvent } from '../types';

// ============================================================
// Clés de cache
// ============================================================

export const agendaKeys = {
  all: ['agenda'] as const,
  byDate: (date: string) => [...agendaKeys.all, 'date', date] as const,
  byMonth: (year: number, month: number) => [...agendaKeys.all, 'month', year, month] as const,
  detail: (id: string) => [...agendaKeys.all, 'detail', id] as const,
};

// ============================================================
// Types
// ============================================================

export interface CreateEventPayload {
  title: string;
  description?: string;
  type: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  location?: string;
  onlineLink?: string;
  participants?: string[];
}

export interface UpdateEventPayload extends Partial<CreateEventPayload> {}

// ============================================================
// Hooks
// ============================================================

export function useEventsByDate(date: string) {
  const formatted = dayjs(date).format('YYYY-MM-DD');
  return useQuery({
    queryKey: agendaKeys.byDate(formatted),
    queryFn: async () => {
      const { data } = await SecretisAPI.get<AgendaEvent[]>('/agenda/events', {
        params: { date: formatted },
      });
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useEventsByMonth(year: number, month: number) {
  return useQuery({
    queryKey: agendaKeys.byMonth(year, month),
    queryFn: async () => {
      const start = dayjs().year(year).month(month - 1).startOf('month').format('YYYY-MM-DD');
      const end = dayjs().year(year).month(month - 1).endOf('month').format('YYYY-MM-DD');
      const { data } = await SecretisAPI.get<AgendaEvent[]>('/agenda/events', {
        params: { start, end },
      });
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useTodayEvents() {
  const today = dayjs().format('YYYY-MM-DD');
  return useEventsByDate(today);
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: agendaKeys.detail(id),
    queryFn: async () => {
      const { data } = await SecretisAPI.get<AgendaEvent>(`/agenda/events/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEventPayload) => {
      const { data } = await SecretisAPI.post<AgendaEvent>('/agenda/events', payload);
      return data;
    },
    onSuccess: (data) => {
      const date = dayjs(data.startDate).format('YYYY-MM-DD');
      queryClient.invalidateQueries({ queryKey: agendaKeys.byDate(date) });
      const year = dayjs(data.startDate).year();
      const month = dayjs(data.startDate).month() + 1;
      queryClient.invalidateQueries({ queryKey: agendaKeys.byMonth(year, month) });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateEventPayload;
    }) => {
      const { data } = await SecretisAPI.put<AgendaEvent>(`/agenda/events/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await SecretisAPI.delete(`/agenda/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agendaKeys.all });
    },
  });
}

export function useEventDates(year: number, month: number) {
  const { data } = useEventsByMonth(year, month);
  return (data ?? []).map((e) => dayjs(e.startDate).format('YYYY-MM-DD'));
}
