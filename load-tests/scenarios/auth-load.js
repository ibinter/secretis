/**
 * IBIG SECRETIS – Test de charge : Authentification
 *
 * Objectifs :
 *  - 50 VU en parallèle tentent de se connecter
 *  - 80 % logins valides / 20 % invalides
 *  - Vérifie : 200 pour les valides, 422 pour les invalides, 429 après 5 tentatives
 *  - Métriques : durée login, taux de succès, réponse du rate-limiter
 */

import http    from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { loginAsUser, getHeaders, TEST_ACCOUNTS } from '../helpers/auth.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  scenarios: {
    auth_load: {
      executor:  'constant-vus',
      vus:       50,
      duration:  '5m',
      tags:      { scenario: 'auth-load' },
    },
  },
  thresholds: {
    // Durée globale
    http_req_duration:          ['p(95)<500', 'p(99)<1000'],
    // Taux d'erreur
    http_req_failed:            ['rate<0.01'],
    // Métriques custom
    'login_duration':           ['p(95)<800'],
    'login_success_rate':       ['rate>0.78'],   // ~80 % de logins valides
    'rate_limiter_triggered':   ['count>0'],     // le rate-limiter doit avoir été déclenché
  },
};

// ---------------------------------------------------------------------------
// Métriques custom
// ---------------------------------------------------------------------------
const loginDuration        = new Trend('login_duration',         true);
const loginSuccessRate     = new Rate('login_success_rate');
const loginFailRate        = new Rate('login_fail_rate');
const rateLimiterTriggered = new Counter('rate_limiter_triggered');
const invalidCredErrors    = new Counter('invalid_cred_errors');

// ---------------------------------------------------------------------------
// Données de test
// ---------------------------------------------------------------------------
const INVALID_CREDENTIALS = [
  { email: 'hacker@evil.com',     password: 'wrongpassword' },
  { email: 'admin@secretis.test', password: '123456' },
  { email: 'test@test.com',       password: 'password' },
  { email: 'demo@secretis.test',  password: 'WrongPass!' },
  { email: 'nonexistent@x.com',   password: 'whatever' },
];

// ---------------------------------------------------------------------------
// Fonctions utilitaires
// ---------------------------------------------------------------------------
function pickValidAccount() {
  return TEST_ACCOUNTS[Math.floor(Math.random() * TEST_ACCOUNTS.length)];
}

function pickInvalidCredentials() {
  return INVALID_CREDENTIALS[Math.floor(Math.random() * INVALID_CREDENTIALS.length)];
}

// ---------------------------------------------------------------------------
// Test principal
// ---------------------------------------------------------------------------
export default function () {
  const isValidLogin = Math.random() < 0.80; // 80 % valides

  if (isValidLogin) {
    group('Login valide', () => {
      const account = pickValidAccount();
      const start   = Date.now();

      const res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email: account.email, password: account.password }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept':       'application/json',
          },
          tags: { operation: 'valid_login' },
        },
      );

      const elapsed = Date.now() - start;
      loginDuration.add(elapsed);

      const ok = check(res, {
        'login valide: status 200':       (r) => r.status === 200,
        'login valide: token présent':    (r) => {
          try { return !!JSON.parse(r.body).token; } catch { return false; }
        },
        'login valide: user présent':     (r) => {
          try { return !!JSON.parse(r.body).user; } catch { return false; }
        },
        'login valide: durée < 800ms':    (r) => r.timings.duration < 800,
      });

      loginSuccessRate.add(ok);

      // Logout pour libérer les tokens (éviter la saturation DB)
      if (ok) {
        let token;
        try { token = JSON.parse(res.body).token; } catch { /* ignore */ }
        if (token) {
          http.post(
            `${BASE_URL}/api/auth/logout`,
            null,
            {
              headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
              tags: { operation: 'logout' },
            },
          );
        }
      }
    });

  } else {
    group('Login invalide', () => {
      const creds = pickInvalidCredentials();

      const res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email: creds.email, password: creds.password }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept':       'application/json',
          },
          tags: { operation: 'invalid_login' },
        },
      );

      const ok = check(res, {
        'login invalide: status 422':     (r) => r.status === 422,
        'login invalide: pas de token':   (r) => {
          try { return !JSON.parse(r.body).token; } catch { return true; }
        },
        'login invalide: message erreur': (r) => {
          try {
            const b = JSON.parse(r.body);
            return b.message || b.errors;
          } catch { return false; }
        },
      });

      loginFailRate.add(!ok);
      if (!ok) invalidCredErrors.add(1);
    });
  }

  // ---------------------------------------------------------------------------
  // Test du rate-limiter (simulé : 5 tentatives rapides avec mauvais mdp)
  // On ne le fait que 2 % du temps pour ne pas fausser les stats globales
  // ---------------------------------------------------------------------------
  if (Math.random() < 0.02) {
    group('Rate-limiter (5 tentatives rapides)', () => {
      const email = 'ratelimit_target@secretis.test';
      let hitLimit = false;

      for (let i = 0; i < 6; i++) {
        const res = http.post(
          `${BASE_URL}/api/auth/login`,
          JSON.stringify({ email, password: `wrong_attempt_${i}` }),
          {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            tags: { operation: 'rate_limit_probe' },
          },
        );

        if (res.status === 429) {
          hitLimit = true;
          check(res, {
            'rate-limiter: status 429':          (r) => r.status === 429,
            'rate-limiter: header Retry-After':  (r) => !!r.headers['Retry-After'],
          });
          rateLimiterTriggered.add(1);
          break;
        }

        sleep(0.1); // 100ms entre tentatives
      }

      // On s'attend à avoir touché la limite sur 6 tentatives
      check({ hitLimit }, {
        'rate-limiter: déclenché après 5 tentatives': (d) => d.hitLimit,
      });
    });
  }

  // Think time réaliste
  sleep(Math.random() * 2 + 0.5); // 0.5 – 2.5 s
}

// ---------------------------------------------------------------------------
// Résumé de fin de test
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  return {
    'stdout': summaryReport(data),
    'reports/auth-load-summary.json': JSON.stringify(data, null, 2),
  };
}

function summaryReport(data) {
  const p95 = data.metrics?.http_req_duration?.values?.['p(95)'] ?? 'N/A';
  const err = ((data.metrics?.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2);
  return `
=== AUTH LOAD TEST – RAPPORT ===
p95 latence   : ${p95} ms
Taux d'erreur : ${err} %
================================
`;
}
