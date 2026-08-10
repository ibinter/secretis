/**
 * auth.setup.ts
 * Projet "setup" dans playwright.config.ts
 * Pré-crée les états d'auth pour chaque rôle afin d'éviter de se connecter
 * à chaque test (gain de performance significatif).
 */
import { test as setup } from '@playwright/test';
import { saveAuthState } from '../fixtures/auth.fixture';

setup('Créer état auth admin', async ({ page }) => {
  await saveAuthState(page, 'admin');
});

setup('Créer état auth secrétaire', async ({ page }) => {
  await saveAuthState(page, 'secretary');
});

setup('Créer état auth manager', async ({ page }) => {
  await saveAuthState(page, 'manager');
});

setup('Créer état auth directeur', async ({ page }) => {
  await saveAuthState(page, 'director');
});

setup('Créer état auth réceptionniste', async ({ page }) => {
  await saveAuthState(page, 'receptionist');
});
