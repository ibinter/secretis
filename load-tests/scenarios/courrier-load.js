/**
 * IBIG SECRETIS – Test de charge : Courrier (GRC)
 *
 * Objectifs :
 *  - 30 VU enregistrent des courriers en parallèle
 *  - Vérifie que les références sont uniques même sous charge (SELECT FOR UPDATE)
 *  - Aucune référence dupliquée sur 300 courriers créés simultanément
 *  - Test de recherche full-text sous charge
 */

import http  from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { requireLogin, getHeaders, pickAccount } from '../helpers/auth.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  scenarios: {
    // Création de courriers (30 VU, 300 itérations = 300 courriers)
    courrier_create: {
      executor:   'shared-iterations',
      vus:        30,
      iterations: 300,
      maxDuration:'5m',
      tags:       { scenario: 'courrier-create' },
      exec:       'createCourrier',
    },
    // Recherche full-text (20 VU en parallèle)
    courrier_search: {
      executor:   'constant-vus',
      vus:        20,
      duration:   '3m',
      startTime:  '1m',
      tags:       { scenario: 'courrier-search' },
      exec:       'searchCourrier',
    },
    // Liste des courriers (pagination)
    courrier_list: {
      executor:   'constant-vus',
      vus:        15,
      duration:   '3m',
      startTime:  '30s',
      tags:       { scenario: 'courrier-list' },
      exec:       'listCourriers',
    },
  },
  thresholds: {
    http_req_duration:              ['p(95)<500', 'p(99)<1000'],
    http_req_failed:                ['rate<0.01'],
    'courrier_create_duration':     ['p(95)<600'],
    'courrier_search_duration':     ['p(95)<300'],
    'duplicate_references':         ['count<1'],    // CRITIQUE : 0 doublon accepté
    'reference_unique_rate':        ['rate>0.999'], // 99.9 % de références uniques
  },
};

// ---------------------------------------------------------------------------
// Métriques custom
// ---------------------------------------------------------------------------
const courrierCreateDuration = new Trend('courrier_create_duration', true);
const courrierSearchDuration = new Trend('courrier_search_duration', true);
const duplicateReferences    = new Counter('duplicate_references');
const referenceUniqueRate    = new Rate('reference_unique_rate');
const referencesCreated      = new Counter('references_created');

// Registre partagé des références créées (dans le contexte k6, ceci reste local au VU)
// Pour une vérification inter-VU, on utilise l'API /api/courriers/check-ref
const localReferences = new Set();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TYPES_COURRIER = ['entrant', 'sortant', 'interne'];
const PRIORITES      = ['normale', 'urgente', 'confidentielle'];
const SERVICES       = ['Direction', 'RH', 'Comptabilité', 'Commercial', 'Informatique', 'Juridique'];
const OBJETS = [
  'Demande de renseignements',
  'Contrat de prestation',
  'Facture mensuelle',
  'Rapport d\'activité',
  'Convocation réunion',
  'Courrier administratif',
  'Note de service',
  'Demande de congés',
  'Réclamation client',
  'Offre commerciale',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let _token = null;
function ensureToken() {
  if (!_token) _token = requireLogin(BASE_URL, pickAccount());
  return _token;
}

// ---------------------------------------------------------------------------
// Scénario 1 : Création de courriers avec vérification unicité référence
// ---------------------------------------------------------------------------
export function createCourrier() {
  const token = ensureToken();

  const payload = JSON.stringify({
    type:             pick(TYPES_COURRIER),
    objet:            `${pick(OBJETS)} – iter ${__ITER}`,
    expediteur:       `Expéditeur Test ${__VU}`,
    destinataire:     pick(SERVICES),
    service_destinataire: pick(SERVICES),
    priorite:         pick(PRIORITES),
    date_reception:   new Date().toISOString().split('T')[0],
    description:      `Courrier de test k6 VU=${__VU} ITER=${__ITER} - contenu searchable`,
    tags:             ['test', 'k6', 'load'],
    confidentiel:     Math.random() < 0.1,
  });

  group('POST /api/courriers', () => {
    const start = Date.now();

    const res = http.post(
      `${BASE_URL}/api/courriers`,
      payload,
      {
        headers: getHeaders(token),
        tags:    { operation: 'courrier_create' },
      },
    );

    courrierCreateDuration.add(Date.now() - start);

    let reference = null;
    let isValid   = false;

    try {
      const body = JSON.parse(res.body);
      reference  = body.reference || body.numero_reference;
      isValid    = res.status === 201 && !!reference;
    } catch { /* ignore */ }

    check(res, {
      'courrier POST: status 201':           (r) => r.status === 201,
      'courrier POST: référence générée':    () => !!reference,
      'courrier POST: référence non vide':   () => reference && reference.length > 0,
      'courrier POST: durée < 600ms':        (r) => r.timings.duration < 600,
    });

    if (reference) {
      referencesCreated.add(1);

      // Vérification locale (même VU)
      if (localReferences.has(reference)) {
        duplicateReferences.add(1);
        referenceUniqueRate.add(false);
        console.error(`DOUBLON DÉTECTÉ (local) : ${reference} – VU=${__VU} ITER=${__ITER}`);
      } else {
        localReferences.add(reference);
        referenceUniqueRate.add(true);
      }

      // Vérification serveur : interroge l'endpoint de vérification unicité
      const checkRes = http.get(
        `${BASE_URL}/api/courriers/check-reference?ref=${reference}`,
        {
          headers: getHeaders(token),
          tags:    { operation: 'reference_check' },
        },
      );

      check(checkRes, {
        'référence unique côté serveur': (r) => {
          try {
            const b = JSON.parse(r.body);
            return b.unique === true || b.count === 1;
          } catch { return false; }
        },
      });
    }
  });

  sleep(Math.random() * 0.5); // délai minimal pour maximiser la concurrence
}

// ---------------------------------------------------------------------------
// Scénario 2 : Recherche full-text
// ---------------------------------------------------------------------------
export function searchCourrier() {
  const token = ensureToken();

  const SEARCH_TERMS = [
    'test k6',
    'contrat prestation',
    'administratif',
    'réunion',
    'facture',
    'searchable',
  ];

  const term = pick(SEARCH_TERMS);

  group('GET /api/courriers/search', () => {
    const start = Date.now();

    const res = http.get(
      `${BASE_URL}/api/courriers/search?q=${encodeURIComponent(term)}&per_page=20`,
      {
        headers: getHeaders(token),
        tags:    { operation: 'courrier_search' },
      },
    );

    courrierSearchDuration.add(Date.now() - start);

    check(res, {
      'recherche: status 200':         (r) => r.status === 200,
      'recherche: body est objet':     (r) => {
        try { const b = JSON.parse(r.body); return typeof b === 'object'; } catch { return false; }
      },
      'recherche: résultats présents': (r) => {
        try {
          const b = JSON.parse(r.body);
          return Array.isArray(b.data) || Array.isArray(b);
        } catch { return false; }
      },
      'recherche: durée < 300ms':      (r) => r.timings.duration < 300,
    });
  });

  sleep(Math.random() * 2 + 1);
}

// ---------------------------------------------------------------------------
// Scénario 3 : Liste paginée des courriers
// ---------------------------------------------------------------------------
export function listCourriers() {
  const token  = ensureToken();
  const page   = Math.floor(Math.random() * 5) + 1;
  const filter = pick(['', '?type=entrant', '?type=sortant', '?priorite=urgente']);

  group('GET /api/courriers (pagination)', () => {
    const res = http.get(
      `${BASE_URL}/api/courriers?page=${page}&per_page=25${filter.replace('?', '&')}`,
      {
        headers: getHeaders(token),
        tags:    { operation: 'courrier_list' },
      },
    );

    check(res, {
      'liste: status 200':            (r) => r.status === 200,
      'liste: pagination présente':   (r) => {
        try {
          const b = JSON.parse(r.body);
          return b.current_page !== undefined || b.meta?.current_page !== undefined;
        } catch { return false; }
      },
      'liste: durée < 400ms':         (r) => r.timings.duration < 400,
    });
  });

  sleep(Math.random() * 2 + 0.5);
}

// ---------------------------------------------------------------------------
// Résumé
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  const dupes = data.metrics?.duplicate_references?.values?.count ?? 0;
  return {
    'stdout': `
=== COURRIER LOAD TEST – RAPPORT ===
p95 création         : ${data.metrics?.courrier_create_duration?.values?.['p(95)'] ?? 'N/A'} ms
p95 recherche        : ${data.metrics?.courrier_search_duration?.values?.['p(95)'] ?? 'N/A'} ms
Références créées    : ${data.metrics?.references_created?.values?.count ?? 0}
DOUBLONS DÉTECTÉS    : ${dupes}  ${dupes > 0 ? '⚠ CRITIQUE' : '✓ OK'}
=====================================
`,
    'reports/courrier-load-summary.json': JSON.stringify(data, null, 2),
  };
}
