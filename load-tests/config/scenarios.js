/**
 * IBIG SECRETIS – Configuration centralisée des scénarios k6
 * Tous les scripts de test importent d'ici leurs options et seuils.
 */

// ---------------------------------------------------------------------------
// Seuils globaux partagés
// ---------------------------------------------------------------------------
export const globalThresholds = {
  // Latence
  http_req_duration: [
    'p(95)<500',   // 95e percentile < 500 ms
    'p(99)<1000',  // 99e percentile < 1 s
  ],
  // Taux d'erreur HTTP (4xx/5xx)
  http_req_failed: ['rate<0.01'], // < 1 %
  // Durée de blocage réseau
  http_req_blocked:    ['p(95)<100'],
  // Durée de connexion TCP
  http_req_connecting: ['p(95)<100'],
  // Durée TTFB
  http_req_waiting:    ['p(95)<400'],
};

// ---------------------------------------------------------------------------
// Smoke Test  – vérification basique, 1 VU, 1 min
// ---------------------------------------------------------------------------
export const smokeTest = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
  },
  thresholds: {
    ...globalThresholds,
    http_req_duration: ['p(95)<1000'], // seuil assoupli pour smoke
    http_req_failed:   ['rate<0.05'],
  },
};

// ---------------------------------------------------------------------------
// Load Test  – montée 0→50 VU, maintien 10 min, descente 1 min
// ---------------------------------------------------------------------------
export const loadTest = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m',  target: 50  }, // montée progressive
        { duration: '10m', target: 50  }, // maintien
        { duration: '1m',  target: 0   }, // descente
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'load' },
    },
  },
  thresholds: globalThresholds,
};

// ---------------------------------------------------------------------------
// Stress Test  – montée par paliers jusqu'à 200 VU (trouver le point de rupture)
// ---------------------------------------------------------------------------
export const stressTest = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m',  target: 50  }, // palier 1
        { duration: '3m',  target: 50  },
        { duration: '2m',  target: 100 }, // palier 2
        { duration: '3m',  target: 100 },
        { duration: '2m',  target: 150 }, // palier 3
        { duration: '3m',  target: 150 },
        { duration: '2m',  target: 200 }, // palier 4 – point de rupture
        { duration: '5m',  target: 200 },
        { duration: '2m',  target: 0   }, // retour au repos
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'stress' },
    },
  },
  thresholds: {
    ...globalThresholds,
    http_req_duration: ['p(95)<2000'], // seuil assoupli : stress intentionnel
    http_req_failed:   ['rate<0.10'],  // on tolère plus d'erreurs en stress
  },
};

// ---------------------------------------------------------------------------
// Spike Test  – 5 VU → 150 VU en 30s → retour à 5 VU
// ---------------------------------------------------------------------------
export const spikeTest = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '30s', target: 150 }, // pic soudain
        { duration: '1m',  target: 150 }, // maintien du pic
        { duration: '30s', target: 5   }, // retour rapide
        { duration: '2m',  target: 5   }, // observation post-spike
      ],
      gracefulRampDown: '10s',
      tags: { test_type: 'spike' },
    },
  },
  thresholds: {
    ...globalThresholds,
    http_req_duration: ['p(95)<1500'],
    http_req_failed:   ['rate<0.05'],
  },
};

// ---------------------------------------------------------------------------
// Soak Test  – 30 VU pendant 2 heures (détection fuites mémoire)
// ---------------------------------------------------------------------------
export const soakTest = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 30,
      duration: '2h',
      tags: { test_type: 'soak' },
    },
  },
  thresholds: {
    ...globalThresholds,
    // On surveille la dérive progressive : le p95 ne doit pas dépasser 600ms
    // même après 2h (signe de fuite mémoire ou de dégradation)
    http_req_duration: ['p(95)<600'],
    http_req_failed:   ['rate<0.01'],
  },
};

// ---------------------------------------------------------------------------
// Sélecteur dynamique (utilisé par full-journey.js via $TEST_TYPE)
// ---------------------------------------------------------------------------
const SCENARIO_MAP = {
  smoke:  smokeTest,
  load:   loadTest,
  stress: stressTest,
  spike:  spikeTest,
  soak:   soakTest,
};

/**
 * Retourne la configuration k6 correspondant à la variable d'env TEST_TYPE.
 * Exemple d'usage :
 *   export const options = getScenarioOptions();
 */
export function getScenarioOptions() {
  const type = __ENV.TEST_TYPE || 'smoke';
  const cfg  = SCENARIO_MAP[type];
  if (!cfg) {
    throw new Error(`TEST_TYPE inconnu : "${type}". Valeurs valides : ${Object.keys(SCENARIO_MAP).join(', ')}`);
  }
  return cfg;
}
