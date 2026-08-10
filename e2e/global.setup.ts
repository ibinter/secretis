/**
 * global.setup.ts
 * Projet "setup" dans playwright.config.ts — s'exécute une seule fois avant tous les tests.
 *
 * Responsabilités :
 *  1. Seeder les données E2E via la commande artisan (si disponible)
 *  2. Authentifier les 10 rôles et sauvegarder leur storageState dans .auth/
 *
 * Les storageState permettent aux specs de se lancer sans passer par la page
 * de login à chaque test — gain de temps significatif en CI.
 */

import { test as setup, chromium } from '@playwright/test';
import { saveAuthState, USERS, RoleKey } from './fixtures/auth';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const AUTH_DIR = path.join(__dirname, '.auth');

// ---------------------------------------------------------------------------
// Étape 0 — Seeder les données E2E (si le backend est accessible)
// ---------------------------------------------------------------------------

setup('Seeder les données E2E', async () => {
  const backendDir = path.join(__dirname, '..', 'backend');

  if (!fs.existsSync(path.join(backendDir, 'artisan'))) {
    console.warn('[setup] backend/artisan introuvable — skip du seeder E2E');
    return;
  }

  try {
    execSync('php artisan db:seed --class=E2ESeeder --env=testing --force', {
      cwd: backendDir,
      stdio: 'inherit',
      timeout: 60_000,
    });
    console.info('[setup] E2ESeeder exécuté avec succès');
  } catch (err) {
    console.error('[setup] Échec du seeder E2E :', err);
    // Ne pas bloquer les tests si le seeder échoue (env partiel)
  }
});

// ---------------------------------------------------------------------------
// Étape 1 — Authentifier les 10 rôles
// ---------------------------------------------------------------------------

const ROLES: RoleKey[] = [
  'superadmin',
  'admin',
  'dirigeant',
  'secretaire',
  'auditeur',
  'rh_manager',
  'comptable',
  'chef_projet',
  'technicien_qualite',
  'visiteur_externe',
];

for (const role of ROLES) {
  setup(`Sauvegarder état auth — ${role}`, async () => {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const browser = await chromium.launch();
    const context = await browser.newContext({
      baseURL: process.env.E2E_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:8000',
      locale: 'fr-FR',
      timezoneId: 'Africa/Abidjan',
    });
    const page = await context.newPage();

    try {
      await saveAuthState(page, role);
      console.info(`[setup] Auth state sauvegardé pour le rôle "${role}"`);
    } catch (err) {
      console.error(`[setup] Impossible de s'authentifier en tant que "${role}":`, err);
      // Créer un state vide pour ne pas bloquer les autres rôles
      const emptyState = { cookies: [], origins: [] };
      fs.writeFileSync(
        path.join(AUTH_DIR, `${role}.json`),
        JSON.stringify(emptyState, null, 2),
      );
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
