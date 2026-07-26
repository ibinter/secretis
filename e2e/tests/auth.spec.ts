/**
 * auth.spec.ts
 * Tests E2E — Authentification SECRETIS ERP
 *
 * Couvre :
 *  - Connexion valide
 *  - Mauvais mot de passe
 *  - Verrouillage après 5 tentatives
 *  - Réinitialisation mot de passe (flow complet)
 *  - Déconnexion
 *  - Accès page protégée sans auth
 *  - MFA TOTP simulé
 */
import { test, expect } from '@playwright/test';
import * as OTPAuth from 'otpauth'; // npm install otpauth

// Ces tests utilisent une page SANS état d'auth sauvegardé
test.use({ storageState: { cookies: [], origins: [] } });

// -----------------------------------------------------------------------
// Helpers locaux
// -----------------------------------------------------------------------

async function fillLoginForm(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/mot de passe|password/i).fill(password);
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

test.describe('Authentification', () => {
  // --------------------------------------------------------------------
  // 1. Connexion avec identifiants valides
  // --------------------------------------------------------------------
  test('connexion valide → redirigé vers le dashboard', async ({ page }) => {
    await fillLoginForm(
      page,
      process.env.TEST_ADMIN_EMAIL ?? 'admin@test-secretis.ci',
      process.env.TEST_ADMIN_PASSWORD ?? 'Admin@Test2024!',
    );

    await page.getByRole('button', { name: /connexion|se connecter/i }).click();

    // Doit atterrir sur le dashboard
    await expect(page).toHaveURL(/dashboard|accueil/, { timeout: 15_000 });

    // Le nom de l'utilisateur est visible dans le header
    await expect(page.getByTestId('user-menu')).toBeVisible();
  });

  // --------------------------------------------------------------------
  // 2. Mauvais mot de passe → message d'erreur
  // --------------------------------------------------------------------
  test('mauvais mot de passe → message d\'erreur visible', async ({ page }) => {
    await fillLoginForm(
      page,
      process.env.TEST_ADMIN_EMAIL ?? 'admin@test-secretis.ci',
      'MauvaisMotDePasse123!',
    );

    await page.getByRole('button', { name: /connexion|se connecter/i }).click();

    // Doit rester sur /login
    await expect(page).toHaveURL(/login/);

    // Message d'erreur Laravel (auth.failed)
    const errorMsg = page.locator('[data-testid="auth-error"], .alert-error, [role="alert"]');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/identifiants|incorrect|failed/i);
  });

  // --------------------------------------------------------------------
  // 3. 5 tentatives échouées → compte bloqué (rate-limit Laravel)
  // --------------------------------------------------------------------
  test('5 tentatives échouées → message de verrouillage', async ({ page }) => {
    const badEmail = `bruteforce-${Date.now()}@test-secretis.ci`;

    for (let i = 0; i < 5; i++) {
      await fillLoginForm(page, badEmail, `WrongPwd${i}!`);
      await page.getByRole('button', { name: /connexion|se connecter/i }).click();
      // Courte pause pour laisser le serveur traiter
      await page.waitForTimeout(300);
    }

    // 6e tentative : doit déclencher le rate limit (HTTP 429)
    await fillLoginForm(page, badEmail, 'AnotherWrongPwd!');
    await page.getByRole('button', { name: /connexion|se connecter/i }).click();

    const errorMsg = page.locator('[data-testid="auth-error"], .alert-error, [role="alert"]');
    await expect(errorMsg).toBeVisible({ timeout: 10_000 });

    // Le message de throttle contient "secondes" ou "minutes"
    await expect(errorMsg).toContainText(/secondes|minutes|trop de tentatives|throttle/i);
  });

  // --------------------------------------------------------------------
  // 4. Réinitialisation du mot de passe (flow complet simulé)
  // --------------------------------------------------------------------
  test('flow réinitialisation mot de passe — demande envoyée', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Cliquer sur "Mot de passe oublié ?"
    await page.getByRole('link', { name: /mot de passe oublié|forgot/i }).click();
    await expect(page).toHaveURL(/forgot|password\/reset/);

    // Remplir l'email
    await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL ?? 'admin@test-secretis.ci');
    await page.getByRole('button', { name: /envoyer|send|réinitialiser/i }).click();

    // Message de confirmation générique (même si email n'existe pas — anti-énumération)
    const successMsg = page.locator('[data-testid="success-message"], .alert-success, [role="status"]');
    await expect(successMsg).toBeVisible({ timeout: 10_000 });
    await expect(successMsg).toContainText(/lien|email|envoyé|recevoir/i);
  });

  test('flow réinitialisation — token invalide → erreur', async ({ page }) => {
    // Simuler l'URL avec un token invalide
    await page.goto('/password/reset/invalid-token-123?email=test@test.ci');
    await page.waitForLoadState('networkidle');

    await page.getByLabel(/^mot de passe|^password/i).first().fill('NouveauMdp@2024!');
    await page.getByLabel(/confirmer|confirm/i).fill('NouveauMdp@2024!');
    await page.getByRole('button', { name: /réinitialiser|reset|valider/i }).click();

    const errorMsg = page.locator('[data-testid="auth-error"], .alert-error, [role="alert"]');
    await expect(errorMsg).toBeVisible({ timeout: 10_000 });
    await expect(errorMsg).toContainText(/token|invalid|expiré/i);
  });

  // --------------------------------------------------------------------
  // 5. Déconnexion → redirection vers login
  // --------------------------------------------------------------------
  test('déconnexion → redirection vers /login', async ({ page, browser }) => {
    // Login d'abord
    const context = await browser.newContext();
    const loggedPage = await context.newPage();

    await fillLoginForm(
      loggedPage,
      process.env.TEST_ADMIN_EMAIL ?? 'admin@test-secretis.ci',
      process.env.TEST_ADMIN_PASSWORD ?? 'Admin@Test2024!',
    );
    await loggedPage.getByRole('button', { name: /connexion|se connecter/i }).click();
    await loggedPage.waitForURL(/dashboard|accueil/, { timeout: 15_000 });

    // Déconnexion via menu utilisateur
    await loggedPage.getByTestId('user-menu').click();
    const logoutBtn = loggedPage.getByRole('menuitem', { name: /déconnexion|se déconnecter|logout/i });
    await logoutBtn.click();

    // Doit revenir sur /login
    await expect(loggedPage).toHaveURL(/login/, { timeout: 10_000 });

    await context.close();
  });

  // --------------------------------------------------------------------
  // 6. Accès page protégée sans auth → redirection login
  // --------------------------------------------------------------------
  test('accès /dashboard sans auth → redirigé vers /login', async ({ page }) => {
    await page.goto('/dashboard');

    // Laravel / Inertia redirige vers /login
    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
  });

  test('accès /agenda sans auth → redirigé vers /login', async ({ page }) => {
    await page.goto('/agenda');
    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
  });

  test('accès /api/events sans auth → 401', async ({ request }) => {
    const response = await request.get('/api/events');
    expect(response.status()).toBe(401);
  });

  // --------------------------------------------------------------------
  // 7. MFA TOTP simulé
  // --------------------------------------------------------------------
  test('MFA TOTP — code valide → accès accordé', async ({ page }) => {
    // Ce test suppose que l'utilisateur MFA est configuré avec un secret connu
    const totpSecret = process.env.TEST_MFA_SECRET ?? 'JBSWY3DPEHPK3PXP';

    await fillLoginForm(
      page,
      process.env.TEST_MFA_EMAIL ?? 'mfa@test-secretis.ci',
      process.env.TEST_MFA_PASSWORD ?? 'MfaUser@Test2024!',
    );
    await page.getByRole('button', { name: /connexion|se connecter/i }).click();

    // Si la page MFA apparaît
    const mfaPage = page.getByTestId('mfa-input');
    const hasMfa = await mfaPage.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasMfa) {
      // Générer un code TOTP valide
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(totpSecret),
        digits: 6,
        period: 30,
      });
      const code = totp.generate();

      await mfaPage.fill(code);
      await page.getByRole('button', { name: /valider|verify|confirmer/i }).click();

      await expect(page).toHaveURL(/dashboard|accueil/, { timeout: 15_000 });
    } else {
      // MFA non activé pour cet utilisateur en env de test — passer le test
      test.skip(true, 'MFA non configuré pour cet environnement de test');
    }
  });

  test('MFA TOTP — code invalide → erreur', async ({ page }) => {
    await fillLoginForm(
      page,
      process.env.TEST_MFA_EMAIL ?? 'mfa@test-secretis.ci',
      process.env.TEST_MFA_PASSWORD ?? 'MfaUser@Test2024!',
    );
    await page.getByRole('button', { name: /connexion|se connecter/i }).click();

    const mfaPage = page.getByTestId('mfa-input');
    const hasMfa = await mfaPage.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasMfa) {
      await mfaPage.fill('000000'); // code invalide
      await page.getByRole('button', { name: /valider|verify|confirmer/i }).click();

      const errorMsg = page.locator('[data-testid="mfa-error"], .alert-error, [role="alert"]');
      await expect(errorMsg).toBeVisible({ timeout: 10_000 });
    } else {
      test.skip(true, 'MFA non configuré pour cet environnement de test');
    }
  });
});
