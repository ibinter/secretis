/**
 * @ibigsoft/secretis-js — SDK officiel IBIG SECRETIS ERP
 *
 * @example
 * ```typescript
 * import { SecretisClient } from '@ibigsoft/secretis-js';
 *
 * const client = new SecretisClient({
 *   baseUrl: 'https://monorg.secretis.ibigsoft.com',
 *   apiKey: 'sk_...',
 * });
 * ```
 */

export { SecretisClient, SecretisError } from './SecretisClient.js';
export * from './types/index.js';
export { AgendaResource }        from './resources/AgendaResource.js';
export { TasksResource }         from './resources/TasksResource.js';
export { MailResource }          from './resources/MailResource.js';
export { InvoicesResource }      from './resources/InvoicesResource.js';
export { UsersResource }         from './resources/UsersResource.js';
export { NotificationsResource } from './resources/NotificationsResource.js';
