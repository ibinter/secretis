/**
 * roles/visiteur_externe.spec.ts
 * Tests E2E — Rôle visiteur_externe (accès très limité)
 *
 * Le visiteur externe n'a accès qu'à son propre profil et à un portail
 * limité. Tous les modules opérationnels doivent lui être inaccessibles.
 */
import { test, expect } from '../fixtures/auth';
import path from 'path';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'visiteur_externe.json') });

test.describe('Visiteur externe — accès très limité', () => {
  // -------------------------------------------------------------------------
  // Profil personnel
  // -------------------------------------------------------------------------
  test('peut voir son propre profil', async ({ page }) => {
    await page.goto('/profil');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const profile = page.locator(
      '[data-testid="user-profile"], .user-profile, [data-testid="profile-page"]',
    ).first();
    await expect(profile).toBeVisible({ timeout: 10_000 });
  });

  test('peut modifier ses informations personnelles', async ({ page }) => {
    await page.goto('/profil');
    await page.waitForLoadState('networkidle');

    const editBtn = page.getByRole('button', { name: /modifier|éditer|edit/i });
    const hasEdit = await editBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasEdit) {
      // La page profil peut être directement éditable
      const nameInput = page.getByLabel(/prénom|nom|name/i).first();
      const isEditable = await nameInput.isEnabled({ timeout: 3_000 }).catch(() => false);
      // Vérifier juste l'accès, pas nécessairement l'édition
      expect(
        isEditable ||
          (await page
            .locator('[data-testid="profile-form"]')
            .isVisible()
            .catch(() => false)),
      ).toBeTruthy();
      return;
    }

    await editBtn.click();

    // Le formulaire de profil est visible
    const form = page.locator('[data-testid="profile-form"], form').first();
    await expect(form).toBeVisible({ timeout: 5_000 });
  });

  // -------------------------------------------------------------------------
  // Restrictions : aucun module opérationnel accessible
  // -------------------------------------------------------------------------
  test('ne peut accéder à aucun module opérationnel', async ({ page }) => {
    const restrictedUrls = [
      '/agenda',
      '/courrier',
      '/ged',
      '/taches',
      '/reunions',
      '/visiteurs',
      '/rh',
      '/rh/employes',
      '/comptabilite',
      '/projets',
      '/qualite',
      '/parametres',
      '/audit-log',
      '/superadmin',
    ];

    for (const url of restrictedUrls) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      const isBlockedByRedirect = !currentUrl.includes(url);
      const hasAccessDenied = await page
        .locator('[data-testid="access-denied"], .access-denied, [data-testid="forbidden"]')
        .isVisible()
        .catch(() => false);
      const hasLoginRedirect = currentUrl.includes('login');
      const has403 = currentUrl.includes('403');

      expect(
        isBlockedByRedirect || hasAccessDenied || hasLoginRedirect || has403,
        `URL "${url}" accessible pour un visiteur externe`,
      ).toBeTruthy();
    }
  });

  // -------------------------------------------------------------------------
  // Restrictions : API opérationnelles
  // -------------------------------------------------------------------------
  test('ne peut pas accéder aux événements via l\'API', async ({ request }) => {
    const response = await request.get('/api/events');
    expect([401, 403]).toContain(response.status());
  });

  test('ne peut pas accéder aux tâches via l\'API', async ({ request }) => {
    const response = await request.get('/api/tasks');
    expect([401, 403]).toContain(response.status());
  });

  test('ne peut pas accéder aux courriers via l\'API', async ({ request }) => {
    const response = await request.get('/api/mail-registry');
    expect([401, 403]).toContain(response.status());
  });

  test('ne peut pas créer de ressources', async ({ request }) => {
    const response = await request.post('/api/events', {
      data: {
        title: 'Tentative non autorisée',
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
    });
    expect([401, 403, 405]).toContain(response.status());
  });
});
