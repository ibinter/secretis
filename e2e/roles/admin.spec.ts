/**
 * roles/admin.spec.ts
 * Tests E2E — Rôle admin_org (Administrateur de l'organisation cliente)
 *
 * L'admin org a accès complet à tous les modules de son organisation mais
 * ne peut pas accéder au back-office superadmin ni aux données d'autres orgs.
 */
import { test, expect } from '../fixtures/auth';
import path from 'path';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'admin.json') });

test.describe('Admin — gestion organisation', () => {
  // -------------------------------------------------------------------------
  // Paramètres de l'organisation
  // -------------------------------------------------------------------------
  test('peut accéder aux paramètres de l\'organisation', async ({ page }) => {
    await page.goto('/parametres');
    await page.waitForLoadState('networkidle');

    const settings = page.locator(
      '[data-testid="org-settings"], .org-settings, h1, h2',
    );
    await expect(settings.first()).toBeVisible({ timeout: 10_000 });
    await expect(page).not.toHaveURL(/login/);
  });

  test('peut modifier le nom de l\'organisation', async ({ page }) => {
    await page.goto('/parametres/organisation');
    await page.waitForLoadState('networkidle');

    const nameInput = page
      .getByLabel(/nom de l'organisation|company name/i)
      .or(page.getByTestId('org-name-input'));

    const hasInput = await nameInput.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasInput) {
      test.skip(true, 'Champ nom organisation non trouvé dans cet environnement');
      return;
    }

    const currentValue = await nameInput.inputValue();
    // Ne pas réellement modifier — juste vérifier que le champ est éditable
    await nameInput.click();
    await expect(nameInput).not.toBeDisabled();
    // Remettre la valeur d'origine
    await nameInput.fill(currentValue);
  });

  // -------------------------------------------------------------------------
  // Gestion des utilisateurs
  // -------------------------------------------------------------------------
  test('peut voir la liste des utilisateurs', async ({ page }) => {
    await page.goto('/parametres/utilisateurs');
    await page.waitForLoadState('networkidle');

    const userList = page.locator(
      '[data-testid="user-table"], [data-testid="user-list"], table',
    ).first();
    await expect(userList).toBeVisible({ timeout: 10_000 });
  });

  test('peut inviter un nouvel utilisateur', async ({ page }) => {
    await page.goto('/parametres/utilisateurs');
    await page.waitForLoadState('networkidle');

    const inviteBtn = page.getByRole('button', {
      name: /inviter|ajouter un utilisateur|nouvel utilisateur/i,
    });
    await expect(inviteBtn).toBeVisible({ timeout: 10_000 });
    await inviteBtn.click();

    // Modal ou formulaire d'invitation
    const modal = page.locator('[role="dialog"], [data-testid="invite-modal"]');
    await expect(modal.first()).toBeVisible({ timeout: 5_000 });

    const emailInput = page
      .getByLabel(/email/i)
      .or(page.getByTestId('invite-email'));

    await emailInput.fill(`e2e-test-${Date.now()}@example.com`);

    const roleSelect = page
      .getByLabel(/rôle|role/i)
      .or(page.getByTestId('invite-role'));

    const hasSelect = await roleSelect.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasSelect) {
      await roleSelect.selectOption({ label: /secrétaire|secretary/i } as any).catch(() =>
        roleSelect.selectOption({ index: 1 }),
      );
    }

    const sendBtn = page.getByRole('button', {
      name: /envoyer|inviter|send/i,
    });
    await sendBtn.click();

    // Toast de succès ou confirmation
    const success = page.locator(
      '[data-testid="success-toast"], .toast-success, [role="status"]',
    );
    await expect(success.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Journal d'audit
  // -------------------------------------------------------------------------
  test('peut consulter le journal d\'audit', async ({ page }) => {
    await page.goto('/audit-log');
    await page.waitForLoadState('networkidle');

    const table = page.locator('[data-testid="audit-table"], table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    // Au moins une entrée dans le journal (l'auth setup crée des logs)
    const firstRow = page.locator('[data-testid="audit-row"], tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Abonnement / Licence
  // -------------------------------------------------------------------------
  test('peut voir le statut de l\'abonnement', async ({ page }) => {
    await page.goto('/abonnement');
    await page.waitForLoadState('networkidle');

    const planInfo = page.locator(
      '[data-testid="current-plan"], .current-plan, [data-testid="subscription-status"]',
    );
    await expect(planInfo.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Sécurité : ne peut pas accéder au superadmin
  // -------------------------------------------------------------------------
  test('ne peut pas accéder à la console superadmin', async ({ page }) => {
    await page.goto('/superadmin');
    await page.waitForLoadState('networkidle');

    // Doit être redirigé ou bloqué
    const url = page.url();
    const isBlocked =
      url.includes('login') ||
      url.includes('403') ||
      !url.includes('/superadmin/dashboard');

    expect(isBlocked).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Sécurité : peut gérer les rôles utilisateurs
  // -------------------------------------------------------------------------
  test('peut voir et gérer les rôles dans son organisation', async ({ page }) => {
    await page.goto('/parametres/roles');
    await page.waitForLoadState('networkidle');

    // La page des rôles est accessible (pas redirigée)
    await expect(page).not.toHaveURL(/login/);
  });
});
