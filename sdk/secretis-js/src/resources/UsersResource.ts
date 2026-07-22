import type { AxiosInstance } from 'axios';
import type { ApiResponse, User } from '../types/index.js';

/**
 * UsersResource — Module Utilisateurs du SDK SECRETIS
 *
 * @example
 * ```typescript
 * // Membres de l'organisation
 * const users = await client.users.list();
 *
 * // Inviter un collaborateur
 * await client.users.invite('john@example.com', 'collaborateur');
 *
 * // Promouvoir manager
 * const updated = await client.users.updateRole(42, 'manager');
 * ```
 */
export class UsersResource {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * Retourne tous les membres actifs de l'organisation.
   *
   * @param params.department_id  Filtrer par département
   * @param params.status         Filtrer par statut
   * @param params.search         Recherche par nom ou email
   */
  async list(params?: {
    department_id?: string;
    status?: 'active' | 'inactive' | 'locked';
    search?: string;
  }): Promise<User[]> {
    const { data } = await this.http.get<ApiResponse<User[]>>('/users', { params });
    return data.data;
  }

  /**
   * Récupère le profil d'un utilisateur.
   */
  async get(id: number): Promise<User> {
    const { data } = await this.http.get<ApiResponse<User>>(`/users/${id}`);
    return data.data;
  }

  /**
   * Invite un utilisateur par email.
   * Un email d'invitation lui est envoyé pour créer son mot de passe.
   *
   * @param email         Email de l'invité
   * @param role          Rôle à assigner (ex: 'collaborateur', 'manager')
   * @param options       Options complémentaires
   */
  async invite(
    email: string,
    role: string,
    options?: { department_id?: string; name?: string },
  ): Promise<{ message: string }> {
    const { data } = await this.http.post<ApiResponse<{ message: string }>>(
      '/users/invite',
      { email, role, ...options },
    );
    return data.data;
  }

  /**
   * Modifie le rôle d'un utilisateur.
   * Nécessite la permission `users.manage`.
   */
  async updateRole(id: number, role: string): Promise<User> {
    const { data } = await this.http.put<ApiResponse<User>>(
      `/users/${id}/role`,
      { role },
    );
    return data.data;
  }
}
