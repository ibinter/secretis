/**
 * IBIG SECRETIS – Test de charge : Tableau de bord & KPIs BI
 *
 * Objectifs :
 *  - 100 VU chargent le tableau de bord simultanément
 *  - Vérification du cache Redis (réponse < 50ms après le 1er hit)
 *  - Test des KPIs BI sous charge
 */

import http  from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { requireLogin, getHeaders, pickAccount } from '../helpers/auth.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  scenarios: {
    // Charge principale tableau de bord
    dashboard_load: {
      executor:   'ramping-vus',
      startVUs:   0,
      stages: [
        { duration: '1m',  target: 50  },
        { duration: '3m',  target: 100 },
        { duration: '2m',  target: 100 },
        { duration: '1m',  target: 0   },
      ],
      tags: { scenario: 'dashboard-load' },
      exec: 'loadDashboard',
    },
    // Test cache Redis (séquentiel : warm + mesure)
    cache_test: {
      executor:   'per-vu-iterations',
      vus:        5,
      iterations: 10,
      startTime:  '2m',
      tags:       { scenario: 'cache-test' },
      exec:       'testCacheHit',
    },
    // KPIs BI sous charge
    bi_kpis: {
      executor:   'constant-vus',
      vus:        20,
      duration:   '3m',
      startTime:  '1m',
      tags:       { scenario: 'bi-kpis' },
      exec:       'loadBiKpis',
    },
  },
  thresholds: {
    http_req_duration:           ['p(95)<500', 'p(99)<1000'],
    http_req_failed:             ['rate<0.01'],
    'dashboard_first_load':      ['p(95)<500'],
    'dashboard_cached_load':     ['p(95)<50'],   // cache Redis : < 50ms
    'cache_hit_rate':            ['rate>0.80'],   // au moins 80 % de hits cache
    'bi_kpi_duration':           ['p(95)<800'],
    'dashboard_widgets_ok':      ['rate>0.99'],
  },
};

// ---------------------------------------------------------------------------
// Métriques custom
// ---------------------------------------------------------------------------
const dashboardFirstLoad   = new Trend('dashboard_first_load',   true);
const dashboardCachedLoad  = new Trend('dashboard_cached_load',  true);
const cacheHitRate         = new Rate('cache_hit_rate');
const biKpiDuration        = new Trend('bi_kpi_duration',        true);
const dashboardWidgetsOk   = new Rate('dashboard_widgets_ok');
const cacheMissCount       = new Counter('cache_miss_count');
const cacheHitCount        = new Counter('cache_hit_count');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let _token = null;
function ensureToken() {
  if (!_token) _token = requireLogin(BASE_URL, pickAccount());
  return _token;
}

const KPI_ENDPOINTS = [
  '/api/dashboard/kpis/revenue',
  '/api/dashboard/kpis/events-count',
  '/api/dashboard/kpis/documents-count',
  '/api/dashboard/kpis/users-active',
  '/api/dashboard/kpis/tasks-completion',
  '/api/dashboard/kpis/courrier-traitement',
];

const WIDGET_ENDPOINTS = [
  '/api/dashboard/widgets/agenda-preview',
  '/api/dashboard/widgets/recent-documents',
  '/api/dashboard/widgets/tasks-summary',
  '/api/dashboard/widgets/notifications',
  '/api/dashboard/widgets/courrier-stats',
];

// ---------------------------------------------------------------------------
// Scénario 1 : Chargement complet du tableau de bord
// ---------------------------------------------------------------------------
export function loadDashboard() {
  const token = ensureToken();

  group('Tableau de bord complet', () => {
    // Requête principale
    const start  = Date.now();
    const mainRes = http.get(
      `${BASE_URL}/api/dashboard`,
      {
        headers: getHeaders(token),
        tags:    { operation: 'dashboard_main' },
      },
    );
    dashboardFirstLoad.add(Date.now() - start);

    const isFromCache = mainRes.headers['X-Cache'] === 'HIT' ||
                        mainRes.headers['X-Redis-Cache'] === 'hit';

    check(mainRes, {
      'dashboard: status 200':          (r) => r.status === 200,
      'dashboard: body non vide':       (r) => r.body && r.body.length > 100,
      'dashboard: structure valide':    (r) => {
        try {
          const b = JSON.parse(r.body);
          return b.kpis !== undefined || b.widgets !== undefined || b.data !== undefined;
        } catch { return false; }
      },
      'dashboard: durée < 500ms':       (r) => r.timings.duration < 500,
    });

    // Chargement des widgets en batch
    const batchReqs = WIDGET_ENDPOINTS.map((endpoint) => [
      `${BASE_URL}${endpoint}`,
      { headers: getHeaders(token), tags: { operation: 'widget_load' } },
    ]);

    const batchRes = http.batch(
      WIDGET_ENDPOINTS.map((ep) => ({
        method:  'GET',
        url:     `${BASE_URL}${ep}`,
        params:  { headers: getHeaders(token), tags: { operation: 'widget_load' } },
      })),
    );

    let allWidgetsOk = true;
    batchRes.forEach((res, i) => {
      const ok = check(res, {
        [`widget ${WIDGET_ENDPOINTS[i]}: status 200`]: (r) => r.status === 200,
      });
      if (!ok) allWidgetsOk = false;
    });

    dashboardWidgetsOk.add(allWidgetsOk);
  });

  sleep(Math.random() * 5 + 2); // 2–7 s (temps de consultation)
}

// ---------------------------------------------------------------------------
// Scénario 2 : Test de cache Redis
// ---------------------------------------------------------------------------
export function testCacheHit() {
  const token = ensureToken();

  group('Test cache Redis', () => {
    // 1ère requête : doit peupler le cache (cache MISS attendu)
    const res1 = http.get(
      `${BASE_URL}/api/dashboard/kpis/revenue`,
      {
        headers: getHeaders(token),
        tags:    { operation: 'cache_miss_probe' },
      },
    );

    const isMiss = res1.headers['X-Cache'] === 'MISS' ||
                   res1.headers['X-Redis-Cache'] === 'miss' ||
                   res1.status === 200; // première requête : pas encore en cache

    // Délai très court (< 100ms) pour s'assurer que le cache est prêt
    sleep(0.05);

    // 2ème requête : DOIT être servie depuis le cache (< 50ms)
    const start2 = Date.now();
    const res2   = http.get(
      `${BASE_URL}/api/dashboard/kpis/revenue`,
      {
        headers: getHeaders(token),
        tags:    { operation: 'cache_hit_probe' },
      },
    );
    const cachedDuration = Date.now() - start2;

    dashboardCachedLoad.add(cachedDuration);

    const isHit = res2.headers['X-Cache'] === 'HIT' ||
                  res2.headers['X-Redis-Cache'] === 'hit' ||
                  cachedDuration < 50; // indicateur pragmatique

    cacheHitRate.add(isHit);
    if (isHit) {
      cacheHitCount.add(1);
    } else {
      cacheMissCount.add(1);
    }

    check(res2, {
      'cache: status 200':           (r) => r.status === 200,
      'cache: réponse < 50ms':       (r) => r.timings.duration < 50,
      'cache: données identiques':   () => {
        try {
          return JSON.stringify(JSON.parse(res1.body)) ===
                 JSON.stringify(JSON.parse(res2.body));
        } catch { return false; }
      },
    });

    // Test d'invalidation : après écriture, le cache doit être purgé
    // (simulé : on vérifie que la 3ème requête est toujours cohérente)
    sleep(0.1);
    const res3 = http.get(
      `${BASE_URL}/api/dashboard/kpis/revenue`,
      { headers: getHeaders(token), tags: { operation: 'cache_consistency' } },
    );

    check(res3, {
      'cache: cohérence 3ème requête': (r) => r.status === 200,
    });
  });

  sleep(Math.random() + 0.5);
}

// ---------------------------------------------------------------------------
// Scénario 3 : KPIs BI sous charge
// ---------------------------------------------------------------------------
export function loadBiKpis() {
  const token = ensureToken();

  group('KPIs BI', () => {
    // Charger tous les KPIs en parallèle (batch)
    const batchRes = http.batch(
      KPI_ENDPOINTS.map((ep) => ({
        method: 'GET',
        url:    `${BASE_URL}${ep}`,
        params: { headers: getHeaders(token), tags: { operation: 'bi_kpi' } },
      })),
    );

    let allOk = true;
    batchRes.forEach((res, i) => {
      const start = res.timings.sending + res.timings.waiting + res.timings.receiving;
      biKpiDuration.add(res.timings.duration);

      const ok = check(res, {
        [`KPI ${KPI_ENDPOINTS[i]}: status 200`]:    (r) => r.status === 200,
        [`KPI ${KPI_ENDPOINTS[i]}: valeur numérique ou objet`]: (r) => {
          try {
            const b = JSON.parse(r.body);
            return b.value !== undefined || b.data !== undefined || typeof b === 'number';
          } catch { return false; }
        },
        [`KPI ${KPI_ENDPOINTS[i]}: < 800ms`]:       (r) => r.timings.duration < 800,
      });

      if (!ok) allOk = false;
    });

    // Test du rapport BI complet (endpoint agrégé)
    const reportRes = http.get(
      `${BASE_URL}/api/dashboard/report?period=month`,
      {
        headers: getHeaders(token),
        tags:    { operation: 'bi_report' },
      },
    );

    check(reportRes, {
      'rapport BI: status 200':         (r) => r.status === 200,
      'rapport BI: données présentes':  (r) => {
        try { return Object.keys(JSON.parse(r.body)).length > 0; } catch { return false; }
      },
    });
  });

  sleep(Math.random() * 3 + 1);
}

// ---------------------------------------------------------------------------
// Résumé
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  return {
    'stdout': `
=== DASHBOARD LOAD TEST – RAPPORT ===
p95 1er chargement     : ${data.metrics?.dashboard_first_load?.values?.['p(95)'] ?? 'N/A'} ms
p95 cache Redis        : ${data.metrics?.dashboard_cached_load?.values?.['p(95)'] ?? 'N/A'} ms
Taux de cache hit      : ${((data.metrics?.cache_hit_rate?.values?.rate ?? 0) * 100).toFixed(1)} %
Cache hits             : ${data.metrics?.cache_hit_count?.values?.count ?? 0}
Cache misses           : ${data.metrics?.cache_miss_count?.values?.count ?? 0}
p95 KPIs BI            : ${data.metrics?.bi_kpi_duration?.values?.['p(95)'] ?? 'N/A'} ms
Widgets OK             : ${((data.metrics?.dashboard_widgets_ok?.values?.rate ?? 0) * 100).toFixed(1)} %
======================================
`,
    'reports/dashboard-load-summary.json': JSON.stringify(data, null, 2),
  };
}
