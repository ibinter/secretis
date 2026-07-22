import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  MailRegistry,
  MailStatus,
  ListMailParams,
  CreateMailData,
} from '../types/index.js';

/**
 * MailResource — Module Courrier du SDK SECRETIS
 *
 * @example
 * ```typescript
 * // Courriers en attente
 * const { data } = await client.mail.list({ status: 'pending', type: 'incoming' });
 *
 * // Enregistrer un courrier entrant
 * const mail = await client.mail.create({
 *   type: 'incoming',
 *   subject: 'Demande de devis',
 *   sender_name: 'Jean Kouamé',
 *   urgency: 'high',
 *   received_at: '2026-07-21T08:00:00Z',
 * });
 *
 * // Assigner à un agent
 * await client.mail.assign(mail.id, 5);
 * ```
 */
export class MailResource {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * Liste paginée du registre courrier.
   */
  async list(params?: ListMailParams): Promise<PaginatedResponse<MailRegistry>> {
    const { data } = await this.http.get<PaginatedResponse<MailRegistry>>(
      '/mail-registry',
      { params },
    );
    return data;
  }

  /**
   * Récupère un courrier avec ses pièces jointes et historique.
   */
  async get(id: string): Promise<MailRegistry> {
    const { data } = await this.http.get<ApiResponse<MailRegistry>>(
      `/mail-registry/${id}`,
    );
    return data.data;
  }

  /**
   * Enregistre un nouveau courrier (entrant ou sortant).
   */
  async create(payload: CreateMailData): Promise<MailRegistry> {
    const { data } = await this.http.post<ApiResponse<MailRegistry>>(
      '/mail-registry',
      payload,
    );
    return data.data;
  }

  /**
   * Assigne un courrier à un agent.
   *
   * @param id        UUID du courrier
   * @param userId    ID de l'utilisateur assigné
   * @param options   Options complémentaires (département, notes)
   */
  async assign(
    id: string,
    userId: number,
    options?: { department_id?: string; notes?: string },
  ): Promise<MailRegistry> {
    const { data } = await this.http.put<ApiResponse<MailRegistry>>(
      `/mail-registry/${id}/assign`,
      { user_id: userId, ...options },
    );
    return data.data;
  }

  /**
   * Met à jour le statut d'un courrier.
   *
   * Flux normal : pending → processing → processed → archived
   */
  async updateStatus(
    id: string,
    status: MailStatus,
    notes?: string,
  ): Promise<MailRegistry> {
    const { data } = await this.http.put<ApiResponse<MailRegistry>>(
      `/mail-registry/${id}/status`,
      { status, notes },
    );
    return data.data;
  }
}
