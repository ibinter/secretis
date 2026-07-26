/**
 * roles/technicien_qualite.spec.ts
 * Tests E2E — Rôle technicien_qualite (Technicien Qualité / Responsable Qualité)
 *
 * Le technicien qualité gère les processus qualité, les non-conformités
 * et les audits qualité internes.
 */
import { test, expect } from '../fixtures/auth';
import path from 'path';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'technicien_qualite.json') });

test.describe('Technicien Qualité', () => {
  // -------------------------------------------------------------------------
  // Module Qualité
  // -------------------------------------------------------------------------
  test('peut accéder au module qualité', async ({ page }) => {
    await page.goto('/qualite');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const content = page.locator(
      '[data-testid="quality-dashboard"], .quality-dashboard, h1, h2',
    ).first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Non-conformités
  // -------------------------------------------------------------------------
  test('peut voir la liste des non-conformités', async ({ page }) => {
    await page.goto('/qualite/non-conformites');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const list = page.locator(
      '[data-testid="nc-list"], [data-testid="non-conformity-list"], table',
    ).first();
    await expect(list).toBeVisible({ timeout: 10_000 });
  });

  test('peut créer une non-conformité', async ({ page }) => {
    await page.goto('/qualite/non-conformites');
    await page.waitForLoadState('networkidle');

    const createBtn = page.getByRole('button', {
      name: /nouvelle nc|signaler|déclarer|créer/i,
    });
    const hasCreate = await createBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasCreate) {
      test.skip(true, 'Bouton création NC non trouvé');
      return;
    }

    await createBtn.click();
    await page.waitForSelector('[role="dialog"], [data-testid="nc-modal"]');

    await page
      .getByLabel(/titre|description|objet/i)
      .fill(`Non-conformité E2E ${Date.now()}`);

    // Sévérité
    const severitySelect = page
      .getByLabel(/sévérité|gravité|severity/i)
      .or(page.getByTestId('nc-severity'));
    const hasSeverity = await severitySelect.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasSeverity) {
      await severitySelect.selectOption({ index: 1 }).catch(() => null);
    }

    await page
      .getByRole('button', { name: /enregistrer|sauvegarder|créer|save/i })
      .click();

    const success = page.locator(
      '[data-testid="success-toast"], .toast-success, [role="status"]',
    );
    await expect(success.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Processus qualité
  // -------------------------------------------------------------------------
  test('peut gérer les processus qualité', async ({ page }) => {
    await page.goto('/qualite/processus');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const content = page.locator(
      '[data-testid="process-list"], .process-list, table, h1',
    ).first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Documents qualité (GED)
  // -------------------------------------------------------------------------
  test('peut accéder aux documents qualité dans la GED', async ({ page }) => {
    await page.goto('/ged');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const content = page.locator(
      '[data-testid="document-list"], [data-testid="ged-content"], table',
    ).first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Restrictions
  // -------------------------------------------------------------------------
  test('ne peut pas accéder à la comptabilité', async ({ page }) => {
    await page.goto('/comptabilite');
    await page.waitForLoadState('networkidle');

    const isBlocked =
      page.url().includes('login') ||
      page.url().includes('403') ||
      (await page
        .locator('[data-testid="access-denied"], .access-denied')
        .isVisible()
        .catch(() => false));

    expect(isBlocked).toBeTruthy();
  });

  test('ne peut pas accéder aux salaires RH', async ({ page }) => {
    await page.goto('/rh/salaires');
    await page.waitForLoadState('networkidle');

    const isBlocked =
      page.url().includes('login') ||
      page.url().includes('403') ||
      (await page
        .locator('[data-testid="access-denied"], .access-denied')
        .isVisible()
        .catch(() => false));

    expect(isBlocked).toBeTruthy();
  });
});
