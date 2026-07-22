/**
 * IBIG SECRETIS – Helpers d'authentification pour les tests de charge k6
 *
 * Fournit :
 *  - loginAsUser()  : obtient un token Sanctum
 *  - getHeaders()   : retourne les headers HTTP communs
 *  - TEST_ACCOUNTS  : pool de 10 comptes de test
 *  - pickAccount()  : sélectionne un compte aléatoire du pool
 */

import http  from 'k6/http';
import { check } from 'k6';

// ---------------------------------------------------------------------------
// Pool de comptes de test pré-créés (10 comptes)
// Ces comptes doivent exister dans la base de données de test.
// Créer via : php artisan db:seed --class=LoadTestSeeder
// ---------------------------------------------------------------------------
export const TEST_ACCOUNTS = [
  { email: 'demo@secretis.test',  password: 'LoadTest#2024!' },
  { email: 'user1@secretis.test', password: 'LoadTest#2024!' },
  { email: 'user2@secretis.test', password: 'LoadTest#2024!' },
  { email: 'user3@secretis.test', password: 'LoadTest#2024!' },
  { email: 'user4@secretis.test', password: 'LoadTest#2024!' },
  { email: 'user5@secretis.test', password: 'LoadTest#2024!' },
  { email: 'user6@secretis.test', password: 'LoadTest#2024!' },
  { email: 'user7@secretis.test', password: 'LoadTest#2024!' },
  { email: 'user8@secretis.test', password: 'LoadTest#2024!' },
  { email: 'user9@secretis.test', password: 'LoadTest#2024!' },
];

/**
 * Pool de comptes par organisation (multitenancy)
 * Clé = slug de l'organisation, valeur = tableau de comptes
 */
export const TENANT_ACCOUNTS = {
  'org-alpha': [
    { email: 'alpha1@secretis.test', password: 'LoadTest#2024!', org: 'org-alpha' },
    { email: 'alpha2@secretis.test', password: 'LoadTest#2024!', org: 'org-alpha' },
    { email: 'alpha3@secretis.test', password: 'LoadTest#2024!', org: 'org-alpha' },
    { email: 'alpha4@secretis.test', password: 'LoadTest#2024!', org: 'org-alpha' },
  ],
  'org-beta': [
    { email: 'beta1@secretis.test', password: 'LoadTest#2024!', org: 'org-beta' },
    { email: 'beta2@secretis.test', password: 'LoadTest#2024!', org: 'org-beta' },
    { email: 'beta3@secretis.test', password: 'LoadTest#2024!', org: 'org-beta' },
    { email: 'beta4@secretis.test', password: 'LoadTest#2024!', org: 'org-beta' },
  ],
  'org-gamma': [
    { email: 'gamma1@secretis.test', password: 'LoadTest#2024!', org: 'org-gamma' },
    { email: 'gamma2@secretis.test', password: 'LoadTest#2024!', org: 'org-gamma' },
    { email: 'gamma3@secretis.test', password: 'LoadTest#2024!', org: 'org-gamma' },
    { email: 'gamma4@secretis.test', password: 'LoadTest#2024!', org: 'org-gamma' },
  ],
  'org-delta': [
    { email: 'delta1@secretis.test', password: 'LoadTest#2024!', org: 'org-delta' },
    { email: 'delta2@secretis.test', password: 'LoadTest#2024!', org: 'org-delta' },
    { email: 'delta3@secretis.test', password: 'LoadTest#2024!', org: 'org-delta' },
    { email: 'delta4@secretis.test', password: 'LoadTest#2024!', org: 'org-delta' },
  ],
  'org-epsilon': [
    { email: 'epsilon1@secretis.test', password: 'LoadTest#2024!', org: 'org-epsilon' },
    { email: 'epsilon2@secretis.test', password: 'LoadTest#2024!', org: 'org-epsilon' },
    { email: 'epsilon3@secretis.test', password: 'LoadTest#2024!', org: 'org-epsilon' },
    { email: 'epsilon4@secretis.test', password: 'LoadTest#2024!', org: 'org-epsilon' },
  ],
};

// ---------------------------------------------------------------------------
// Fonctions utilitaires
// ---------------------------------------------------------------------------

/**
 * Sélectionne un compte aléatoire dans le pool global.
 * @returns {{ email: string, password: string }}
 */
export function pickAccount() {
  return TEST_ACCOUNTS[Math.floor(Math.random() * TEST_ACCOUNTS.length)];
}

/**
 * Sélectionne un compte aléatoire pour une organisation donnée.
 * @param {string} orgSlug
 * @returns {{ email: string, password: string, org: string }}
 */
export function pickTenantAccount(orgSlug) {
  const accounts = TENANT_ACCOUNTS[orgSlug];
  if (!accounts || accounts.length === 0) {
    throw new Error(`Aucun compte de test pour l'organisation : ${orgSlug}`);
  }
  return accounts[Math.floor(Math.random() * accounts.length)];
}

/**
 * Effectue le login via Laravel Sanctum et retourne le token Bearer.
 *
 * @param {string} baseUrl      URL de base, ex. "http://localhost:8000"
 * @param {string} email
 * @param {string} password
 * @param {{ tags?: object, timeout?: string }} [opts]
 * @returns {{ token: string|null, userId: number|null, success: boolean }}
 */
export function loginAsUser(baseUrl, email, password, opts = {}) {
  const url = `${baseUrl}/api/auth/login`;

  const payload = JSON.stringify({ email, password });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    tags:    opts.tags    || { operation: 'login' },
    timeout: opts.timeout || '10s',
  };

  const res = http.post(url, payload, params);

  const ok = check(res, {
    'login: status 200':          (r) => r.status === 200,
    'login: token présent':       (r) => {
      try { return !!JSON.parse(r.body).token; } catch { return false; }
    },
    'login: durée < 2s':          (r) => r.timings.duration < 2000,
  });

  if (!ok || res.status !== 200) {
    return { token: null, userId: null, success: false };
  }

  let body;
  try {
    body = JSON.parse(res.body);
  } catch {
    return { token: null, userId: null, success: false };
  }

  return {
    token:   body.token   || null,
    userId:  body.user?.id || null,
    success: true,
  };
}

/**
 * Effectue le logout (révoque le token Sanctum).
 *
 * @param {string} baseUrl
 * @param {string} token
 */
export function logout(baseUrl, token) {
  if (!token) return;
  http.post(
    `${baseUrl}/api/auth/logout`,
    null,
    { headers: getHeaders(token), tags: { operation: 'logout' } },
  );
}

/**
 * Construit les headers HTTP standards pour les requêtes authentifiées.
 *
 * @param {string} token   Token Bearer Sanctum
 * @returns {object}
 */
export function getHeaders(token) {
  return {
    'Content-Type':      'application/json',
    'Accept':            'application/json',
    'X-Requested-With':  'XMLHttpRequest',
    'Authorization':    `Bearer ${token}`,
  };
}

/**
 * Headers sans authentification (endpoints publics).
 */
export function getPublicHeaders() {
  return {
    'Content-Type':     'application/json',
    'Accept':           'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
}

/**
 * Tente un login et échoue le test k6 si le token n'est pas obtenu.
 * Pratique pour les setups de scénario où le login est un prérequis.
 *
 * @param {string} baseUrl
 * @param {{ email: string, password: string }} account
 * @returns {string} token
 */
export function requireLogin(baseUrl, account) {
  const result = loginAsUser(baseUrl, account.email, account.password);
  if (!result.success || !result.token) {
    // En cas d'échec critique, on lève une erreur k6
    throw new Error(
      `Impossible d'obtenir le token pour ${account.email}. ` +
      'Vérifiez que le serveur est démarré et que les comptes de test existent.'
    );
  }
  return result.token;
}
