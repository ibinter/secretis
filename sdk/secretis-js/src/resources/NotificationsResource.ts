import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  Notification,
  ListNotificationsParams,
} from '../types/index.js';

/**
 * NotificationsResource — Module Notifications du SDK SECRETIS
 *
 * @example
 * ```typescript
 * // Notifications non lues
 * const { data, meta } = await client.notifications.list({ unread_only: true });
 * console.log(`${meta.unread_count} notification(s) non lue(s)`);
 *
 * // Marquer toutes lues
 * await client.notifications.markAllRead();
 * ```
 */
export class NotificationsResource {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * Liste les notifications de l'utilisateur connecté.
   * Le champ meta.unread_count indique le total non lu.
   *
   * @param params.unread_only  Si true, retourne uniquement les non lues
   */
  async list(params?: ListNotificationsParams): Promise<PaginatedResponse<Notification>> {
    const { data } = await this.http.get<PaginatedResponse<Notification>>(
      '/notifications',
      { params },
    );
    return data;
  }

  /**
   * Marque une notification spécifique comme lue.
   */
  async markRead(id: string): Promise<void> {
    await this.http.put(`/notifications/${id}/read`);
  }

  /**
   * Marque toutes les notifications non lues comme lues.
   * Retourne le nombre de notifications affectées.
   */
  async markAllRead(): Promise<{ marked_count: number }> {
    const { data } = await this.http.put<ApiResponse<{ marked_count: number }>>(
      '/notifications/read-all',
    );
    return data.data;
  }
}
