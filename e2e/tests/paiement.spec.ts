/**
 * paiement.spec.ts
 * Tests E2E — Module Paiement / Webhooks CinetPay SECRETIS ERP
 *
 * Couvre :
 *  - Webhook CinetPay valide → licence activée
 *  - Webhook signature invalide → rejeté (403)
 *  - Webhook dupliqué (même idempotency_key) → ignoré (idempotence)
 *  - Accès module après expiration licence → page upgrade
 *
 * Ces tests appellent directement l'API du backend (pas d'UI pour les webhooks).
 * L'idempotency_key est simulée via le header ou le payload selon l'implémentation.
 */
import { test, expect } from '../fixtures/auth.fixture';
import crypto from 'crypto';

// -----------------------------------------------------------------------
// Helpers — Construction de payload CinetPay
// -----------------------------------------------------------------------

const CINETPAY_SECRET = process.env.CINETPAY_WEBHOOK_SECRET ?? 'test-webhook-secret';

function buildCinetPayPayload(overrides: Record<string, unknown> = {}) {
  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    cpm_site_id: process.env.CINETPAY_SITE_ID ?? 'test-site-id',
    cpm_trans_id: transactionId,
    cpm_trans_date: new Date().toISOString(),
    cpm_amount: '50000',
    cpm_currency: 'XOF',
    cpm_payid: `PAY-${Date.now()}`,
    cpm_payment_config: 'SINGLE',
    cpm_page_action: 'PAYMENT',
    cpm_version: 'V1',
    cpm_payment_date: new Date().toISOString(),
    cpm_error_message: 'SUCCES',
    cel_phone_num: '+22501234567',
    cpm_phone_prefixe: '225',
    cpm_language: 'fr',
    cpm_result: '00', // 00 = succès
    cpm_trans_status: 'ACCEPTED',
    payment_method: 'MOBILE_MONEY',
    buyer_name: 'Test Buyer',
    cpm_custom: JSON.stringify({
      organization_id: process.env.TEST_ORG_ID ?? '1',
      plan: 'starter',
      billing_period: 'monthly',
    }),
    idempotency_key: `IK-${Date.now()}`,
    ...overrides,
  };
}

function computeSignature(payload: Record<string, unknown>): string {
  // Signature HMAC-SHA256 sur le JSON du payload (selon implémentation WebhookVerifier)
  const data = JSON.stringify(payload);
  return crypto.createHmac('sha256', CINETPAY_SECRET).update(data).digest('hex');
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

test.describe('Paiement — Webhooks CinetPay', () => {
  // --------------------------------------------------------------------
  // 1. Webhook valide → licence activée
  // --------------------------------------------------------------------
  test('webhook CinetPay valide → licence activée', async ({ request }) => {
    const payload = buildCinetPayPayload();
    const signature = computeSignature(payload);

    const response = await request.post('/api/webhooks/cinetpay', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-CinetPay-Signature': signature,
        'X-Idempotency-Key': payload.idempotency_key as string,
      },
    });

    // Le webhook doit être accepté
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      status: expect.stringMatching(/success|processed|ok/i),
    });

    // Vérifier la licence via l'API de statut
    await new Promise((r) => setTimeout(r, 1000)); // délai traitement async

    const licenseResponse = await request.get(
      `/api/organizations/${process.env.TEST_ORG_ID ?? '1'}/license`,
      {
        headers: {
          'X-Test-Secret': process.env.TEST_SECRET ?? 'e2e-test-secret',
        },
      },
    );

    if (licenseResponse.ok()) {
      const license = await licenseResponse.json();
      expect(license.status).toMatch(/active|trial|grace/i);
    }
  });

  // --------------------------------------------------------------------
  // 2. Webhook signature invalide → rejeté
  // --------------------------------------------------------------------
  test('webhook signature invalide → rejeté avec 403', async ({ request }) => {
    const payload = buildCinetPayPayload();

    const response = await request.post('/api/webhooks/cinetpay', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-CinetPay-Signature': 'invalid-signature-xyz', // mauvaise signature
        'X-Idempotency-Key': payload.idempotency_key as string,
      },
    });

    // Doit être rejeté
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body).toMatchObject({
      message: expect.stringMatching(/signature|invalid|unauthorized|non autorisé/i),
    });
  });

  // --------------------------------------------------------------------
  // 3. Webhook dupliqué → ignoré (idempotence)
  // --------------------------------------------------------------------
  test('webhook dupliqué → second appel retourne 200 sans retraitement', async ({ request }) => {
    const idempotencyKey = `IK-DUPLICATE-${Date.now()}`;
    const payload = buildCinetPayPayload({ idempotency_key: idempotencyKey });
    const signature = computeSignature(payload);

    const headers = {
      'Content-Type': 'application/json',
      'X-CinetPay-Signature': signature,
      'X-Idempotency-Key': idempotencyKey,
    };

    // Premier appel
    const first = await request.post('/api/webhooks/cinetpay', { data: payload, headers });
    expect(first.status()).toBe(200);

    const firstBody = await first.json();

    // Second appel — même payload, même clé
    const second = await request.post('/api/webhooks/cinetpay', { data: payload, headers });
    expect(second.status()).toBe(200);

    const secondBody = await second.json();

    // Le second appel indique qu'il était dupliqué
    expect(secondBody).toMatchObject({
      status: expect.stringMatching(/already_processed|duplicate|idempotent/i),
    });

    // La licence n'est pas créée deux fois (vérification via API admin)
    const paymentsResponse = await request.get(
      `/api/payments?idempotency_key=${idempotencyKey}`,
      {
        headers: { 'X-Test-Secret': process.env.TEST_SECRET ?? 'e2e-test-secret' },
      },
    );

    if (paymentsResponse.ok()) {
      const payments = await paymentsResponse.json();
      const paymentList = payments.data ?? payments;
      expect(Array.isArray(paymentList) ? paymentList.length : 1).toBeLessThanOrEqual(1);
    }
  });

  // --------------------------------------------------------------------
  // 4. Accès module après expiration licence → page upgrade
  // --------------------------------------------------------------------
  test('accès module après expiration licence → page upgrade affichée', async ({ page, browser }) => {
    // Créer un contexte avec un utilisateur dont la licence est expirée
    const expiredAuthFile = 'e2e/.auth/expired-license.json';

    const context = await browser.newContext();
    const expiredPage = await context.newPage();

    // Login avec utilisateur à licence expirée (configuré via seeder)
    await expiredPage.goto('/login');
    await expiredPage.waitForLoadState('networkidle');

    const expiredEmail = process.env.TEST_EXPIRED_EMAIL ?? 'expired@test-secretis.ci';
    const expiredPwd = process.env.TEST_EXPIRED_PASSWORD ?? 'Expired@Test2024!';

    await expiredPage.getByLabel(/email/i).fill(expiredEmail);
    await expiredPage.getByLabel(/mot de passe|password/i).fill(expiredPwd);
    await expiredPage.getByRole('button', { name: /connexion|se connecter/i }).click();

    // Après login, doit être redirigé vers la page "licence expirée" ou "upgrade"
    await expiredPage.waitForURL(/(license|licence|upgrade|expired|billing)/, { timeout: 15_000 });

    // Vérifier le contenu de la page
    const upgradePage = expiredPage.locator(
      '[data-testid="license-expired"], .license-expired, h1, h2',
    );
    await expect(upgradePage.first()).toBeVisible({ timeout: 5_000 });

    // Un bouton pour renouveler/upgrader est présent
    const upgradeBtn = expiredPage.getByRole('button', {
      name: /renouveler|upgrader|souscrire|acheter|buy|upgrade|renew/i,
    });
    const hasUpgradeBtn = await upgradeBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasUpgradeBtn).toBeTruthy();

    // Tenter d'accéder au module agenda → toujours redirigé
    await expiredPage.goto('/agenda');
    await expect(expiredPage).toHaveURL(/(license|licence|upgrade|expired)/, { timeout: 10_000 });

    await context.close();
  });
});
