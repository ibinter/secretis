/**
 * IBIG SECRETIS – Test de charge : Agenda / Calendrier
 *
 * Objectifs :
 *  - GET /events (mois courant) : 100 VU
 *  - POST /events (création) : 20 VU simultanés
 *  - Détection de conflits sous charge (2 VU créent le même créneau)
 *  - Réponse FullCalendar < 200ms à 50 VU
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
    // Lecture à 100 VU
    calendar_read: {
      executor:  'constant-vus',
      vus:       100,
      duration:  '5m',
      tags:      { scenario: 'agenda-read' },
      exec:      'readCalendar',
    },
    // Création à 20 VU simultanés (démarre après 1m)
    calendar_write: {
      executor:   'constant-vus',
      vus:        20,
      duration:   '3m',
      startTime:  '1m',
      tags:       { scenario: 'agenda-write' },
      exec:       'createEvent',
    },
    // Test de conflit (2 VU, 1 seule exécution décalée)
    conflict_test: {
      executor:   'shared-iterations',
      vus:        2,
      iterations: 20,
      startTime:  '2m',
      tags:       { scenario: 'agenda-conflict' },
      exec:       'conflictTest',
    },
  },
  thresholds: {
    http_req_duration:                ['p(95)<500',  'p(99)<1000'],
    http_req_failed:                  ['rate<0.01'],
    'calendar_read_duration':         ['p(95)<200'],  // SLA FullCalendar
    'event_create_duration':          ['p(95)<500'],
    'conflict_detected':              ['count>=1'],   // au moins 1 conflit détecté
    'duplicate_event_created':        ['count<1'],    // aucun doublon accepté
  },
};

// ---------------------------------------------------------------------------
// Métriques custom
// ---------------------------------------------------------------------------
const calendarReadDuration  = new Trend('calendar_read_duration',  true);
const eventCreateDuration   = new Trend('event_create_duration',   true);
const conflictDetected      = new Counter('conflict_detected');
const duplicateEventCreated = new Counter('duplicate_event_created');
const fcResponseRate        = new Rate('fullcalendar_under_200ms');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function currentMonthRange() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

function randomFutureSlot(offsetDays = 0) {
  const base = new Date();
  base.setDate(base.getDate() + offsetDays);
  const hour  = 9 + Math.floor(Math.random() * 8); // 9h–17h
  const start = new Date(base);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(hour + 1, 0, 0, 0);
  return {
    start: start.toISOString(),
    end:   end.toISOString(),
  };
}

// Cache de tokens par VU (non partagé entre VUs)
let _token = null;

function ensureToken() {
  if (!_token) {
    _token = requireLogin(BASE_URL, pickAccount());
  }
  return _token;
}

// ---------------------------------------------------------------------------
// Scénario 1 : Lecture du calendrier (100 VU)
// ---------------------------------------------------------------------------
export function readCalendar() {
  const token = ensureToken();
  const { start, end } = currentMonthRange();

  group('GET /events – mois courant', () => {
    const res = http.get(
      `${BASE_URL}/api/events?start=${start}&end=${end}&view=month`,
      {
        headers: getHeaders(token),
        tags:    { operation: 'calendar_read' },
      },
    );

    const duration = res.timings.duration;
    calendarReadDuration.add(duration);
    fcResponseRate.add(duration < 200);

    check(res, {
      'agenda GET: status 200':           (r) => r.status === 200,
      'agenda GET: body est un tableau':  (r) => {
        try { return Array.isArray(JSON.parse(r.body)); } catch { return false; }
      },
      'agenda GET: < 200ms':              (r) => r.timings.duration < 200,
      'agenda GET: Content-Type JSON':    (r) => (r.headers['Content-Type'] || '').includes('json'),
    });
  });

  sleep(Math.random() * 3 + 1); // 1–4 s
}

// ---------------------------------------------------------------------------
// Scénario 2 : Création d'événements (20 VU)
// ---------------------------------------------------------------------------
export function createEvent() {
  const token = ensureToken();
  const slot  = randomFutureSlot(Math.floor(Math.random() * 30) + 1);

  const payload = JSON.stringify({
    title:       `Test Event VU-${__VU} iter-${__ITER}`,
    description: 'Événement créé par le test de charge k6',
    start:       slot.start,
    end:         slot.end,
    all_day:     false,
    color:       '#3B82F6',
    location:    'Salle de test',
    attendees:   [],
  });

  group('POST /events – création', () => {
    const start = Date.now();

    const res = http.post(
      `${BASE_URL}/api/events`,
      payload,
      {
        headers: getHeaders(token),
        tags:    { operation: 'event_create' },
      },
    );

    eventCreateDuration.add(Date.now() - start);

    check(res, {
      'agenda POST: status 201':       (r) => r.status === 201,
      'agenda POST: id présent':       (r) => {
        try { return !!JSON.parse(r.body).id; } catch { return false; }
      },
      'agenda POST: titre correct':    (r) => {
        try {
          const b = JSON.parse(r.body);
          return b.title && b.title.startsWith('Test Event');
        } catch { return false; }
      },
      'agenda POST: durée < 500ms':    (r) => r.timings.duration < 500,
    });
  });

  sleep(Math.random() * 2 + 0.5);
}

// ---------------------------------------------------------------------------
// Scénario 3 : Test de conflit (2 VU créent le même créneau)
// ---------------------------------------------------------------------------
export function conflictTest() {
  const token = ensureToken();

  // Créneau fixe partagé entre les 2 VUs
  const CONFLICT_SLOT = {
    title: 'CONFLICT TEST SLOT',
    start: '2025-12-15T10:00:00Z',
    end:   '2025-12-15T11:00:00Z',
  };

  group('Détection de conflit sous charge', () => {
    const res = http.post(
      `${BASE_URL}/api/events`,
      JSON.stringify(CONFLICT_SLOT),
      {
        headers: getHeaders(token),
        tags:    { operation: 'conflict_create' },
      },
    );

    // L'un des deux VUs devrait obtenir 201, l'autre 409 (conflit)
    const gotConflict = res.status === 409;
    const gotCreated  = res.status === 201;

    if (gotConflict) {
      conflictDetected.add(1);
      check(res, {
        'conflit: status 409':           (r) => r.status === 409,
        'conflit: message explicite':    (r) => {
          try { return !!JSON.parse(r.body).message; } catch { return false; }
        },
      });
    } else if (gotCreated) {
      check(res, {
        'créneau créé: status 201': (r) => r.status === 201,
      });
    } else {
      // Ni 201 ni 409 → doublon potentiel ou erreur inattendue
      duplicateEventCreated.add(1);
      check(res, {
        'conflit: réponse attendue (201 ou 409)': () => false,
      });
    }
  });

  sleep(0.1); // délai minimal pour maximiser la concurrence
}

// ---------------------------------------------------------------------------
// Résumé
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  return {
    'stdout': `
=== AGENDA LOAD TEST – RAPPORT ===
p95 lecture calendrier : ${data.metrics?.calendar_read_duration?.values?.['p(95)'] ?? 'N/A'} ms
p95 création événement : ${data.metrics?.event_create_duration?.values?.['p(95)'] ?? 'N/A'} ms
FullCalendar < 200ms   : ${((data.metrics?.fullcalendar_under_200ms?.values?.rate ?? 0) * 100).toFixed(1)} %
Conflits détectés      : ${data.metrics?.conflict_detected?.values?.count ?? 0}
Doublons créés         : ${data.metrics?.duplicate_event_created?.values?.count ?? 0}
==================================
`,
    'reports/agenda-load-summary.json': JSON.stringify(data, null, 2),
  };
}
