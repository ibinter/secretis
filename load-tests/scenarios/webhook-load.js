/**
 * IBIG SECRETIS – Test de charge : Webhooks de paiement (idempotence)
 *
 * Objectifs :
 *  - 50 webhooks de paiement simultanés avec le même idempotency_key
 *  - Vérifie que la licence est activée exactement 1 fois (idempotence)
 *  - Toutes les réponses doivent être 200 OK
 */

import http  from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { crypto } from 'k6/experimental/webcrypto';
import { getPublicHeaders } from '../helpers/auth.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL         = __ENV.BASE_URL         || 'http://localhost:8000';
const WEBHOOK_SECRET   = __ENV.WEBHOOK_SECRET   || 'test-webhook-secret-k6';
const STRIPE_ENDPOINT  = `${BASE_URL}/api/webhooks/stripe`;
const PADDLE_ENDPOINT  = `${BASE_URL}/api/webhooks/paddle`;

export const options = {
  scenarios: {
    // 50 VU envoient le même webhook simultanément
    idempotent_webhooks: {
      executor:   'shared-iterations',
      vus:        50,
      iterations: 50,
      maxDuration:'2m',
      tags:       { scenario: 'webhook-idempotency' },
      exec:       'idempotentWebhook',
    },
    // Charge générale de webhooks variés
    webhook_load: {
      executor:   'constant-vus',
      vus:        20,
      duration:   '3m',
      startTime:  '1m',
      tags:       { scenario: 'webhook-load' },
      exec:       'generalWebhookLoad',
    },
  },
  thresholds: {
    http_req_duration:          ['p(95)<500',  'p(99)<1000'],
    http_req_failed:            ['rate<0.01'],
    'webhook_response_ok':      ['rate>0.999'],   // 99.9 % de 200 OK
    'webhook_duration':         ['p(95)<300'],
    'license_activated_count':  ['count==1'],     // CRITIQUE : exactement 1 activation
    'idempotency_respected':    ['rate>0.999'],
    'duplicate_activations':    ['count<1'],      // aucun doublon
  },
};

// ---------------------------------------------------------------------------
// Métriques custom
// ---------------------------------------------------------------------------
const webhookResponseOk      = new Rate('webhook_response_ok');
const webhookDuration        = new Trend('webhook_duration',        true);
const licenseActivatedCount  = new Counter('license_activated_count');
const idempotencyRespected   = new Rate('idempotency_respected');
const duplicateActivations   = new Counter('duplicate_activations');
const webhookErrorCount      = new Counter('webhook_error_count');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Génère une signature HMAC-SHA256 pour Stripe webhooks.
 * En production, Stripe signe le payload avec le webhook secret.
 * En test, on simule cette signature.
 */
function generateStripeSignature(payload, secret, timestamp) {
  // Stripe format: t=<timestamp>,v1=<hmac>
  // On génère une fausse signature pour le test (le vrai algo nécessite HMAC)
  const fakeHmac = `fake_hmac_${timestamp}_${Math.random().toString(36).slice(2)}`;
  return `t=${timestamp},v1=${fakeHmac}`;
}

/**
 * Construit un payload de webhook Stripe pour activation de licence.
 */
function buildStripeWebhookPayload(idempotencyKey, licenseId) {
  const timestamp = Math.floor(Date.now() / 1000);
  return {
    id:       idempotencyKey,
    object:   'event',
    type:     'checkout.session.completed',
    created:  timestamp,
    livemode: false,
    data: {
      object: {
        id:              `cs_test_${idempotencyKey}`,
        payment_status:  'paid',
        status:          'complete',
        customer_email:  'client@secretis.test',
        metadata: {
          license_id:   licenseId,
          plan:         'professional',
          organisation: 'org-test-k6',
        },
        amount_total:     9900, // 99.00 EUR en centimes
        currency:         'eur',
      },
    },
  };
}

// Clé d'idempotence partagée : TOUS les VUs utilisent la même
// pour tester que la licence n'est activée qu'une seule fois
const SHARED_IDEMPOTENCY_KEY = `k6-test-${Date.now()}-idem`;
const SHARED_LICENSE_ID      = 'license-k6-test-001';

// ---------------------------------------------------------------------------
// Scénario 1 : Test d'idempotence (50 webhooks identiques simultanément)
// ---------------------------------------------------------------------------
export function idempotentWebhook() {
  const payload   = buildStripeWebhookPayload(SHARED_IDEMPOTENCY_KEY, SHARED_LICENSE_ID);
  const body      = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateStripeSignature(body, WEBHOOK_SECRET, timestamp);

  group('Webhook idempotent Stripe', () => {
    const start = Date.now();

    const res = http.post(
      STRIPE_ENDPOINT,
      body,
      {
        headers: {
          'Content-Type':      'application/json',
          'Accept':            'application/json',
          'Stripe-Signature':  signature,
          'Idempotency-Key':   SHARED_IDEMPOTENCY_KEY,
        },
        tags:    { operation: 'webhook_idempotent' },
        timeout: '10s',
      },
    );

    webhookDuration.add(Date.now() - start);

    const isOk = check(res, {
      'webhook: status 200':            (r) => r.status === 200,
      'webhook: durée < 500ms':         (r) => r.timings.duration < 500,
      'webhook: réponse JSON':          (r) => {
        try { JSON.parse(r.body); return true; } catch { return false; }
      },
    });

    webhookResponseOk.add(res.status === 200);

    if (res.status === 200) {
      try {
        const resBody = JSON.parse(res.body);

        // L'API doit indiquer si c'est la première activation ou une répétition
        const wasActivated = resBody.license_activated === true ||
                             resBody.status === 'activated';
        const wasIgnored   = resBody.idempotent === true ||
                             resBody.status === 'already_processed' ||
                             resBody.duplicate === true;

        if (wasActivated) {
          licenseActivatedCount.add(1);
          idempotencyRespected.add(true);

          // Si plus d'une activation, c'est un doublon
          if (licenseActivatedCount.value > 1) {
            duplicateActivations.add(1);
            idempotencyRespected.add(false);
          }
        } else if (wasIgnored) {
          // Réponse 200 + "déjà traité" = comportement idempotent correct
          idempotencyRespected.add(true);
          check({ wasIgnored }, {
            'idempotence: doublon correctement ignoré': (d) => d.wasIgnored,
          });
        }

      } catch { /* JSON parse error */ }
    } else {
      webhookErrorCount.add(1);
      idempotencyRespected.add(false);
    }
  });

  // Pas de sleep : on veut le maximum de concurrence
}

// ---------------------------------------------------------------------------
// Scénario 2 : Charge générale de webhooks variés
// ---------------------------------------------------------------------------
export function generalWebhookLoad() {
  const events = [
    { type: 'invoice.payment_succeeded', description: 'Paiement facture' },
    { type: 'customer.subscription.updated', description: 'MAJ abonnement' },
    { type: 'customer.subscription.deleted', description: 'Résiliation' },
    { type: 'invoice.payment_failed', description: 'Échec paiement' },
    { type: 'charge.refunded', description: 'Remboursement' },
  ];

  const event  = events[Math.floor(Math.random() * events.length)];
  const idemKey = `k6-${event.type}-${__VU}-${__ITER}-${Date.now()}`;

  const payload = JSON.stringify({
    id:      idemKey,
    object:  'event',
    type:    event.type,
    created: Math.floor(Date.now() / 1000),
    data:    { object: { id: `obj_${idemKey}`, customer: 'cus_test_k6' } },
  });

  group(`Webhook ${event.type}`, () => {
    const res = http.post(
      STRIPE_ENDPOINT,
      payload,
      {
        headers: {
          'Content-Type':     'application/json',
          'Accept':           'application/json',
          'Stripe-Signature': `t=${Math.floor(Date.now()/1000)},v1=fake_sig`,
          'Idempotency-Key':  idemKey,
        },
        tags:    { operation: 'webhook_general' },
        timeout: '10s',
      },
    );

    webhookDuration.add(res.timings.duration);
    webhookResponseOk.add(res.status === 200);

    check(res, {
      'webhook général: status 200':    (r) => r.status === 200,
      'webhook général: < 300ms':       (r) => r.timings.duration < 300,
    });
  });

  sleep(Math.random() * 1 + 0.5);
}

// ---------------------------------------------------------------------------
// Vérification post-test de l'état de la licence
// ---------------------------------------------------------------------------
export function teardown() {
  // Vérifier que la licence a été activée exactement 1 fois
  const res = http.get(
    `${BASE_URL}/api/licenses/${SHARED_LICENSE_ID}/status`,
    { headers: getPublicHeaders() },
  );

  check(res, {
    'teardown: licence activée':          (r) => {
      try { return JSON.parse(r.body).active === true; } catch { return false; }
    },
    'teardown: activations = 1':          (r) => {
      try { return JSON.parse(r.body).activation_count === 1; } catch { return false; }
    },
  });
}

// ---------------------------------------------------------------------------
// Résumé
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  const activations = data.metrics?.license_activated_count?.values?.count ?? 0;
  const dupes       = data.metrics?.duplicate_activations?.values?.count ?? 0;

  return {
    'stdout': `
=== WEBHOOK LOAD TEST – RAPPORT ===
p95 durée webhook      : ${data.metrics?.webhook_duration?.values?.['p(95)'] ?? 'N/A'} ms
Taux réponses 200 OK   : ${((data.metrics?.webhook_response_ok?.values?.rate ?? 0) * 100).toFixed(2)} %
Licences activées      : ${activations}  ${activations === 1 ? '✓ CORRECT (=1)' : 'CRITIQUE (!=1)'}
Activations dupliquées : ${dupes}        ${dupes === 0 ? '✓ OK' : 'ALERTE'}
Idempotence respectée  : ${((data.metrics?.idempotency_respected?.values?.rate ?? 0) * 100).toFixed(2)} %
Erreurs webhook        : ${data.metrics?.webhook_error_count?.values?.count ?? 0}
====================================
`,
    'reports/webhook-load-summary.json': JSON.stringify(data, null, 2),
  };
}
