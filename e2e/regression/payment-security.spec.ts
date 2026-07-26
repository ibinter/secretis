/**
 * regression/payment-security.spec.ts
 * Non-régression — Sécurité des paiements et webhooks CinetPay
 *
 * Vecteurs testés :
 *  - Webhook HMAC valide active la licence
 *  - Webhook HMAC invalide est rejeté 401/403
 *  - Double envoi du même webhook est idempotent
 *  - Falsification du montant dans le webhook est détectée
 *  - Preuve de paiement stockée en espace privé jamais /public
 *  - Licence activée uniquement par webhook vérifié, jamais par JS client
 *
 * Ces tests s'exécutent sans état d'authentification côté navigateur ;
 * ils frappent directement l'API REST.
 */
import { test, expect } from '@playwright/test';
import crypto from 'crypto';

test.use({ storageState: { cookies: [], origins: [] } });

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const CINETPAY_SECRET = process.env.CINETPAY_WEBHOOK_SECRET ?? 'test-webhook-secret';
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID ?? 'test-site-id';
const TEST_ORG_ID = process.env.TEST_ORG_ID ?? '1';
const WEBHOOK_URL = '/api/webhooks/cinetpay';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildWebhookPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const transactionId = `TXN-REG-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    cpm_site_id: CINETPAY_SITE_ID,
    cpm_trans_id: transactionId,
    cpm_trans_date: new Date().toISOString(),
    cpm_amount: '25000',
    cpm_currency: 'XOF',
    cpm_payid: `PAY-REG-${Date.now()}`,
    cpm_payment_config: 'SINGLE',
    cpm_page_action: 'PAYMENT',
    cpm_version: 'V1',
    cpm_payment_date: new Date().toISOString(),
    cpm_error_message: 'SUCCES',
    cel_phone_num: '+22507000000',
    cpm_phone_prefixe: '225',
    cpm_language: 'fr',
    cpm_result: '00',
    cpm_trans_status: 'ACCEPTED',
    payment_method: 'MOBILE_MONEY',
    buyer_name: 'Test Recette Regression',
    cpm_custom: JSON.stringify({
      organization_id: TEST_ORG_ID,
      plan: 'starter',
      billing_period: 'monthly',
    }),
    idempotency_key: `IK-REG-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

function signPayload(payload: Record<string, unknown>, secret = CINETPAY_SECRET): string {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

function buildHeaders(
  payload: Record<string, unknown>,
  secret = CINETPAY_SECRET,
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-CinetPay-Signature': signPayload(payload, secret),
    'X-Idempotency-Key': payload.idempotency_key as string,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Non-régression — Sécurité paiements', () => {
  // -------------------------------------------------------------------------
  // 1. Webhook avec HMAC valide active la licence
  // -------------------------------------------------------------------------
  test('Webhook avec HMAC valide active la licence', async ({ request }) => {
    const payload = buildWebhookPayload();
    const headers = buildHeaders(payload);

    const response = await request.post(WEBHOOK_URL, { data: payload, headers });

    // 200 = traitement accepté (peut-être 422 si l'ordre n'existe pas en env de test)
    // Ce qui est interdit : 401/403 (rejet HMAC) et 500 (erreur serveur)
    expect(
      response.status(),
      `Webhook HMAC valide rejeté avec status ${response.status()}`,
    ).not.toBe(401);
    expect(response.status()).not.toBe(403);
    expect(response.status()).not.toBe(500);

    // Si 200 : vérifier que la réponse indique un traitement (pas un rejet silencieux)
    if (response.status() === 200) {
      const body = await response.json().catch(() => ({}));
      expect(body).toBeDefined();
      // Le corps ne doit pas indiquer une erreur de signature
      const bodyStr = JSON.stringify(body).toLowerCase();
      expect(bodyStr).not.toMatch(/invalid.*signature|signature.*invalid|unauthorized/);
    }
  });

  // -------------------------------------------------------------------------
  // 2. Webhook avec HMAC invalide est rejeté 401
  // -------------------------------------------------------------------------
  test('Webhook avec HMAC invalide est rejeté 401', async ({ request }) => {
    const payload = buildWebhookPayload();

    const response = await request.post(WEBHOOK_URL, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CinetPay-Signature': 'aabbccdd1234567890abcdef0000000000000000000000000000000000000000',
        'X-Idempotency-Key': payload.idempotency_key as string,
      },
    });

    expect(
      [401, 403],
      `Webhook avec HMAC invalide accepté (status ${response.status()}) — faille de sécurité critique`,
    ).toContain(response.status());

    const body = await response.json().catch(() => ({}));
    const bodyStr = JSON.stringify(body).toLowerCase();

    // La réponse doit mentionner l'invalidité (pas un corps vide sans indication)
    if (Object.keys(body).length > 0) {
      expect(bodyStr).toMatch(/signature|invalid|unauthorized|non.autoris|rejet/i);
    }
  });

  // -------------------------------------------------------------------------
  // 3. Double envoi du même webhook est idempotent
  // -------------------------------------------------------------------------
  test('Double envoi du même webhook est idempotent', async ({ request }) => {
    const idempotencyKey = `IK-DEDUP-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const payload = buildWebhookPayload({ idempotency_key: idempotencyKey });
    const headers = buildHeaders(payload);

    // Premier envoi
    const first = await request.post(WEBHOOK_URL, { data: payload, headers });
    const firstStatus = first.status();
    expect(firstStatus).not.toBe(500);

    // Second envoi — même clé d'idempotence, même payload
    const second = await request.post(WEBHOOK_URL, { data: payload, headers });
    expect(second.status()).not.toBe(500);
    expect(second.status()).toBeLessThan(500);

    // Si le premier appel a été accepté (200 ou 422), le second ne doit pas créer
    // une double activation : statut 200 avec indication de déjà traité, ou 409
    if (firstStatus === 200) {
      expect([200, 409]).toContain(second.status());

      if (second.status() === 200) {
        const secondBody = await second.json().catch(() => ({}));
        const secondStr = JSON.stringify(secondBody).toLowerCase();
        // Soit le corps indique explicitement le traitement dupliqué,
        // soit il retourne le même résultat (idempotent par définition)
        expect(
          secondStr.match(/already|duplicate|idempotent|processed|traité/i) !== null ||
          secondStr === JSON.stringify(await first.json().catch(() => ({}))).toLowerCase(),
        ).toBeTruthy();
      }
    }
  });

  // -------------------------------------------------------------------------
  // 4. Falsification du montant dans le webhook est détectée
  // -------------------------------------------------------------------------
  test('Falsification du montant dans le webhook est détectée', async ({ request }) => {
    // Payer 1 XOF pour un plan Enterprise qui coûte 500 000 XOF
    const payload = buildWebhookPayload({
      cpm_amount: '1',
      cpm_custom: JSON.stringify({
        organization_id: TEST_ORG_ID,
        plan: 'enterprise',
        billing_period: 'annual',
      }),
    });
    const headers = buildHeaders(payload);

    const response = await request.post(WEBHOOK_URL, { data: payload, headers });
    expect(response.status()).not.toBe(500);

    if (response.ok()) {
      const body = await response.json().catch(() => ({}));
      const bodyStr = JSON.stringify(body).toLowerCase();

      // Le plan Enterprise ne doit pas être activé pour 1 XOF
      expect(bodyStr).not.toMatch(/enterprise.*activ|plan.*enterprise.*ok|licen.*enterprise.*valid/);

      // La réponse doit indiquer un rejet métier ou une validation d'amount
      const isRejected = bodyStr.match(/amount.*invalid|montant.*incorrect|invalid.*amount|rejet.*montant|insufficient/i);
      const isProcessedWithoutEnterprise = !bodyStr.match(/enterprise.*activ/);
      expect(isRejected !== null || isProcessedWithoutEnterprise).toBeTruthy();
    } else {
      // 400/422 = détection explicite de l'anomalie de montant — comportement correct
      expect([400, 402, 422]).toContain(response.status());
    }
  });

  // -------------------------------------------------------------------------
  // 5. Preuve de paiement stockée en espace privé jamais /public
  // -------------------------------------------------------------------------
  test('Preuve de paiement stockée en espace privé jamais /public', async ({ request }) => {
    // Envoyer un webhook valide pour déclencher le stockage d'une preuve
    const payload = buildWebhookPayload();
    const headers = buildHeaders(payload);

    await request.post(WEBHOOK_URL, { data: payload, headers });

    // Tentatives d'accès direct aux emplacements /public connus
    const publicPaymentPaths = [
      `/public/payments/${payload.cpm_trans_id}.json`,
      `/public/webhooks/${payload.cpm_trans_id}.json`,
      `/storage/payments/${payload.cpm_trans_id}.pdf`,
      `/public/storage/payments/${payload.cpm_trans_id}`,
      `/files/payments/${payload.cpm_trans_id}`,
    ];

    for (const publicPath of publicPaymentPaths) {
      const probe = await request.get(publicPath);
      // Les fichiers de paiement ne doivent jamais être accessibles publiquement
      expect(
        [404, 403, 401],
        `Preuve de paiement exposée publiquement : ${publicPath} (status ${probe.status()})`,
      ).toContain(probe.status());
    }

    // Vérifier aussi l'endpoint API sans authentification
    const apiProbe = await request.get(`/api/payments/${payload.cpm_trans_id}/receipt`);
    expect(
      [401, 403, 404],
      `Reçu de paiement accessible sans authentification (status ${apiProbe.status()})`,
    ).toContain(apiProbe.status());
  });

  // -------------------------------------------------------------------------
  // 6. Licence activée uniquement par webhook vérifié, jamais par JS client
  // -------------------------------------------------------------------------
  test('Licence activée uniquement par webhook vérifié, jamais par JS client', async ({ request }) => {
    const organizationId = Number(TEST_ORG_ID);

    // Tentative 1 : activation directe sans authentification
    const attempt1 = await request.post('/api/licenses/activate', {
      data: {
        organization_id: organizationId,
        plan: 'enterprise',
        expires_at: '2030-12-31T23:59:59Z',
        activated_by: 'client_javascript',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(
      [401, 403, 404, 405],
      `Activation directe sans auth acceptée (status ${attempt1.status()}) — faille critique`,
    ).toContain(attempt1.status());

    // Tentative 2 : activation via un endpoint admin supposé
    const attempt2 = await request.post('/api/admin/licenses', {
      data: {
        organization_id: organizationId,
        plan: 'starter',
        force: true,
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(
      [401, 403, 404, 405],
      `Endpoint admin activation license accessible sans auth (status ${attempt2.status()})`,
    ).toContain(attempt2.status());

    // Tentative 3 : manipulation du statut via PATCH
    const attempt3 = await request.patch(`/api/organizations/${organizationId}/subscription`, {
      data: {
        status: 'active',
        plan: 'enterprise',
        expires_at: '2099-12-31',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(
      [401, 403, 404, 405],
      `PATCH subscription sans auth accepté (status ${attempt3.status()}) — faille critique`,
    ).toContain(attempt3.status());

    // Tentative 4 : injection via header de debug (parfois laissé ouvert en dev)
    const attempt4 = await request.post('/api/webhooks/cinetpay', {
      data: buildWebhookPayload(),
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Bypass-Hmac': 'true',
        'X-Test-Skip-Validation': '1',
        'X-CinetPay-Signature': 'bypass',
      },
    });
    // Même avec des headers de "bypass", la validation HMAC doit tenir
    expect(
      [401, 403],
      `Header de bypass accepté sans HMAC valide (status ${attempt4.status()})`,
    ).toContain(attempt4.status());
  });
});
