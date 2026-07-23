/**
 * fixtures/auth.ts
 * Fixture Playwright étendue — IBIG SECRETIS ERP
 *
 * Couvre les 10 rôles de la matrice d'accès :
 *   superadmin_ibig, admin, dirigeant, secretaire, auditeur,
 *   rh_manager, comptable, chef_projet, technicien_qualite, visiteur_externe
 *
 * Usage dans un spec :
 *   import { test, expect, loginAs, USERS } from '../fixtures/auth'
 *   test('...', async ({ page, loginAs }) => { await loginAs('secretaire') })
 */

import { test as base, Page, APIRequestContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoleKey =
  | 'superadmin'
  | 'admin'
  | 'dirigeant'
  | 'secretaire'
  | 'auditeur'
  | 'rh_manager'
  | 'comptable'
  | 'chef_projet'
  | 'technicien_qualite'
  | 'visiteur_externe';

export interface Credentials {
  email: string;
  password: string;
  /** Nom du rôle Spatie côté backend */
  role: string;
  displayName: string;
}

// ---------------------------------------------------------------------------
// Table des credentials — doit correspondre à E2ESeeder.php
// ---------------------------------------------------------------------------

export const USERS: Record<RoleKey, Credentials> = {
  superadmin: {
    email: process.env.TEST_SUPERADMIN_EMAIL ?? 'superadmin@ibigsoft.com',
    password: process.env.TEST_SUPERADMIN_PASSWORD ?? 'Password123!',
    role: 'superadmin_ibig',
    displayName: 'Super Admin IBIG',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? 'admin@demo-secretis.ci',
    password: process.env.TEST_ADMIN_PASSWORD ?? 'Password123!',
    role: 'admin_org',
    displayName: 'Admin Organisation',
  },
  dirigeant: {
    email: process.env.TEST_DIRIGEANT_EMAIL ?? 'dirigeant@demo-secretis.ci',
    password: process.env.TEST_DIRIGEANT_PASSWORD ?? 'Password123!',
    role: 'director',
    displayName: 'Directeur Général',
  },
  secretaire: {
    email: process.env.TEST_SECRETAIRE_EMAIL ?? 'secretaire@demo-secretis.ci',
    password: process.env.TEST_SECRETAIRE_PASSWORD ?? 'Password123!',
    role: 'secretary',
    displayName: 'Secrétaire',
  },
  auditeur: {
    email: process.env.TEST_AUDITEUR_EMAIL ?? 'auditeur@demo-secretis.ci',
    password: process.env.TEST_AUDITEUR_PASSWORD ?? 'Password123!',
    role: 'auditor',
    displayName: 'Auditeur Interne',
  },
  rh_manager: {
    email: process.env.TEST_RH_EMAIL ?? 'rh@demo-secretis.ci',
    password: process.env.TEST_RH_PASSWORD ?? 'Password123!',
    role: 'admin_responsible',
    displayName: 'Responsable RH',
  },
  comptable: {
    email: process.env.TEST_COMPTABLE_EMAIL ?? 'comptable@demo-secretis.ci',
    password: process.env.TEST_COMPTABLE_PASSWORD ?? 'Password123!',
    role: 'comptable',
    displayName: 'Comptable',
  },
  chef_projet: {
    email: process.env.TEST_CHEF_PROJET_EMAIL ?? 'chef_projet@demo-secretis.ci',
    password: process.env.TEST_CHEF_PROJET_PASSWORD ?? 'Password123!',
    role: 'chef_projet',
    displayName: 'Chef de Projet',
  },
  technicien_qualite: {
    email: process.env.TEST_QUALITE_EMAIL ?? 'qualite@demo-secretis.ci',
    password: process.env.TEST_QUALITE_PASSWORD ?? 'Password123!',
    role: 'technicien_qualite',
    displayName: 'Technicien Qualité',
  },
  visiteur_externe: {
    email: process.env.TEST_VISITEUR_EMAIL ?? 'visiteur@demo-secretis.ci',
    password: process.env.TEST_VISITEUR_PASSWORD ?? 'Password123!',
    role: 'visiteur_externe',
    displayName: 'Visiteur Externe',
  },
};

// ---------------------------------------------------------------------------
// Helper : loginAs (UI)
// ---------------------------------------------------------------------------

export async function loginAs(page: Page, role: RoleKey): Promise<void> {
  const creds = USERS[role];

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/mot de passe|password/i).fill(creds.password);
  await page.getByRole('button', { name: /connexion|se connecter/i }).click();

  await page.waitForURL(/dashboard|accueil/, { timeout: 20_000 });
}

// ---------------------------------------------------------------------------
// Helper : loginAs via API (pour les setups rapides)
// ---------------------------------------------------------------------------

export async function loginAsApi(
  request: APIRequestContext,
  role: RoleKey,
): Promise<string | null> {
  const creds = USERS[role];
  const response = await request.post('/api/auth/login', {
    data: { email: creds.email, password: creds.password },
  });
  if (!response.ok()) return null;
  const body = await response.json();
  return body.token ?? body.data?.token ?? null;
}

// ---------------------------------------------------------------------------
// Helper : logout
// ---------------------------------------------------------------------------

export async function logout(page: Page): Promise<void> {
  await page.request.post('/api/auth/logout').catch(() => null);
  await page.goto('/login');
}

// ---------------------------------------------------------------------------
// Helper : saveAuthState (pour global.setup.ts)
// ---------------------------------------------------------------------------

export async function saveAuthState(page: Page, role: RoleKey): Promise<void> {
  const authDir = path.join(__dirname, '..', '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  await loginAs(page, role);
  await page.context().storageState({ path: path.join(authDir, `${role}.json`) });
}

// ---------------------------------------------------------------------------
// Fixture extensions Playwright
// ---------------------------------------------------------------------------

type AuthFixtures = {
  /** Helper qui connecte la page courante avec le rôle donné */
  loginAs: (role: RoleKey) => Promise<void>;
  /** Page pré-authentifiée en admin */
  adminPage: Page;
  /** Page pré-authentifiée en secrétaire */
  secretairePage: Page;
  /** Page pré-authentifiée en dirigeant */
  dirigeantPage: Page;
  /** Page pré-authentifiée en auditeur */
  auditeurPage: Page;
};

export const test = base.extend<AuthFixtures>({
  loginAs: async ({ page }, use) => {
    await use((role: RoleKey) => loginAs(page, role));
  },

  adminPage: async ({ browser }, use) => {
    const authFile = path.join(__dirname, '..', '.auth', 'admin.json');
    const context = await browser.newContext({
      storageState: fs.existsSync(authFile) ? authFile : undefined,
    });
    const page = await context.newPage();
    if (!fs.existsSync(authFile)) {
      await loginAs(page, 'admin');
    }
    await use(page);
    await context.close();
  },

  secretairePage: async ({ browser }, use) => {
    const authFile = path.join(__dirname, '..', '.auth', 'secretaire.json');
    const context = await browser.newContext({
      storageState: fs.existsSync(authFile) ? authFile : undefined,
    });
    const page = await context.newPage();
    if (!fs.existsSync(authFile)) {
      await loginAs(page, 'secretaire');
    }
    await use(page);
    await context.close();
  },

  dirigeantPage: async ({ browser }, use) => {
    const authFile = path.join(__dirname, '..', '.auth', 'dirigeant.json');
    const context = await browser.newContext({
      storageState: fs.existsSync(authFile) ? authFile : undefined,
    });
    const page = await context.newPage();
    if (!fs.existsSync(authFile)) {
      await loginAs(page, 'dirigeant');
    }
    await use(page);
    await context.close();
  },

  auditeurPage: async ({ browser }, use) => {
    const authFile = path.join(__dirname, '..', '.auth', 'auditeur.json');
    const context = await browser.newContext({
      storageState: fs.existsSync(authFile) ? authFile : undefined,
    });
    const page = await context.newPage();
    if (!fs.existsSync(authFile)) {
      await loginAs(page, 'auditeur');
    }
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
