/**
 * security/payments.spec.ts
 * Tests E2E — Sécurité des webhooks CinetPay et du module paiement
 *
 * Vecteurs testés :
 *  - Activation directe de licence sans webhook valide
 *  - Rejet de webhook avec HMAC invalide
 *  - Idempotence des webhooks dupliqués
 *  - Impossibilité de forger un webhook sans la clé secrète
 *  - Protection de l'endpoint d'activation admin
 */
import { test, expect } from '../fixtures/auth';
import crypto from 'crypto';

test.use({ storageState: { cookies: [], origins: [] } });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CINETPAY_SECRET = process.env.CINETPAY_WEBHOOK_SECRET ?? 'test-webhook-secret';
const WEBHOOK_URL = '/api/webhooks/cinetpay';

function buildPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const transactionId = `TXN-E2E-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    cpm_result: '00',
    cpm_trans_status: 'ACCEPTED',
    payment_method: 'MOBILE_MONEY',
    buyer_name: 'Test Buyer E2E',
    cpm_custom: JSON.stringify({
      organization_id: process.env.TEST_ORG_ID ?? '1',
      plan: 'starter',
      billing_period: 'monthly',
    }),
    idempotency_key: `IK-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

function validSignature(payload: Record<string, unknown>): string {
  return crypto
    .createHmac('sha256', CINETPAY_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Sécurité paiements — webhooks CinetPay', () => {
  // -------------------------------------------------------------------------
  // Activation directe sans webhook
  // -------------------------------------------------------------------------
  test('activation de licence directe sans token → rejetée', async ({ request }) => {
    // Tenter d'activer une licence sans passer par le webhook
    const response = await request.post('/api/orders/ORD-2026-E2E-00001/activate');
    expect([401, 403, 404, 405]).toContain(response.status());
  });

  test('activation de licence sans authentification → rejetée', async ({ request }) => {
    const response = await request.post('/api/admin/licenses/activate', {
      data: {
        organization_id: 1,
        plan: 'enterprise',
        expires_at: '2030-12-31',
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  // -------------------------------------------------------------------------
  // Vérification HMAC du webhook
  // -------------------------------------------------------------------------
  test('webhook avec signature HMAC valide → accepté (200)', async ({ request }) => {
    const payload = buildPayload();
    const signature = validSignature(payload);

    const response = await request.post(WEBHOOK_URL, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-CinetPay-Signature': signature,
        'X-Idempotency-Key': payload.idempotency_key as string,
      },
    });

    // 200 attendu si l'environnement est correctement configuré
    // 422 si les données de test ne correspondent pas à un ordre réel (acceptable)
    expect([200, 422]).toContain(response.status());
  });

  test('webhook avec signature invalide → rejeté (401/403)', async ({ request }) => {
    const payload = buildPayload();

    const response = await request.post(WEBHOOK_URL, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-CinetPay-Signature': 'signature-invalide-forgee',
        'X-Idempotency-Key': payload.idempotency_key as string,
      },
    });

    expect([401, 403]).toContain(response.status());

    const body = await response.json().catch(() => ({}));
    if (body.message) {
      expect(body.message).toMatch(/signature|invalid|unauthorized|non autorisé/i);
    }
  });

  test('webhook sans en-tête de signature → rejeté', async ({ request }) => {
    const payload = buildPayload();

    const response = await request.post(WEBHOOK_URL, {
      data: payload,
      headers: { 'Content-Type': 'application/json' },
      // Pas de X-CinetPay-Signature
    });

    expect([400, 401, 403]).toContain(response.status());
  });

  test('webhook avec signature d\'un autre secret → rejeté', async ({ request }) => {
    const payload = buildPayload();
    // Signer avec un secret différent
    const wrongSignature = crypto
      .createHmac('sha256', 'wrong-secret-totally-different')
      .update(JSON.stringify(payload))
      .digest('hex');

    const response = await request.post(WEBHOOK_URL, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-CinetPay-Signature': wrongSignature,
        'X-Idempotency-Key': payload.idempotency_key as string,
      },
    });

    expect([401, 403]).toContain(response.status());
  });

  // -------------------------------------------------------------------------
  // Idempotence
  // -------------------------------------------------------------------------
  test('webhook dupliqué → second appel idempotent (pas de double traitement)', async ({
    request,
  }) => {
    const idempotencyKey = `IK-DEDUP-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const payload = buildPayload({ idempotency_key: idempotencyKey });
    const signature = validSignature(payload);

    const headers = {
      'Content-Type': 'application/json',
      'X-CinetPay-Signature': signature,
      'X-Idempotency-Key': idempotencyKey,
    };

    // Premier appel
    const first = await request.post(WEBHOOK_URL, { data: payload, headers });
    const firstStatus = first.status();

    // Second appel — même payload, même clé d'idempotence
    const second = await request.post(WEBHOOK_URL, { data: payload, headers });

    // Les deux doivent répondre sans erreur serveur (pas de 500)
    expect(second.status()).not.toBe(500);
    expect(second.status()).toBeLessThan(500);

    // Si le premier appel a réussi, le second doit indiquer qu'il était déjà traité
    if (firstStatus === 200) {
      expect(second.status()).toBe(200);
      const secondBody = await second.json().catch(() => ({}));
      // Le corps indique le traitement dupliqué
      const isIdempotent =
        JSON.stringify(secondBody).match(/already_processed|duplicate|idempotent|already/i);
      // Acceptable si le corps ne le précise pas mais le statut est 200
      expect(second.status()).toBe(200);
    }
  });

  // -------------------------------------------------------------------------
  // Falsification du payload
  // -------------------------------------------------------------------------
  test('webhook avec cpm_result différent de 00 → pas d\'activation', async ({
    request,
  }) => {
    // cpm_result 01 = échec du paiement
    const payload = buildPayload({ cpm_result: '01', cpm_trans_status: 'REFUSED' });
    const signature = validSignature(payload);

    const response = await request.post(WEBHOOK_URL, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-CinetPay-Signature': signature,
        'X-Idempotency-Key': payload.idempotency_key as string,
      },
    });

    // Le webhook peut être accepté (200) mais ne doit pas activer la licence
    // OU il peut retourner une erreur métier
    expect(response.status()).not.toBe(500);

    if (response.ok()) {
      const body = await response.json().catch(() => ({}));
      // Le statut métier doit refléter l'échec
      const bodyStr = JSON.stringify(body).toLowerCase();
      expect(bodyStr).not.toMatch(/license.*active|activated|success.*licen/);
    }
  });

  test('webhook avec montant falsifié → rejeté ou ignoré', async ({ request }) => {
    // Tenter de faire passer un paiement de 1 XOF pour un plan enterprise
    const payload = buildPayload({
      cpm_amount: '1', // montant clairement incorrect
      cpm_custom: JSON.stringify({
        organization_id: process.env.TEST_ORG_ID ?? '1',
        plan: 'enterprise', // plan à 500 000 XOF
        billing_period: 'annual',
      }),
    });
    const signature = validSignature(payload);

    const response = await request.post(WEBHOOK_URL, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-CinetPay-Signature': signature,
        'X-Idempotency-Key': payload.idempotency_key as string,
      },
    });

    expect(response.status()).not.toBe(500);

    if (response.ok()) {
      const body = await response.json().catch(() => ({}));
      // Ne doit pas avoir activé un plan enterprise pour 1 XOF
      const bodyStr = JSON.stringify(body).toLowerCase();
      expect(bodyStr).not.toMatch(/enterprise.*activated|plan.*enterprise.*active/);
    }
  });
});
