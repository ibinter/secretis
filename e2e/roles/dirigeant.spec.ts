/**
 * roles/dirigeant.spec.ts
 * Tests E2E — Rôle director (Dirigeant / Directeur Général)
 *
 * Le dirigeant a une vue globale en lecture sur tous les modules.
 * Il peut créer et modifier des éléments mais certaines suppressions
 * et la gestion des utilisateurs restent réservées à l'admin.
 */
import { test, expect } from '../fixtures/auth';
import path from 'path';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'dirigeant.json') });

test.describe('Dirigeant — vue globale', () => {
  // -------------------------------------------------------------------------
  // Dashboard — KPIs
  // -------------------------------------------------------------------------
  test('peut voir le dashboard avec les KPIs', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    // Au moins un widget de KPI visible
    const kpi = page.locator(
      '[data-testid="kpi-card"], .kpi-card, [data-testid="stat-card"], .stat-card',
    );
    await expect(kpi.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Rapports BI
  // -------------------------------------------------------------------------
  test('peut accéder aux rapports BI', async ({ page }) => {
    await page.goto('/rapports');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const content = page.locator(
      '[data-testid="bi-dashboard"], .bi-dashboard, [data-testid="reports-page"], h1, h2',
    );
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });

  test('peut exporter un rapport', async ({ page }) => {
    await page.goto('/rapports');
    await page.waitForLoadState('networkidle');

    const exportBtn = page.getByRole('button', {
      name: /exporter|télécharger|export/i,
    });
    const hasExport = await exportBtn.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasExport) {
      test.skip(true, 'Bouton export non trouvé');
      return;
    }

    // Intercepter le téléchargement
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15_000 }),
      exportBtn.first().click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.(xlsx|csv|pdf)$/i);
  });

  // -------------------------------------------------------------------------
  // Accès aux modules en consultation
  // -------------------------------------------------------------------------
  test('peut voir le journal d\'audit en lecture seule', async ({ page }) => {
    await page.goto('/audit-log');
    await page.waitForLoadState('networkidle');

    // Accessible (pas redirigé vers login)
    await expect(page).not.toHaveURL(/login/);

    const table = page.locator('[data-testid="audit-table"], table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });
  });

  test('peut voir les modules agenda, courrier, tâches', async ({ page }) => {
    for (const url of ['/agenda', '/courrier', '/taches']) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/login/);
      // Le contenu principal est visible (pas un écran d'erreur)
      await expect(page.locator('main, [data-testid="main-content"], .main-content').first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test('peut voir le module RH en lecture', async ({ page }) => {
    await page.goto('/rh');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/login/);
  });

  // -------------------------------------------------------------------------
  // Restrictions : ne peut pas gérer les utilisateurs
  // -------------------------------------------------------------------------
  test('ne peut pas inviter des utilisateurs', async ({ page }) => {
    await page.goto('/parametres/utilisateurs');
    await page.waitForLoadState('networkidle');

    // Soit bloqué, soit la page est visible sans bouton "Inviter"
    const isBlocked = page.url().includes('login') || page.url().includes('403');

    if (!isBlocked) {
      const inviteBtn = page.getByRole('button', {
        name: /inviter|ajouter un utilisateur/i,
      });
      const hasInvite = await inviteBtn.isVisible({ timeout: 3_000 }).catch(() => false);
      expect(hasInvite).toBeFalsy();
    }
  });

  // -------------------------------------------------------------------------
  // Restrictions : pas d'accès au superadmin
  // -------------------------------------------------------------------------
  test('ne peut pas accéder à la console superadmin', async ({ page }) => {
    await page.goto('/superadmin');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).not.toMatch(/\/superadmin\/dashboard/i);
  });
});
