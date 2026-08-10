import type { AxiosInstance } from 'axios';
import type {
  ApiResponse,
  Event,
  EventCalendarFormat,
  ListEventsParams,
  CreateEventData,
  UpdateEventData,
} from '../types/index.js';

/**
 * AgendaResource — Module Agenda du SDK SECRETIS
 *
 * @example
 * ```typescript
 * // Lister les événements du mois de juillet
 * const events = await client.agenda.list({
 *   start: '2026-07-01',
 *   end: '2026-07-31',
 *   view: 'month',
 * });
 *
 * // Créer un événement
 * const event = await client.agenda.create({
 *   title: 'Réunion de direction',
 *   start_at: '2026-07-25T09:00:00Z',
 *   end_at: '2026-07-25T10:30:00Z',
 *   type: 'meeting',
 *   participant_ids: [5, 8, 12],
 * });
 * ```
 */
export class AgendaResource {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * Liste les événements dans une plage de dates.
   * Retourne le format FullCalendar.js.
   *
   * @param params.start  Date ISO début (obligatoire)
   * @param params.end    Date ISO fin (obligatoire)
   * @param params.view   Granularité : month | week | day | list
   */
  async list(params: ListEventsParams): Promise<EventCalendarFormat[]> {
    const { data } = await this.http.get<ApiResponse<EventCalendarFormat[]>>(
      '/events',
      { params },
    );
    return data.data;
  }

  /**
   * Récupère le détail d'un événement.
   */
  async get(id: string): Promise<Event> {
    const { data } = await this.http.get<ApiResponse<Event>>(`/events/${id}`);
    return data.data;
  }

  /**
   * Crée un nouvel événement.
   */
  async create(payload: CreateEventData): Promise<Event> {
    const { data } = await this.http.post<ApiResponse<Event>>('/events', payload);
    return data.data;
  }

  /**
   * Met à jour un événement existant.
   */
  async update(id: string, payload: UpdateEventData): Promise<Event> {
    const { data } = await this.http.put<ApiResponse<Event>>(`/events/${id}`, payload);
    return data.data;
  }

  /**
   * Supprime un événement (soft delete).
   */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/events/${id}`);
  }
}
