import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { AgendaResource }        from './resources/AgendaResource.js';
import { TasksResource }         from './resources/TasksResource.js';
import { MailResource }          from './resources/MailResource.js';
import { InvoicesResource }      from './resources/InvoicesResource.js';
import { UsersResource }         from './resources/UsersResource.js';
import { NotificationsResource } from './resources/NotificationsResource.js';
import { SecretisError }         from './SecretisError.js';
import type {
  SecretisClientConfig,
  ApiResponse,
  AuthResult,
  LoginData,
  User,
  Organization,
} from './types/index.js';

export { SecretisError };
export * from './types/index.js';

/**
 * SecretisClient — Client principal du SDK IBIG SECRETIS
 *
 * @example
 * ```typescript
 * import { SecretisClient } from '@ibigsoft/secretis-js';
 *
 * const client = new SecretisClient({
 *   baseUrl: 'https://acme-ci.secretis.ibigsoft.com',
 *   apiKey: 'sk_live_1|LkZt8Mhq3rPxQw...',
 * });
 *
 * // Agenda
 * const events = await client.agenda.list({ start: '2026-07-01', end: '2026-07-31' });
 *
 * // Tâches
 * const task = await client.tasks.create({
 *   title: 'Rapport mensuel',
 *   priority: 'high',
 *   assignee_ids: [5],
 * });
 *
 * // Facture
 * const invoice = await client.invoices.get('uuid-facture');
 * console.log(invoice.total);
 * ```
 */
export class SecretisClient {
  private readonly http: AxiosInstance;

  /** Module Agenda — événements calendrier */
  readonly agenda: AgendaResource;
  /** Module Tâches — kanban et sous-tâches */
  readonly tasks: TasksResource;
  /** Module Courrier — registre entrant/sortant */
  readonly mail: MailResource;
  /** Module Facturation — factures et paiements */
  readonly invoices: InvoicesResource;
  /** Module Utilisateurs — membres et invitations */
  readonly users: UsersResource;
  /** Module Notifications — in-app temps réel */
  readonly notifications: NotificationsResource;

  constructor(private readonly config: SecretisClientConfig) {
    const baseURL = [
      config.baseUrl.replace(/\/$/, ''),
      'api',
      config.apiVersion ?? 'v1',
    ].join('/');

    this.http = axios.create({
      baseURL,
      timeout: config.timeout ?? 30_000,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-SECRETIS-SDK': '1.0.0',
      },
    });

    // Intercepteur réponse : transforme les erreurs Axios en SecretisError
    this.http.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const status  = error.response?.status ?? 0;
        const payload = error.response?.data as Record<string, unknown> | undefined;
        const message = (payload?.message as string) ?? error.message ?? 'Erreur inconnue';

        throw new SecretisError(message, status, payload as never ?? null);
      },
    );

    // Initialisation des resources
    this.agenda        = new AgendaResource(this.http);
    this.tasks         = new TasksResource(this.http);
    this.mail          = new MailResource(this.http);
    this.invoices      = new InvoicesResource(this.http);
    this.users         = new UsersResource(this.http);
    this.notifications = new NotificationsResource(this.http);
  }

  // ---------------------------------------------------------------------------
  // AUTH helpers
  // ---------------------------------------------------------------------------

  /**
   * Authentifie et retourne le token + profil.
   * Pratique pour les scripts one-shot (ne met PAS à jour le client).
   *
   * Pour un usage interactif, utilisez `SecretisClient.withCredentials()`.
   */
  async login(credentials: LoginData): Promise<AuthResult> {
    const { data } = await this.http.post<ApiResponse<AuthResult>>(
      '/auth/login',
      credentials,
    );
    return data.data;
  }

  /**
   * Invalide le token courant.
   */
  async logout(): Promise<void> {
    await this.http.post('/auth/logout');
  }

  /**
   * Retourne le profil de l'utilisateur authentifié.
   */
  async me(): Promise<{ user: User; organization: Organization; permissions: string[] }> {
    const { data } = await this.http.get<ApiResponse<{
      user: User;
      organization: Organization;
      permissions: string[];
    }>>('/auth/me');
    return data.data;
  }

  // ---------------------------------------------------------------------------
  // Factory — auth par credentials (login puis construction du client)
  // ---------------------------------------------------------------------------

  /**
   * Crée un client en s'authentifiant avec email+password.
   * Le token est automatiquement injecté dans toutes les requêtes suivantes.
   *
   * @example
   * ```typescript
   * const client = await SecretisClient.withCredentials({
   *   baseUrl: 'https://acme-ci.secretis.ibigsoft.com',
   *   email: 'admin@acme-ci.com',
   *   password: 'MonMotDePasse@2026',
   * });
   * const events = await client.agenda.list({ start: '2026-07-01', end: '2026-07-31' });
   * ```
   */
  static async withCredentials(params: {
    baseUrl: string;
    email: string;
    password: string;
    timeout?: number;
  }): Promise<SecretisClient> {
    // Client temporaire sans token pour le login
    const temp = new SecretisClient({
      baseUrl: params.baseUrl,
      apiKey: '',
      timeout: params.timeout,
    });

    const auth = await temp.login({
      email: params.email,
      password: params.password,
    });

    return new SecretisClient({
      baseUrl: params.baseUrl,
      apiKey: auth.token,
      timeout: params.timeout,
    });
  }

  // ---------------------------------------------------------------------------
  // Utilitaires
  // ---------------------------------------------------------------------------

  /**
   * Met à jour le token (après un refresh par exemple).
   */
  setToken(token: string): void {
    this.http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Retourne la configuration active.
   */
  getConfig(): Readonly<SecretisClientConfig> {
    return Object.freeze({ ...this.config });
  }
}
