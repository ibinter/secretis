import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import SecretisAPI from '../config/api';
import type { Task, PaginatedResponse, SecretisStatus } from '../types';

// ============================================================
// Clés de cache
// ============================================================

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
};

// ============================================================
// Types
// ============================================================

export interface TaskFilters {
  status?: SecretisStatus | 'ALL' | 'OVERDUE';
  assignedToMe?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority: string;
  dueDate?: string;
  assignedTo?: string[];
  subtasks?: { title: string }[];
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  status?: SecretisStatus;
  assignedTo?: string[];
}

// ============================================================
// Hooks
// ============================================================

export function useTasks(
  filters: TaskFilters = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Task>>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
      };
      if (filters.status && filters.status !== 'ALL') params.status = filters.status;
      if (filters.assignedToMe) params.assignedToMe = true;
      if (filters.search) params.search = filters.search;
      if (filters.status === 'OVERDUE') {
        params.status = undefined;
        params.overdue = true;
      }

      const { data } = await SecretisAPI.get<PaginatedResponse<Task>>('/tasks', { params });
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 min
    ...options,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const { data } = await SecretisAPI.get<Task>(`/tasks/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useMyTasks() {
  return useTasks({ assignedToMe: true, pageSize: 50 });
}

export function useOverdueTasks() {
  return useTasks({ status: 'OVERDUE', pageSize: 50 });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      const { data } = await SecretisAPI.post<Task>('/tasks', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateTaskPayload }) => {
      const { data } = await SecretisAPI.put<Task>(`/tasks/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.setQueryData(taskKeys.detail(data.id), data);
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SecretisStatus }) => {
      const { data } = await SecretisAPI.patch<Task>(`/tasks/${id}/status`, { status });
      return data;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });
      const previous = queryClient.getQueryData<Task>(taskKeys.detail(id));
      if (previous) {
        queryClient.setQueryData(taskKeys.detail(id), { ...previous, status });
      }
      return { previous };
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(taskKeys.detail(id), context.previous);
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useToggleSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      subtaskId,
      completed,
    }: {
      taskId: string;
      subtaskId: string;
      completed: boolean;
    }) => {
      const { data } = await SecretisAPI.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, {
        isCompleted: completed,
      });
      return data;
    },
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const { data } = await SecretisAPI.post(`/tasks/${taskId}/comments`, { content });
      return data;
    },
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await SecretisAPI.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
