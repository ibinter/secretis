import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  Task,
  TaskStatus,
  ListTasksParams,
  CreateTaskData,
  UpdateTaskData,
} from '../types/index.js';

/**
 * TasksResource — Module Tâches du SDK SECRETIS
 *
 * @example
 * ```typescript
 * // Tâches en cours pour un projet
 * const { data, meta } = await client.tasks.list({
 *   project_id: 'uuid-projet',
 *   status: 'in_progress',
 * });
 *
 * // Créer et assigner
 * const task = await client.tasks.create({
 *   title: 'Préparer rapport Q3',
 *   priority: 'high',
 *   due_date: '2026-09-30',
 *   assignee_ids: [5, 8],
 * });
 *
 * // Changer le statut
 * await client.tasks.updateStatus(task.id, 'in_progress');
 * ```
 */
export class TasksResource {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * Liste paginée des tâches.
   * Retourne data[] + meta (pagination + overdue_count).
   */
  async list(params?: ListTasksParams): Promise<PaginatedResponse<Task>> {
    const { data } = await this.http.get<PaginatedResponse<Task>>('/tasks', { params });
    return data;
  }

  /**
   * Récupère une tâche avec ses sous-tâches et assignés.
   */
  async get(id: string): Promise<Task> {
    const { data } = await this.http.get<ApiResponse<Task>>(`/tasks/${id}`);
    return data.data;
  }

  /**
   * Crée une nouvelle tâche.
   */
  async create(payload: CreateTaskData): Promise<Task> {
    const { data } = await this.http.post<ApiResponse<Task>>('/tasks', payload);
    return data.data;
  }

  /**
   * Modifie les propriétés d'une tâche.
   * Seuls les champs fournis sont mis à jour (PATCH sémantique via PUT).
   */
  async update(id: string, payload: UpdateTaskData): Promise<Task> {
    const { data } = await this.http.put<ApiResponse<Task>>(`/tasks/${id}`, payload);
    return data.data;
  }

  /**
   * Change le statut d'une tâche (machine à états).
   *
   * Transitions autorisées :
   * - todo → in_progress | cancelled
   * - in_progress → review | todo | cancelled
   * - review → done | in_progress | cancelled
   * - done → in_progress (ré-ouverture)
   * - cancelled → todo (réactivation)
   *
   * @throws {SecretisError} 422 si la transition est invalide
   */
  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const { data } = await this.http.put<ApiResponse<Task>>(
      `/tasks/${id}/status`,
      { status },
    );
    return data.data;
  }

  /**
   * Supprime une tâche (soft delete).
   */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/tasks/${id}`);
  }
}
