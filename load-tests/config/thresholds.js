// Seuils de performance acceptés (SLA SECRETIS)
export const THRESHOLDS = {
  // Temps de réponse
  http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% < 2s, 99% < 5s
  http_req_duration_static: ['p(95)<200'],          // assets statiques < 200ms
  http_req_duration_api: ['p(95)<1500'],            // API < 1.5s
  http_req_duration_upload: ['p(95)<5000'],          // upload < 5s

  // Disponibilité
  http_req_failed: ['rate<0.01'],    // < 1% d'erreurs

  // WebSocket
  ws_connecting: ['p(95)<500'],      // connexion WS < 500ms
  ws_msgs_received: ['count>100'],   // au moins 100 messages reçus

  // Métriques business
  checks: ['rate>0.99'],             // > 99% des checks passent
}

export const THRESHOLDS_LOAD = {
  ...THRESHOLDS,
  http_req_duration: ['p(95)<3000', 'p(99)<8000'], // plus permissif en charge
}

// Profils de charge
export const PROFILES = {
  smoke: {
    vus: 5,
    duration: '1m',
    description: 'Test rapide sanity-check (5 users, 1 min)',
  },
  average: {
    stages: [
      { duration: '2m', target: 50 },   // montée progressive
      { duration: '5m', target: 50 },   // maintien charge
      { duration: '2m', target: 0 },    // descente
    ],
    description: 'Charge moyenne (50 users, 9 min)',
  },
  peak: {
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 200 },  // pic de charge
      { duration: '2m', target: 100 },
      { duration: '2m', target: 0 },
    ],
    description: 'Pic de charge (200 users max, 11 min)',
  },
  stress: {
    stages: [
      { duration: '2m', target: 100 },
      { duration: '3m', target: 300 },
      { duration: '3m', target: 500 },  // stress test
      { duration: '2m', target: 0 },
    ],
    description: 'Stress test (500 users max, 10 min)',
  },
  soak: {
    stages: [
      { duration: '5m', target: 50 },
      { duration: '60m', target: 50 }, // charge soutenue 1h
      { duration: '5m', target: 0 },
    ],
    description: "Test d'endurance (50 users, 70 min)",
  },
}
