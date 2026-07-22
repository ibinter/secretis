import type { ApiErrorData } from './types/index.js';

/**
 * SecretisError — Erreur enrichie du SDK SECRETIS
 *
 * Toutes les erreurs API sont encapsulées dans cette classe.
 * Elle expose : message, statusCode, errorCode, errors (validation).
 *
 * @example
 * ```typescript
 * try {
 *   await client.tasks.create({ title: '' });
 * } catch (err) {
 *   if (err instanceof SecretisError) {
 *     console.log(err.statusCode);  // 422
 *     console.log(err.errorCode);   // 'SEC-030'
 *     console.log(err.errors);      // { title: ['Le champ title est obligatoire.'] }
 *   }
 * }
 * ```
 */
export class SecretisError extends Error {
  /** Code HTTP de la réponse */
  readonly statusCode: number;
  /** Code d'erreur SECRETIS (ex: SEC-030) */
  readonly errorCode: string | undefined;
  /** Erreurs de validation par champ */
  readonly errors: Record<string, string[]> | undefined;
  /** Données brutes de l'erreur */
  readonly data: ApiErrorData | null;

  constructor(
    message: string,
    statusCode: number,
    data: ApiErrorData | null = null,
  ) {
    super(message);
    this.name = 'SecretisError';
    this.statusCode = statusCode;
    this.errorCode = data?.error_code;
    this.errors = data?.errors;
    this.data = data;

    // Maintient la chaîne de prototypes en ES5
    Object.setPrototypeOf(this, SecretisError.prototype);
  }

  /** Erreur de validation (422) */
  get isValidationError(): boolean {
    return this.statusCode === 422;
  }

  /** Erreur d'authentification (401) */
  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  /** Erreur de permission (403) */
  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  /** Ressource introuvable (404) */
  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  /** Trop de requêtes (429) */
  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  /** Licence expirée (402) */
  get isLicenseError(): boolean {
    return this.statusCode === 402;
  }
}
