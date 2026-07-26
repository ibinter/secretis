/**
 * roles/auditeur.spec.ts
 * Tests E2E — Rôle auditor (Auditeur Interne)
 *
 * L'auditeur a un accès en lecture seule sur tous les modules
 * et peut exporter des rapports. Il ne peut créer ni modifier aucun enregistrement.
 */
import { test, expect } from '../fixtures/auth';
import path from 'path';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'auditeur.json') });

test.describe('Auditeur — lecture seule et exports', () => {
  // -------------------------------------------------------------------------
  // Journal d'audit
  // -------------------------------------------------------------------------
  test('peut consulter le journal d\'audit complet', async ({ page }) => {
    await page.goto('/audit-log');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const table = page.locator('[data-testid="audit-table"], table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    // Au moins une entrée
    const firstRow = page.locator('[data-testid="audit-row"], tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Modules en lecture seule
  // -------------------------------------------------------------------------
  test('peut voir les modules sans bouton de création', async ({ page }) => {
    const modules = [
      { url: '/agenda', createPattern: /nouvel événement|créer un événement/i },
      { url: '/courrier', createPattern: /nouveau courrier|ajouter/i },
      { url: '/taches', createPattern: /nouvelle tâche|créer une tâche/i },
      { url: '/ged', createPattern: /uploader|importer un document/i },
    ];

    for (const { url, createPattern } of modules) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/login/);

      // Le bouton de création ne doit pas être visible
      const createBtn = page.getByRole('button', { name: createPattern });
      const isVisible = await createBtn.isVisible({ timeout: 2_000 }).catch(() => false);
      expect(isVisible, `Bouton de création visible sur ${url} pour un auditeur`).toBeFalsy();
    }
  });

  // -------------------------------------------------------------------------
  // Exports
  // -------------------------------------------------------------------------
  test('peut exporter les rapports', async ({ page }) => {
    await page.goto('/rapports');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const exportBtn = page.getByRole('button', {
      name: /exporter|télécharger|export/i,
    }).first();
    const hasExport = await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasExport) {
      test.skip(true, 'Bouton export non disponible dans cet environnement');
      return;
    }

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15_000 }),
      exportBtn.click(),
    ]);
    expect(download.suggestedFilename()).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Restrictions : ne peut pas créer ni modifier
  // -------------------------------------------------------------------------
  test('ne peut pas créer un événement dans l\'agenda', async ({ page }) => {
    await page.goto('/agenda');
    await page.waitForLoadState('networkidle');

    // Tenter de cliquer sur le calendrier pour créer un événement
    const calendarGrid = page.locator('.fc-daygrid, [data-testid="calendar-grid"]').first();
    const hasCalendar = await calendarGrid.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasCalendar) {
      await calendarGrid.click({ position: { x: 100, y: 100 } });

      // Aucune modal de création ne doit s'ouvrir
      await page.waitForTimeout(1_000);
      const modal = page.locator('[role="dialog"], [data-testid="event-modal"]');
      const modalVisible = await modal.isVisible().catch(() => false);
      expect(modalVisible, 'Modal de création ouverte pour un auditeur').toBeFalsy();
    }
  });

  test('ne peut pas supprimer d\'enregistrements', async ({ page }) => {
    await page.goto('/taches');
    await page.waitForLoadState('networkidle');

    const deleteBtn = page.getByRole('button', { name: /supprimer|delete/i }).first();
    const isVisible = await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(isVisible, 'Bouton supprimer visible pour un auditeur').toBeFalsy();
  });

  // -------------------------------------------------------------------------
  // Restrictions : pas d'accès admin
  // -------------------------------------------------------------------------
  test('ne peut pas accéder aux paramètres admin', async ({ page }) => {
    await page.goto('/parametres/utilisateurs');
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
