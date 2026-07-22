/**
 * IBIG SECRETIS – Test de charge : Multi-tenancy (isolation des données)
 *
 * Objectifs :
 *  - 5 organisations × 20 VU chacune (100 VU total)
 *  - Chaque org accède uniquement à ses données
 *  - Vérification aléatoire de l'isolation : org A ne voit jamais de données org B
 *  - Charge croisée : org A stress test pendant que org B fait des requêtes normales
 */

import http  from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { requireLogin, getHeaders, TENANT_ACCOUNTS, pickTenantAccount } from '../helpers/auth.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Les 5 organisations de test
const ORGS = ['org-alpha', 'org-beta', 'org-gamma', 'org-delta', 'org-epsilon'];

export const options = {
  scenarios: {
    // org-alpha : charge élevée (stress)
    org_alpha_stress: {
      executor:   'constant-vus',
      vus:        30,
      duration:   '5m',
      tags:       { scenario: 'multitenancy', org: 'org-alpha', mode: 'stress' },
      exec:       'orgStressTest',
      env:        { CURRENT_ORG: 'org-alpha' },
    },
    // org-beta : charge normale
    org_beta_normal: {
      executor:   'constant-vus',
      vus:        20,
      duration:   '5m',
      tags:       { scenario: 'multitenancy', org: 'org-beta', mode: 'normal' },
      exec:       'orgNormalTest',
      env:        { CURRENT_ORG: 'org-beta' },
    },
    // org-gamma : charge normale
    org_gamma_normal: {
      executor:   'constant-vus',
      vus:        20,
      duration:   '5m',
      tags:       { scenario: 'multitenancy', org: 'org-gamma', mode: 'normal' },
      exec:       'orgNormalTest',
      env:        { CURRENT_ORG: 'org-gamma' },
    },
    // org-delta : charge légère
    org_delta_light: {
      executor:   'constant-vus',
      vus:        15,
      duration:   '5m',
      tags:       { scenario: 'multitenancy', org: 'org-delta', mode: 'light' },
      exec:       'orgNormalTest',
      env:        { CURRENT_ORG: 'org-delta' },
    },
    // org-epsilon : charge légère
    org_epsilon_light: {
      executor:   'constant-vus',
      vus:        15,
      duration:   '5m',
      tags:       { scenario: 'multitenancy', org: 'org-epsilon', mode: 'light' },
      exec:       'orgNormalTest',
      env:        { CURRENT_ORG: 'org-epsilon' },
    },
    // Vérification aléatoire de l'isolation (5 VU dédiés)
    isolation_check: {
      executor:   'constant-vus',
      vus:        5,
      duration:   '5m',
      startTime:  '30s',
      tags:       { scenario: 'multitenancy', mode: 'isolation-check' },
      exec:       'isolationCheck',
    },
  },
  thresholds: {
    http_req_duration:                ['p(95)<500', 'p(99)<1000'],
    http_req_failed:                  ['rate<0.01'],
    // CRITIQUE : 0 fuite de données inter-orgs
    'data_isolation_breach':          ['count<1'],
    'isolation_check_passed':         ['rate>0.999'],
    'cross_tenant_data_visible':      ['count<1'],  // aucune donnée d'une autre org visible
    // Performance par org
    'org_read_duration':              ['p(95)<400'],
    'org_write_duration':             ['p(95)<600'],
  },
};

// ---------------------------------------------------------------------------
// Métriques custom
// ---------------------------------------------------------------------------
const dataIsolationBreach    = new Counter('data_isolation_breach');
const isolationCheckPassed   = new Rate('isolation_check_passed');
const crossTenantDataVisible = new Counter('cross_tenant_data_visible');
const orgReadDuration        = new Trend('org_read_duration',  true);
const orgWriteDuration       = new Trend('org_write_duration', true);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Cache de sessions par VU
let _session = null;

function getOrgSlug() {
  return __ENV.CURRENT_ORG || ORGS[__VU % ORGS.length];
}

function ensureSession() {
  if (!_session) {
    const org     = getOrgSlug();
    const account = pickTenantAccount(org);
    const token   = requireLogin(BASE_URL, account);
    _session = { token, org, account };
  }
  return _session;
}

function orgEndpoint(path) {
  return `${BASE_URL}/api/${path}`;
}

// ---------------------------------------------------------------------------
// Scénario 1 : Tests normaux par organisation
// ---------------------------------------------------------------------------
export function orgNormalTest() {
  const { token, org } = ensureSession();

  group(`Org ${org} – opérations normales`, () => {
    // Lecture : liste des documents de l'org
    let readStart = Date.now();
    const listRes = http.get(
      orgEndpoint('documents?per_page=10'),
      { headers: getHeaders(token), tags: { operation: 'org_list', org } },
    );
    orgReadDuration.add(Date.now() - readStart);

    check(listRes, {
      [`${org}: liste documents OK`]:   (r) => r.status === 200,
      [`${org}: données de l'org`]:     (r) => {
        try {
          const b = JSON.parse(r.body);
          const items = b.data || b;
          if (!Array.isArray(items)) return true; // liste vide ok
          // Chaque document doit appartenir à l'organisation courante
          return items.every((doc) =>
            !doc.organisation_slug || doc.organisation_slug === org
          );
        } catch { return true; }
      },
    });

    // Écriture : créer un courrier
    const writeStart = Date.now();
    const writeRes   = http.post(
      orgEndpoint('courriers'),
      JSON.stringify({
        objet:        `Courrier ${org} VU${__VU} I${__ITER}`,
        type:         'interne',
        priorite:     'normale',
        expediteur:   `Test VU ${__VU}`,
        destinataire: 'Direction',
        date_reception: new Date().toISOString().split('T')[0],
      }),
      { headers: getHeaders(token), tags: { operation: 'org_write', org } },
    );
    orgWriteDuration.add(Date.now() - writeStart);

    check(writeRes, {
      [`${org}: création courrier OK`]: (r) => r.status === 201,
      [`${org}: org dans la réponse`]:  (r) => {
        try {
          const b = JSON.parse(r.body);
          return !b.organisation_slug || b.organisation_slug === org;
        } catch { return true; }
      },
    });

    // Lecture des événements agenda
    const agendaRes = http.get(
      orgEndpoint(`events?start=2025-01-01&end=2025-12-31`),
      { headers: getHeaders(token), tags: { operation: 'org_agenda', org } },
    );

    check(agendaRes, {
      [`${org}: agenda OK`]: (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 2 + 1);
}

// ---------------------------------------------------------------------------
// Scénario 2 : Stress test org-alpha (charge élevée)
// ---------------------------------------------------------------------------
export function orgStressTest() {
  const { token, org } = ensureSession(); // org-alpha

  group(`Org ${org} – STRESS`, () => {
    // Requêtes multiples sans délai pour simuler la charge
    const endpoints = [
      'documents',
      'courriers',
      'events?start=2025-01-01&end=2025-12-31',
      'dashboard',
      'tasks?status=pending',
      'users',
    ];

    const batchReqs = endpoints.map((ep) => ({
      method: 'GET',
      url:    orgEndpoint(ep),
      params: { headers: getHeaders(token), tags: { operation: 'stress_read', org } },
    }));

    const results = http.batch(batchReqs);

    results.forEach((res, i) => {
      orgReadDuration.add(res.timings.duration);
      check(res, {
        [`stress ${org}/${endpoints[i]}: status 2xx`]: (r) => r.status >= 200 && r.status < 300,
        [`stress ${org}/${endpoints[i]}: pas de 500`]: (r) => r.status !== 500,
      });
    });
  });

  sleep(Math.random() * 0.5); // délai minimal en stress
}

// ---------------------------------------------------------------------------
// Scénario 3 : Vérification de l'isolation (5 VU dédiés)
// ---------------------------------------------------------------------------
export function isolationCheck() {
  // Ce VU alterne entre deux organisations différentes
  const orgA = ORGS[__VU % ORGS.length];
  const orgB = ORGS[(__VU + 1) % ORGS.length]; // org différente

  const accountA = pickTenantAccount(orgA);
  const accountB = pickTenantAccount(orgB);

  const tokenA = requireLogin(BASE_URL, accountA);
  const tokenB = requireLogin(BASE_URL, accountB);

  group('Vérification isolation inter-org', () => {
    // 1. Créer un document avec le token de orgA
    const createRes = http.post(
      orgEndpoint('documents'),
      JSON.stringify({
        title:       `ISOLATION-TEST-${orgA}-${Date.now()}`,
        description: `Document confidentiel de ${orgA} – ne doit pas être visible par ${orgB}`,
        folder_id:   1,
        public:      false,
      }),
      { headers: getHeaders(tokenA), tags: { operation: 'isolation_create', org: orgA } },
    );

    let docId = null;
    if (createRes.status === 201) {
      try { docId = JSON.parse(createRes.body).id; } catch { /* ignore */ }
    }

    // 2. Tenter d'accéder à ce document avec le token de orgB
    if (docId) {
      const crossRes = http.get(
        orgEndpoint(`documents/${docId}`),
        {
          headers: getHeaders(tokenB),
          tags:    { operation: 'isolation_cross_access', org: orgB },
        },
      );

      // orgB NE DOIT PAS pouvoir accéder au document de orgA
      const accessDenied = crossRes.status === 403 ||
                           crossRes.status === 404 ||
                           crossRes.status === 401;

      const isolationOk = check(crossRes, {
        'isolation: org B ne peut pas lire docs org A (403/404)': () => accessDenied,
        'isolation: pas de 200 sur doc cross-org':                (r) => r.status !== 200,
      });

      isolationCheckPassed.add(isolationOk);

      if (!accessDenied) {
        // FUITE DE DONNÉES DÉTECTÉE
        dataIsolationBreach.add(1);
        crossTenantDataVisible.add(1);
        console.error(
          `FUITE DONNÉES: org ${orgB} peut accéder au doc ${docId} de ${orgA} ` +
          `(status: ${crossRes.status})`
        );
      }
    }

    // 3. Vérifier que la liste des courriers de orgB ne contient pas de données de orgA
    const listResB = http.get(
      orgEndpoint('courriers?per_page=50'),
      { headers: getHeaders(tokenB), tags: { operation: 'isolation_list', org: orgB } },
    );

    if (listResB.status === 200) {
      try {
        const body  = JSON.parse(listResB.body);
        const items = body.data || body;

        if (Array.isArray(items)) {
          const contaminated = items.filter((item) =>
            item.organisation_slug && item.organisation_slug !== orgB
          );

          if (contaminated.length > 0) {
            dataIsolationBreach.add(contaminated.length);
            crossTenantDataVisible.add(contaminated.length);
            console.error(
              `FUITE: ${contaminated.length} courriers de ${orgA} visibles par ${orgB}`
            );
          }

          check({ contaminated }, {
            'isolation courriers: aucun cross-org': (d) => d.contaminated.length === 0,
          });
          isolationCheckPassed.add(contaminated.length === 0);
        }
      } catch { /* ignore */ }
    }
  });

  sleep(Math.random() * 3 + 2);
}

// ---------------------------------------------------------------------------
// Résumé
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  const breaches = data.metrics?.data_isolation_breach?.values?.count ?? 0;
  const crossVis = data.metrics?.cross_tenant_data_visible?.values?.count ?? 0;

  return {
    'stdout': `
=== MULTITENANCY LOAD TEST – RAPPORT ===
p95 lecture orgs         : ${data.metrics?.org_read_duration?.values?.['p(95)'] ?? 'N/A'} ms
p95 écriture orgs        : ${data.metrics?.org_write_duration?.values?.['p(95)'] ?? 'N/A'} ms
Isolation validée        : ${((data.metrics?.isolation_check_passed?.values?.rate ?? 0) * 100).toFixed(2)} %
FUITES DE DONNÉES        : ${breaches}  ${breaches === 0 ? 'OK' : 'CRITIQUE'}
Données cross-org visibles: ${crossVis} ${crossVis === 0 ? 'OK' : 'CRITIQUE'}
=========================================
`,
    'reports/multitenancy-load-summary.json': JSON.stringify(data, null, 2),
  };
}
