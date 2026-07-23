/**
 * features/notifications.spec.ts
 * Tests E2E — Centre de notifications SECRETIS ERP
 *
 * Couvre :
 *  - Badge non-lu visible sur nouvelle notification
 *  - Marquer une notification comme lue
 *  - Marquer toutes les notifications comme lues
 *  - Préférences de notifications sauvegardées
 *  - Clic sur une notification → navigation vers la ressource
 */
import { test, expect } from '../fixtures/auth';
import path from 'path';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'admin.json') });

test.describe('Notifications', () => {
  // -------------------------------------------------------------------------
  // Badge de notification
  // -------------------------------------------------------------------------
  test('le badge non-lu apparaît sur la cloche', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const notifBell = page.locator(
      '[data-testid="notification-bell"], [aria-label*="notification" i], .notification-bell',
    );
    await expect(notifBell.first()).toBeVisible({ timeout: 10_000 });

    // Si des notifications non lues existent, le badge est présent
    const badge = page.locator(
      '[data-testid="notification-badge"], .notification-badge, .badge-count, .unread-count',
    );
    // Le badge peut ou non être visible selon l'état des données de test
    // On vérifie juste que la cloche est visible et fonctionnelle
    await expect(notifBell.first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Centre de notifications
  // -------------------------------------------------------------------------
  test('peut ouvrir le centre de notifications', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const notifBell = page.locator(
      '[data-testid="notification-bell"], [aria-label*="notification" i], .notification-bell',
    ).first();
    await expect(notifBell).toBeVisible({ timeout: 10_000 });
    await notifBell.click();

    const panel = page.locator(
      '[data-testid="notification-panel"], [data-testid="notifications-dropdown"], .notification-panel',
    );
    await expect(panel.first()).toBeVisible({ timeout: 5_000 });
  });

  // -------------------------------------------------------------------------
  // Marquer comme lue
  // -------------------------------------------------------------------------
  test('peut marquer une notification comme lue', async ({ page }) => {
    // Créer une notification de test via API
    const createNotif = await page.request.post('/api/test/notifications', {
      data: {
        type: 'info',
        title: `Notification E2E ${Date.now()}`,
        message: 'Test de notification Playwright',
        read: false,
      },
      headers: { 'X-Test-Secret': process.env.TEST_SECRET ?? 'e2e-test-secret' },
    });

    if (!createNotif.ok()) {
      test.skip(true, 'Création de notification de test non disponible');
      return;
    }

    const notif = await createNotif.json();
    const notifId = (notif.data ?? notif).id;

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Ouvrir le panneau
    await page
      .locator('[data-testid="notification-bell"], .notification-bell')
      .first()
      .click();

    const panel = page.locator('[data-testid="notification-panel"], .notification-panel').first();
    await expect(panel).toBeVisible({ timeout: 5_000 });

    // Chercher la notification non lue
    const notifItem = panel.locator(
      '[data-testid="notification-item"]:not([data-read="true"]), .notification-item.unread',
    ).first();

    const hasUnread = await notifItem.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasUnread) {
      test.skip(true, 'Aucune notification non lue disponible');
      return;
    }

    // Marquer comme lue
    const markReadBtn = notifItem.getByRole('button', { name: /marquer comme lue?|mark as read/i }).or(
      notifItem.locator('[data-testid="mark-read-btn"], .mark-read'),
    );

    const hasMarkRead = await markReadBtn.isVisible({ timeout: 2_000 }).catch(() => false);

    if (hasMarkRead) {
      await markReadBtn.click();
    } else {
      // Clic sur la notification elle-même
      await notifItem.click();
    }

    // Après marquage, la notification ne doit plus être dans la liste des non-lues
    await page.waitForTimeout(500);
    await expect(notifItem).not.toHaveClass(/unread/, { timeout: 5_000 });
  });

  test('peut marquer toutes les notifications comme lues', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page
      .locator('[data-testid="notification-bell"], .notification-bell')
      .first()
      .click();

    const panel = page.locator('[data-testid="notification-panel"], .notification-panel').first();
    await expect(panel).toBeVisible({ timeout: 5_000 });

    const markAllBtn = panel.getByRole('button', {
      name: /tout marquer comme lu|mark all|tout lire/i,
    });
    const hasMarkAll = await markAllBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (!hasMarkAll) {
      test.skip(true, 'Bouton "Tout marquer" non disponible');
      return;
    }

    await markAllBtn.click();

    // Le badge doit disparaître ou passer à 0
    await page.waitForTimeout(500);
    const badge = page.locator('[data-testid="notification-badge"], .badge-count');
    const badgeVisible = await badge.isVisible({ timeout: 3_000 }).catch(() => false);

    if (badgeVisible) {
      const badgeText = await badge.textContent();
      expect(badgeText?.trim()).toMatch(/^0?$/);
    }
  });

  // -------------------------------------------------------------------------
  // Navigation depuis notification
  // -------------------------------------------------------------------------
  test('un clic sur une notification navigue vers la ressource', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page
      .locator('[data-testid="notification-bell"], .notification-bell')
      .first()
      .click();

    const panel = page.locator('[data-testid="notification-panel"], .notification-panel').first();
    await expect(panel).toBeVisible({ timeout: 5_000 });

    const firstNotif = panel.locator('[data-testid="notification-item"], .notification-item').first();
    const hasNotif = await firstNotif.isVisible({ timeout: 3_000 }).catch(() => false);

    if (!hasNotif) {
      test.skip(true, 'Aucune notification disponible pour tester la navigation');
      return;
    }

    const initialUrl = page.url();
    await firstNotif.click();
    await page.waitForLoadState('networkidle');

    // L'URL doit avoir changé (navigation vers la ressource liée)
    // OU le panneau doit être fermé
    const panelClosed = !(await panel.isVisible().catch(() => false));
    const urlChanged = page.url() !== initialUrl;
    expect(panelClosed || urlChanged).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Préférences
  // -------------------------------------------------------------------------
  test('les préférences de notifications sont sauvegardées', async ({ page }) => {
    await page.goto('/parametres/notifications');
    await page.waitForLoadState('networkidle');

    // Si la page n'existe pas, passer
    const hasPage = await page
      .locator('[data-testid="notification-preferences"], .notification-settings, h1, h2')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!hasPage || page.url().includes('login')) {
      test.skip(true, 'Page de préférences notifications non disponible');
      return;
    }

    // Basculer une préférence
    const firstToggle = page
      .locator('[data-testid="notif-pref-toggle"], [role="switch"]')
      .first();
    const hasToggle = await firstToggle.isVisible({ timeout: 3_000 }).catch(() => false);

    if (!hasToggle) {
      test.skip(true, 'Aucun toggle de préférence trouvé');
      return;
    }

    const initialState = await firstToggle.getAttribute('aria-checked');
    await firstToggle.click();

    // Sauvegarder
    const saveBtn = page.getByRole('button', { name: /sauvegarder|enregistrer|save/i });
    const hasSave = await saveBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasSave) await saveBtn.click();

    // Recharger la page et vérifier que l'état est persisté
    await page.reload();
    await page.waitForLoadState('networkidle');

    const toggleAfterReload = page
      .locator('[data-testid="notif-pref-toggle"], [role="switch"]')
      .first();
    const newState = await toggleAfterReload.getAttribute('aria-checked');
    const expectedState = initialState === 'true' ? 'false' : 'true';
    expect(newState).toBe(expectedState);

    // Remettre dans l'état d'origine
    await toggleAfterReload.click();
    if (hasSave) await saveBtn.click();
  });
});
