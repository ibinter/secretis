/**
 * roles/superadmin.spec.ts
 * Tests E2E — Rôle superadmin_ibig (employés IBIG uniquement)
 *
 * Le superadmin a accès à toutes les organisations, au CRM prospects,
 * aux feature flags, et au monitoring de la plateforme.
 * Aucun utilisateur d'organisation cliente ne doit pouvoir accéder à ces routes.
 */
import { test, expect } from '../fixtures/auth';
import path from 'path';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'superadmin.json') });

test.describe('SuperAdmin — rôle superadmin_ibig', () => {
  // -------------------------------------------------------------------------
  // Dashboard superadmin
  // -------------------------------------------------------------------------
  test('peut accéder au dashboard superadmin', async ({ page }) => {
    await page.goto('/superadmin');
    await page.waitForLoadState('networkidle');

    // Doit atterrir sur le dashboard superadmin (pas redirigé vers /login)
    await expect(page).not.toHaveURL(/login/);

    const dashboard = page.locator(
      '[data-testid="superadmin-dashboard"], .superadmin-dashboard, h1',
    );
    await expect(dashboard.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Liste des organisations
  // -------------------------------------------------------------------------
  test('peut voir la liste de toutes les organisations', async ({ page }) => {
    await page.goto('/superadmin/organisations');
    await page.waitForLoadState('networkidle');

    const table = page.locator('[data-testid="org-table"], table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    // Les données de démo doivent être présentes (au moins une ligne)
    const firstRow = page.locator('[data-testid="org-row"], tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
  });

  test('peut voir le détail d\'une organisation', async ({ page }) => {
    await page.goto('/superadmin/organisations');
    await page.waitForLoadState('networkidle');

    // Cliquer sur le bouton "Voir" de la première ligne
    const viewBtn = page
      .locator('[data-testid="org-row"], tbody tr')
      .first()
      .getByRole('link', { name: /voir|détail|consulter/i })
      .or(
        page
          .locator('[data-testid="org-row"], tbody tr')
          .first()
          .locator('[data-testid="view-btn"], .view-btn'),
      );

    const hasViewBtn = await viewBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasViewBtn) {
      // Cliquer directement sur la ligne
      await page
        .locator('[data-testid="org-row"], tbody tr')
        .first()
        .click();
    } else {
      await viewBtn.click();
    }

    const profile = page.locator(
      '[data-testid="org-profile"], .org-profile, [data-testid="org-detail"]',
    );
    await expect(profile.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Feature flags
  // -------------------------------------------------------------------------
  test('peut voir et basculer les feature flags', async ({ page }) => {
    await page.goto('/superadmin/feature-flags');
    await page.waitForLoadState('networkidle');

    const table = page.locator(
      '[data-testid="feature-flags-table"], table',
    ).first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    // Basculer le premier toggle et vérifier le changement d'état
    const firstToggle = page
      .locator('[data-testid="flag-toggle"], [role="switch"]')
      .first();

    const initialChecked = await firstToggle.getAttribute('aria-checked');

    await firstToggle.click();

    // Attendre la réponse API (PATCH ou POST)
    await page.waitForResponse(
      (resp) =>
        resp.url().includes('feature-flag') &&
        ['PATCH', 'POST', 'PUT'].includes(resp.request().method()),
      { timeout: 10_000 },
    );

    const expectedChecked = initialChecked === 'true' ? 'false' : 'true';
    await expect(firstToggle).toHaveAttribute('aria-checked', expectedChecked);

    // Remettre dans l'état d'origine
    await firstToggle.click();
    await page.waitForTimeout(500);
  });

  // -------------------------------------------------------------------------
  // CRM prospects
  // -------------------------------------------------------------------------
  test('peut accéder au CRM prospects', async ({ page }) => {
    await page.goto('/superadmin/crm/prospects');
    await page.waitForLoadState('networkidle');

    const board = page.locator(
      '[data-testid="prospects-board"], .prospects-board, .kanban-board',
    );
    const list = page.locator('[data-testid="prospects-list"], table');

    const isVisible =
      (await board.isVisible({ timeout: 5_000 }).catch(() => false)) ||
      (await list.isVisible({ timeout: 5_000 }).catch(() => false));

    expect(isVisible).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Monitoring
  // -------------------------------------------------------------------------
  test('peut accéder au monitoring de la plateforme', async ({ page }) => {
    await page.goto('/superadmin/monitoring');
    await page.waitForLoadState('networkidle');

    const dashboard = page.locator(
      '[data-testid="monitoring-dashboard"], .monitoring-dashboard',
    );
    await expect(dashboard.first()).toBeVisible({ timeout: 10_000 });

    // Indicateur de santé base de données
    const dbHealth = page.locator(
      '[data-testid="health-database"], [data-testid="health-db"], .health-indicator',
    );
    await expect(dbHealth.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Sécurité : un admin org ne peut PAS accéder au superadmin
  // -------------------------------------------------------------------------
  test('un admin org est bloqué sur /superadmin', async ({ browser }) => {
    const authFile = path.join(__dirname, '..', '.auth', 'admin.json');
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();

    await page.goto('/superadmin');
    await page.waitForLoadState('networkidle');

    // Doit être redirigé vers login ou dashboard (jamais /superadmin)
    const url = page.url();
    expect(url).not.toMatch(/\/superadmin\/dashboard/i);
    const isBlocked =
      url.includes('login') ||
      url.includes('dashboard') ||
      url.includes('403') ||
      (await page.locator('[data-testid="access-denied"], .access-denied').isVisible().catch(() => false));

    expect(isBlocked).toBeTruthy();

    await context.close();
  });
});
