/**
 * api.helper.ts
 * Helpers E2E — Création de données de test via API Laravel
 * Évite de passer par l'UI pour les données de contexte (plus rapide, plus fiable)
 *
 * Ces helpers supposent que le backend expose des endpoints de test
 * protégés par le header X-Test-Secret (uniquement en environnement test/staging).
 */

import { APIRequestContext } from '@playwright/test';

// -----------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------

const TEST_SECRET = process.env.TEST_SECRET ?? 'e2e-test-secret';
const BASE_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-Test-Secret': TEST_SECRET,
};

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface CreatedEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  organization_id: number;
  reference?: string;
}

export interface CreatedTask {
  id: number;
  title: string;
  status: string;
  organization_id: number;
}

export interface CreatedCourrier {
  id: number;
  subject: string;
  type: string;
  sender: string;
  status: string;
  reference: string;
  organization_id: number;
}

export interface CreatedVisitor {
  id: number;
  name: string;
  company: string;
  status: string;
  qr_token: string;
  organization_id: number;
}

export interface CreatedOrganization {
  id: number;
  name: string;
  slug: string;
  status: string;
}

export interface CreatedUser {
  id: number;
  name: string;
  email: string;
  role: string;
  organization_id: number;
}

// -----------------------------------------------------------------------
// Helper générique
// -----------------------------------------------------------------------

async function apiPost<T>(
  requestContext: APIRequestContext,
  endpoint: string,
  data: Record<string, unknown>,
): Promise<T> {
  const response = await requestContext.post(endpoint, {
    data,
    headers: BASE_HEADERS,
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `API POST ${endpoint} failed with status ${response.status()}: ${body}`,
    );
  }

  const json = await response.json();
  return (json.data ?? json) as T;
}

async function apiDelete(
  requestContext: APIRequestContext,
  endpoint: string,
): Promise<void> {
  const response = await requestContext.delete(endpoint, {
    headers: BASE_HEADERS,
  });

  // 204 No Content ou 200 sont acceptables
  if (![200, 204, 404].includes(response.status())) {
    const body = await response.text();
    throw new Error(
      `API DELETE ${endpoint} failed with status ${response.status()}: ${body}`,
    );
  }
}

// -----------------------------------------------------------------------
// Événements
// -----------------------------------------------------------------------

export async function createEvent(
  requestContext: APIRequestContext,
  data: {
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
    is_recurring?: boolean;
    recurrence_rule?: string;
  },
): Promise<CreatedEvent> {
  return apiPost<CreatedEvent>(requestContext, '/api/events', {
    ...data,
    _test: true,
  });
}

export async function deleteEvent(
  requestContext: APIRequestContext,
  id: number,
): Promise<void> {
  return apiDelete(requestContext, `/api/events/${id}`);
}

// -----------------------------------------------------------------------
// Tâches
// -----------------------------------------------------------------------

export async function createTask(
  requestContext: APIRequestContext,
  data: {
    title: string;
    status?: 'todo' | 'in_progress' | 'done' | 'cancelled';
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string;
    assigned_to?: number;
  },
): Promise<CreatedTask> {
  return apiPost<CreatedTask>(requestContext, '/api/tasks', {
    status: 'todo',
    priority: 'medium',
    ...data,
    _test: true,
  });
}

export async function deleteTask(
  requestContext: APIRequestContext,
  id: number,
): Promise<void> {
  return apiDelete(requestContext, `/api/tasks/${id}`);
}

// -----------------------------------------------------------------------
// Courrier
// -----------------------------------------------------------------------

export async function createCourrier(
  requestContext: APIRequestContext,
  data: {
    subject: string;
    type: 'incoming' | 'outgoing' | 'internal';
    sender?: string;
    recipient?: string;
    status?: 'pending' | 'in_progress' | 'processed' | 'archived';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  },
): Promise<CreatedCourrier> {
  return apiPost<CreatedCourrier>(requestContext, '/api/mail-registry', {
    status: 'pending',
    priority: 'normal',
    received_at: new Date().toISOString().split('T')[0],
    ...data,
    _test: true,
  });
}

export async function deleteCourrier(
  requestContext: APIRequestContext,
  id: number,
): Promise<void> {
  return apiDelete(requestContext, `/api/mail-registry/${id}`);
}

// -----------------------------------------------------------------------
// Visiteurs
// -----------------------------------------------------------------------

export async function createVisitor(
  requestContext: APIRequestContext,
  data: {
    name: string;
    company?: string;
    host?: string;
    reason?: string;
    phone?: string;
    email?: string;
    status?: 'checked_in' | 'checked_out' | 'scheduled' | 'blacklisted';
  },
): Promise<CreatedVisitor> {
  return apiPost<CreatedVisitor>(requestContext, '/api/visitors', {
    status: 'checked_in',
    check_in_at: new Date().toISOString(),
    phone: '+22500000000',
    ...data,
    _test: true,
  });
}

export async function deleteVisitor(
  requestContext: APIRequestContext,
  id: number,
): Promise<void> {
  return apiDelete(requestContext, `/api/visitors/${id}`);
}

// -----------------------------------------------------------------------
// Licence
// -----------------------------------------------------------------------

export async function activateLicense(
  requestContext: APIRequestContext,
  data: {
    organization_id: number;
    plan: 'starter' | 'pro' | 'enterprise';
    billing_period: 'monthly' | 'annual';
    expires_at?: string;
  },
): Promise<{ id: number; status: string; expires_at: string }> {
  return apiPost(requestContext, '/api/test/licenses/activate', {
    ...data,
  });
}

export async function expireLicense(
  requestContext: APIRequestContext,
  organizationId: number,
): Promise<void> {
  await apiPost(requestContext, '/api/test/licenses/expire', {
    organization_id: organizationId,
  });
}

// -----------------------------------------------------------------------
// Organisations
// -----------------------------------------------------------------------

export async function createOrganization(
  requestContext: APIRequestContext,
  data?: {
    name?: string;
    slug?: string;
    country?: string;
    timezone?: string;
    admin_email?: string;
    admin_password?: string;
    admin_name?: string;
  },
): Promise<CreatedOrganization> {
  const uniqueSuffix = Date.now();
  return apiPost<CreatedOrganization>(requestContext, '/api/test/organizations', {
    name: `Test Org ${uniqueSuffix}`,
    slug: `test-org-${uniqueSuffix}`,
    country: 'CI',
    timezone: 'Africa/Abidjan',
    admin_email: `admin-${uniqueSuffix}@test-e2e.ci`,
    admin_password: 'Admin@E2E2024!',
    admin_name: `Admin ${uniqueSuffix}`,
    ...data,
  });
}

export async function deleteOrganization(
  requestContext: APIRequestContext,
  id: number,
): Promise<void> {
  return apiDelete(requestContext, `/api/test/organizations/${id}`);
}

// -----------------------------------------------------------------------
// Utilisateurs
// -----------------------------------------------------------------------

export async function createUser(
  requestContext: APIRequestContext,
  data: {
    role: 'admin_org' | 'secretary' | 'director' | 'assistant' | 'receptionist' | 'auditor' | 'operator';
    organization_id?: number;
    name?: string;
    email?: string;
    password?: string;
  },
): Promise<CreatedUser> {
  const uniqueSuffix = Date.now();
  return apiPost<CreatedUser>(requestContext, '/api/test/users', {
    name: `User ${data.role} ${uniqueSuffix}`,
    email: `user-${data.role}-${uniqueSuffix}@test-e2e.ci`,
    password: 'UserTest@E2E2024!',
    status: 'active',
    ...data,
  });
}

export async function deleteUser(
  requestContext: APIRequestContext,
  id: number,
): Promise<void> {
  return apiDelete(requestContext, `/api/test/users/${id}`);
}

// -----------------------------------------------------------------------
// Nettoyage par lot
// -----------------------------------------------------------------------

export async function cleanupAll(
  requestContext: APIRequestContext,
  resources: Array<{ type: string; id: number }>,
): Promise<void> {
  const promises = resources.map(({ type, id }) => {
    const endpoints: Record<string, string> = {
      event: `/api/events/${id}`,
      task: `/api/tasks/${id}`,
      courrier: `/api/mail-registry/${id}`,
      visitor: `/api/visitors/${id}`,
      organization: `/api/test/organizations/${id}`,
      user: `/api/test/users/${id}`,
    };
    const endpoint = endpoints[type];
    return endpoint ? apiDelete(requestContext, endpoint) : Promise.resolve();
  });

  await Promise.allSettled(promises);
}

// -----------------------------------------------------------------------
// Helpers utilitaires
// -----------------------------------------------------------------------

/**
 * Attendre qu'une ressource soit dans un état donné (polling).
 */
export async function waitForStatus(
  requestContext: APIRequestContext,
  endpoint: string,
  expectedStatus: string,
  maxAttempts = 10,
  delayMs = 500,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await requestContext.get(endpoint, { headers: BASE_HEADERS });
    if (response.ok()) {
      const data = await response.json();
      const status = (data.data ?? data).status;
      if (status === expectedStatus) return true;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}
