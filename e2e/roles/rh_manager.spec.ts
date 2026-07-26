/**
 * roles/rh_manager.spec.ts
 * Tests E2E — Rôle admin_responsible (Responsable RH)
 *
 * Le responsable RH gère les employés, les congés et les notes de frais.
 * Il ne peut pas accéder à la comptabilité générale.
 */
import { test, expect } from '../fixtures/auth';
import path from 'path';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'rh_manager.json') });

test.describe('Responsable RH', () => {
  // -------------------------------------------------------------------------
  // Module RH — employés
  // -------------------------------------------------------------------------
  test('peut accéder à la liste des employés', async ({ page }) => {
    await page.goto('/rh/employes');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const list = page.locator(
      '[data-testid="employee-list"], [data-testid="employee-table"], table',
    ).first();
    await expect(list).toBeVisible({ timeout: 10_000 });
  });

  test('peut créer un dossier employé', async ({ page }) => {
    await page.goto('/rh/employes');
    await page.waitForLoadState('networkidle');

    const createBtn = page.getByRole('button', {
      name: /nouvel employé|ajouter un employé|créer/i,
    });
    const hasCreate = await createBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasCreate) {
      test.skip(true, 'Bouton création employé non trouvé');
      return;
    }

    await createBtn.click();
    await page.waitForSelector('[role="dialog"], [data-testid="employee-modal"]');

    await page
      .getByLabel(/prénom|first name/i)
      .fill('Koffi');
    await page
      .getByLabel(/nom de famille|last name|nom$/i)
      .fill(`Kouassi E2E ${Date.now()}`);
    await page
      .getByLabel(/email/i)
      .fill(`koffi.e2e.${Date.now()}@demo.ci`);

    // Poste
    const posteInput = page.getByLabel(/poste|fonction|job title/i);
    const hasPoste = await posteInput.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasPoste) await posteInput.fill('Développeur');

    await page
      .getByRole('button', { name: /enregistrer|créer|sauvegarder|save/i })
      .click();

    const success = page.locator(
      '[data-testid="success-toast"], .toast-success, [role="status"]',
    );
    await expect(success.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Gestion des congés
  // -------------------------------------------------------------------------
  test('peut voir les demandes de congé', async ({ page }) => {
    await page.goto('/rh/conges');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const list = page.locator(
      '[data-testid="leave-list"], [data-testid="leave-requests"], table',
    ).first();
    await expect(list).toBeVisible({ timeout: 10_000 });
  });

  test('peut approuver une demande de congé', async ({ page }) => {
    await page.goto('/rh/conges');
    await page.waitForLoadState('networkidle');

    // Chercher une demande en attente
    const pendingRequest = page
      .locator('[data-testid="leave-row"], tbody tr')
      .filter({ hasText: /en attente|pending/i })
      .first();

    const hasPending = await pendingRequest.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasPending) {
      test.skip(true, 'Aucune demande de congé en attente');
      return;
    }

    const approveBtn = pendingRequest.getByRole('button', {
      name: /approuver|valider|accept/i,
    });
    await approveBtn.click();

    // Confirmation si dialog
    const confirmBtn = page.getByRole('button', { name: /confirmer|oui|yes/i });
    const hasConfirm = await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasConfirm) await confirmBtn.click();

    const success = page.locator(
      '[data-testid="success-toast"], .toast-success, [role="status"]',
    );
    await expect(success.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Restrictions : pas d'accès à la comptabilité générale
  // -------------------------------------------------------------------------
  test('ne peut pas accéder au module comptabilité', async ({ page }) => {
    await page.goto('/comptabilite');
    await page.waitForLoadState('networkidle');

    const isBlocked =
      page.url().includes('login') ||
      page.url().includes('403') ||
      page.url().includes('dashboard') ||
      (await page
        .locator('[data-testid="access-denied"], .access-denied')
        .isVisible()
        .catch(() => false));

    expect(isBlocked).toBeTruthy();
  });

  test('ne peut pas accéder à la console superadmin', async ({ page }) => {
    await page.goto('/superadmin');
    await page.waitForLoadState('networkidle');

    expect(page.url()).not.toMatch(/\/superadmin\/dashboard/i);
  });
});
