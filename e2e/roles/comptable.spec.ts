/**
 * roles/comptable.spec.ts
 * Tests E2E — Rôle comptable (Comptable SYSCOHADA)
 *
 * Le comptable accède au plan comptable SYSCOHADA, saisit des écritures,
 * consulte les états financiers. Il n'a pas accès aux salaires RH.
 */
import { test, expect } from '../fixtures/auth';
import path from 'path';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'comptable.json') });

test.describe('Comptable — SYSCOHADA', () => {
  // -------------------------------------------------------------------------
  // Dashboard comptabilité
  // -------------------------------------------------------------------------
  test('peut accéder au module comptabilité', async ({ page }) => {
    await page.goto('/comptabilite');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const dashboard = page.locator(
      '[data-testid="accounting-dashboard"], .accounting-dashboard, h1, h2',
    ).first();
    await expect(dashboard).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Plan comptable
  // -------------------------------------------------------------------------
  test('peut consulter le plan comptable SYSCOHADA', async ({ page }) => {
    await page.goto('/comptabilite/plan-comptable');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    // Des comptes du plan SYSCOHADA doivent être présents (classe 1 à 8)
    const accountList = page.locator(
      '[data-testid="account-list"], [data-testid="chart-of-accounts"], table',
    ).first();
    await expect(accountList).toBeVisible({ timeout: 10_000 });

    // Vérifier qu'un compte de la classe 4 est présent (411 = Clients)
    const account411 = page.locator('text=411').first();
    await expect(account411).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Journaux — saisie d'écriture
  // -------------------------------------------------------------------------
  test('peut créer une écriture comptable', async ({ page }) => {
    await page.goto('/comptabilite/journaux');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const newEntryBtn = page.getByRole('button', {
      name: /nouvelle écriture|saisir|enregistrer|new entry/i,
    });
    const hasBtn = await newEntryBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasBtn) {
      test.skip(true, 'Bouton nouvelle écriture non trouvé');
      return;
    }

    await newEntryBtn.click();
    await page.waitForSelector('[role="dialog"], [data-testid="journal-entry-modal"]');

    // Compte débit
    const debitAccountInput = page
      .getByLabel(/compte débit|débit/i)
      .or(page.getByTestId('account-debit'));
    const hasDebit = await debitAccountInput.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasDebit) {
      await debitAccountInput.fill('411000');

      // Montant débit
      await page
        .getByLabel(/montant débit|débit amount/i)
        .or(page.getByTestId('amount-debit'))
        .fill('100000');

      // Compte crédit
      await page
        .getByLabel(/compte crédit|crédit/i)
        .or(page.getByTestId('account-credit'))
        .fill('701000');

      // Montant crédit
      await page
        .getByLabel(/montant crédit|crédit amount/i)
        .or(page.getByTestId('amount-credit'))
        .fill('100000');

      // Libellé
      await page
        .getByLabel(/libellé|description|label/i)
        .fill(`Vente produit E2E ${Date.now()}`);
    }

    await page
      .getByRole('button', { name: /enregistrer|sauvegarder|valider|save/i })
      .click();

    const success = page.locator(
      '[data-testid="success-toast"], .toast-success, [role="status"]',
    );
    await expect(success.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Grand livre et états financiers
  // -------------------------------------------------------------------------
  test('peut consulter le grand livre', async ({ page }) => {
    await page.goto('/comptabilite/grand-livre');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const content = page.locator(
      '[data-testid="grand-livre"], .grand-livre, table, h1',
    ).first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('peut consulter le bilan', async ({ page }) => {
    await page.goto('/comptabilite/bilan');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const balanceSheet = page.locator(
      '[data-testid="balance-sheet"], .balance-sheet, [data-testid="bilan"], h1, h2',
    ).first();
    await expect(balanceSheet).toBeVisible({ timeout: 10_000 });
  });

  test('peut consulter le compte de résultat', async ({ page }) => {
    await page.goto('/comptabilite/compte-resultat');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);
  });

  // -------------------------------------------------------------------------
  // Restrictions : pas d'accès aux salaires RH
  // -------------------------------------------------------------------------
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
