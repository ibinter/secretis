/**
 * global.teardown.ts
 * Projet "cleanup" dans playwright.config.ts — s'exécute après toute la suite.
 *
 * Supprime les données créées pendant les tests E2E (organization_id=999)
 * via la commande artisan dédiée. Ne s'exécute qu'en environnement "testing".
 */

import { test as teardown } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

teardown('Nettoyer les données E2E', async () => {
  const backendDir = path.join(__dirname, '..', 'backend');

  if (!fs.existsSync(path.join(backendDir, 'artisan'))) {
    console.warn('[teardown] backend/artisan introuvable — skip du nettoyage E2E');
    return;
  }

  try {
    execSync('php artisan secretis:clean-e2e-data --env=testing --force', {
      cwd: backendDir,
      stdio: 'inherit',
      timeout: 30_000,
    });
    console.info('[teardown] Données E2E supprimées avec succès');
  } catch (err) {
    console.error('[teardown] Échec du nettoyage E2E :', err);
  }
});
