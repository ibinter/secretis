import { test as base, Page, request, APIRequestContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type UserRole = 'admin' | 'secretary' | 'manager' | 'director' | 'receptionist';

export interface TestUser {
  email: string;
  password: string;
  role: UserRole;
  name: string;
}

export interface TestOrg {
  id: number;
  slug: string;
  name: string;
}

// -----------------------------------------------------------------------
// Credentials de test (correspondant aux seeders)
// -----------------------------------------------------------------------

export const TEST_USERS: Record<UserRole, TestUser> = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? 'admin@test-secretis.ci',
    password: process.env.TEST_ADMIN_PASSWORD ?? 'Admin@Test2024!',
    role: 'admin',
    name: 'Admin Test',
  },
  secretary: {
    email: process.env.TEST_SECRETARY_EMAIL ?? 'secretaire@test-secretis.ci',
    password: process.env.TEST_SECRETARY_PASSWORD ?? 'Secretaire@Test2024!',
    role: 'secretary',
    name: 'Secrétaire Test',
  },
  manager: {
    email: process.env.TEST_MANAGER_EMAIL ?? 'manager@test-secretis.ci',
    password: process.env.TEST_MANAGER_PASSWORD ?? 'Manager@Test2024!',
    role: 'manager',
    name: 'Manager Test',
  },
  director: {
    email: process.env.TEST_DIRECTOR_EMAIL ?? 'directeur@test-secretis.ci',
    password: process.env.TEST_DIRECTOR_PASSWORD ?? 'Directeur@Test2024!',
    role: 'director',
    name: 'Directeur Test',
  },
  receptionist: {
    email: process.env.TEST_RECEPTIONIST_EMAIL ?? 'receptionniste@test-secretis.ci',
    password: process.env.TEST_RECEPTIONIST_PASSWORD ?? 'Reception@Test2024!',
    role: 'receptionist',
    name: 'Réceptionniste Test',
  },
};

// -----------------------------------------------------------------------
// Helper : loginAs
// -----------------------------------------------------------------------

export async function loginAs(page: Page, role: UserRole): Promise<void> {
  const user = TEST_USERS[role];

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/mot de passe|password/i).fill(user.password);
  await page.getByRole('button', { name: /connexion|se connecter/i }).click();

  // Attendre la redirection vers le dashboard
  await page.waitForURL(/dashboard|accueil/, { timeout: 15_000 });
}

// -----------------------------------------------------------------------
// Helper : logout
// -----------------------------------------------------------------------

export async function logout(page: Page): Promise<void> {
  // Via API pour être rapide
  await page.request.post('/api/auth/logout');
  await page.goto('/login');
}

// -----------------------------------------------------------------------
// Helper : createTestOrg (via API)
// -----------------------------------------------------------------------

export async function createTestOrg(apiContext: APIRequestContext): Promise<TestOrg> {
  const slug = `test-org-${Date.now()}`;

  const response = await apiContext.post('/api/test/organizations', {
    data: {
      name: `Organisation Test ${Date.now()}`,
      slug,
      country: 'CI',
      timezone: 'Africa/Abidjan',
      admin_email: `admin-${slug}@test.ci`,
      admin_password: 'Admin@Test2024!',
      admin_name: 'Admin Test',
    },
    headers: {
      'X-Test-Secret': process.env.TEST_SECRET ?? 'e2e-test-secret',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test org: ${await response.text()}`);
  }

  return response.json();
}

// -----------------------------------------------------------------------
// Helper : cleanupTestData
// -----------------------------------------------------------------------

export async function cleanupTestData(
  apiContext: APIRequestContext,
  resourceType: string,
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return;

  await apiContext.delete(`/api/test/cleanup`, {
    data: { resource_type: resourceType, ids },
    headers: {
      'X-Test-Secret': process.env.TEST_SECRET ?? 'e2e-test-secret',
    },
  });
}

// -----------------------------------------------------------------------
// Helper : saveAuthState (pour le setup project)
// -----------------------------------------------------------------------

export async function saveAuthState(page: Page, role: UserRole): Promise<void> {
  const authDir = path.join(__dirname, '..', '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  await loginAs(page, role);
  await page.context().storageState({ path: path.join(authDir, `${role}.json`) });
}

// -----------------------------------------------------------------------
// Fixture extensions Playwright
// -----------------------------------------------------------------------

type AuthFixtures = {
  /** Page déjà authentifiée en tant qu'admin */
  adminPage: Page;
  /** Page déjà authentifiée en tant que secrétaire */
  secretaryPage: Page;
  /** Page déjà authentifiée en tant que manager */
  managerPage: Page;
  /** Page déjà authentifiée en tant que directeur */
  directorPage: Page;
  /** Contexte API authentifié en tant qu'admin */
  adminApiContext: APIRequestContext;
  /** Page non authentifiée (login frais) */
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  // Page authentifiée en admin (état chargé depuis .auth/admin.json)
  adminPage: async ({ browser }, use) => {
    const authFile = path.join(__dirname, '..', '.auth', 'admin.json');

    const context = await browser.newContext({
      storageState: fs.existsSync(authFile) ? authFile : undefined,
    });

    const page = await context.newPage();

    // Si pas d'état sauvegardé, login dynamique
    if (!fs.existsSync(authFile)) {
      await loginAs(page, 'admin');
    }

    await use(page);
    await context.close();
  },

  // Page authentifiée en secrétaire
  secretaryPage: async ({ browser }, use) => {
    const authFile = path.join(__dirname, '..', '.auth', 'secretary.json');
    const context = await browser.newContext({
      storageState: fs.existsSync(authFile) ? authFile : undefined,
    });
    const page = await context.newPage();
    if (!fs.existsSync(authFile)) {
      await loginAs(page, 'secretary');
    }
    await use(page);
    await context.close();
  },

  // Page authentifiée en manager
  managerPage: async ({ browser }, use) => {
    const authFile = path.join(__dirname, '..', '.auth', 'manager.json');
    const context = await browser.newContext({
      storageState: fs.existsSync(authFile) ? authFile : undefined,
    });
    const page = await context.newPage();
    if (!fs.existsSync(authFile)) {
      await loginAs(page, 'manager');
    }
    await use(page);
    await context.close();
  },

  // Page authentifiée en directeur
  directorPage: async ({ browser }, use) => {
    const authFile = path.join(__dirname, '..', '.auth', 'director.json');
    const context = await browser.newContext({
      storageState: fs.existsSync(authFile) ? authFile : undefined,
    });
    const page = await context.newPage();
    if (!fs.existsSync(authFile)) {
      await loginAs(page, 'director');
    }
    await use(page);
    await context.close();
  },

  // Contexte API admin pour la gestion des données de test
  adminApiContext: async ({ playwright }, use) => {
    const apiContext = await playwright.request.newContext({
      baseURL: process.env.BASE_URL ?? 'http://localhost:8000',
      extraHTTPHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Test-Secret': process.env.TEST_SECRET ?? 'e2e-test-secret',
      },
    });
    await use(apiContext);
    await apiContext.dispose();
  },

  // Page authentifiée générique (alias vers adminPage)
  authenticatedPage: async ({ adminPage }, use) => {
    await use(adminPage);
  },
});

export { expect } from '@playwright/test';
