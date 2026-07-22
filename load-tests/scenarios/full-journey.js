/**
 * IBIG SECRETIS – Test de charge : Parcours utilisateur complet (E2E)
 *
 * Parcours réaliste :
 *  Login → Tableau de bord → Créer événement → Créer tâche
 *  → Uploader document → Envoyer message → Logout
 *
 * 50 VU exécutent ce parcours en boucle pendant 10 min
 * Think time réaliste (1–3s entre actions)
 * Métriques par étape
 */

import http  from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
  loginAsUser, logout, getHeaders, pickAccount,
} from '../helpers/auth.js';
import { getScenarioOptions } from '../config/scenarios.js';

// ---------------------------------------------------------------------------
// Configuration (sélection par TEST_TYPE env var)
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Options : smoke par défaut, surchargeable via TEST_TYPE
export const options = (() => {
  try {
    return getScenarioOptions();
  } catch {
    // Fallback si scenarios.js non disponible
    return {
      scenarios: {
        full_journey: {
          executor:  'constant-vus',
          vus:       50,
          duration:  '10m',
          tags:      { scenario: 'full-journey' },
        },
      },
      thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'],
        http_req_failed:   ['rate<0.01'],
      },
    };
  }
})();

// ---------------------------------------------------------------------------
// Métriques par étape
// ---------------------------------------------------------------------------
const stepDurations = {
  login:         new Trend('step_login_duration',         true),
  dashboard:     new Trend('step_dashboard_duration',     true),
  createEvent:   new Trend('step_create_event_duration',  true),
  createTask:    new Trend('step_create_task_duration',   true),
  uploadDoc:     new Trend('step_upload_doc_duration',    true),
  sendMessage:   new Trend('step_send_message_duration',  true),
  logout:        new Trend('step_logout_duration',        true),
};

const journeySuccess     = new Rate('journey_success_rate');
const journeyComplete    = new Counter('journey_complete_count');
const journeyFailed      = new Counter('journey_failed_count');
const stepFailures       = new Counter('step_failures');

// Durée bout-en-bout du parcours complet
const journeyDuration    = new Trend('journey_total_duration', true);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pause avec think time réaliste (1–3s) */
function think(min = 1, max = 3) {
  sleep(Math.random() * (max - min) + min);
}

/** Génère un faux PDF minimal */
function fakePdfContent() {
  return '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 2\ntrailer\n<< /Size 2 >>\n%%EOF';
}

// ---------------------------------------------------------------------------
// Étapes du parcours
// ---------------------------------------------------------------------------

function stepLogin() {
  const account = pickAccount();
  const start   = Date.now();

  const result = loginAsUser(BASE_URL, account.email, account.password, {
    tags: { step: 'login' },
  });

  stepDurations.login.add(Date.now() - start);

  if (!result.success || !result.token) {
    stepFailures.add(1);
    return null;
  }

  return result.token;
}

function stepDashboard(token) {
  const start = Date.now();

  const res = http.get(
    `${BASE_URL}/api/dashboard`,
    { headers: getHeaders(token), tags: { step: 'dashboard' } },
  );

  stepDurations.dashboard.add(Date.now() - start);

  return check(res, {
    'dashboard: status 200':       (r) => r.status === 200,
    'dashboard: durée < 500ms':    (r) => r.timings.duration < 500,
  });
}

function stepCreateEvent(token) {
  const now   = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() + Math.floor(Math.random() * 30) + 1);
  start.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  const t = Date.now();

  const res = http.post(
    `${BASE_URL}/api/events`,
    JSON.stringify({
      title:       `Réunion VU${__VU} – ${now.toLocaleDateString('fr-FR')}`,
      description: 'Événement créé via parcours E2E k6',
      start:       start.toISOString(),
      end:         end.toISOString(),
      all_day:     false,
    }),
    { headers: getHeaders(token), tags: { step: 'create_event' } },
  );

  stepDurations.createEvent.add(Date.now() - t);

  return check(res, {
    'créer événement: status 201':    (r) => r.status === 201,
    'créer événement: id présent':    (r) => {
      try { return !!JSON.parse(r.body).id; } catch { return false; }
    },
    'créer événement: < 500ms':       (r) => r.timings.duration < 500,
  });
}

function stepCreateTask(token) {
  const t = Date.now();

  const res = http.post(
    `${BASE_URL}/api/tasks`,
    JSON.stringify({
      title:       `Tâche k6 VU${__VU} iter${__ITER}`,
      description: 'Tâche créée lors du test de charge E2E',
      priority:    'medium',
      due_date:    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status:      'pending',
      tags:        ['k6', 'test'],
    }),
    { headers: getHeaders(token), tags: { step: 'create_task' } },
  );

  stepDurations.createTask.add(Date.now() - t);

  return check(res, {
    'créer tâche: status 201':    (r) => r.status === 201,
    'créer tâche: id présent':    (r) => {
      try { return !!JSON.parse(r.body).id; } catch { return false; }
    },
    'créer tâche: < 500ms':       (r) => r.timings.duration < 500,
  });
}

function stepUploadDocument(token) {
  const filename = `journey-doc-vu${__VU}-${Date.now()}.pdf`;
  const t        = Date.now();

  const res = http.post(
    `${BASE_URL}/api/documents`,
    {
      file:        http.file(fakePdfContent(), filename, 'application/pdf'),
      title:       `Document parcours VU${__VU}`,
      description: 'Upload E2E test k6',
      folder_id:   '1',
    },
    {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      timeout: '20s',
      tags:    { step: 'upload_document' },
    },
  );

  stepDurations.uploadDoc.add(Date.now() - t);

  return check(res, {
    'upload doc: status 201':    (r) => r.status === 201,
    'upload doc: id présent':    (r) => {
      try { return !!JSON.parse(r.body).id; } catch { return false; }
    },
    'upload doc: < 5s':          (r) => r.timings.duration < 5000,
  });
}

function stepSendMessage(token) {
  const t = Date.now();

  // Envoyer un message dans le canal général (messagerie interne)
  const res = http.post(
    `${BASE_URL}/api/messages`,
    JSON.stringify({
      channel:  'general',
      content:  `Message de test k6 VU${__VU} iter${__ITER} – ${new Date().toISOString()}`,
      type:     'text',
    }),
    { headers: getHeaders(token), tags: { step: 'send_message' } },
  );

  stepDurations.sendMessage.add(Date.now() - t);

  return check(res, {
    'envoyer message: status 201 ou 200': (r) => r.status === 201 || r.status === 200,
    'envoyer message: < 300ms':           (r) => r.timings.duration < 300,
  });
}

function stepLogout(token) {
  const t   = Date.now();
  const res = http.post(
    `${BASE_URL}/api/auth/logout`,
    null,
    { headers: getHeaders(token), tags: { step: 'logout' } },
  );

  stepDurations.logout.add(Date.now() - t);

  return check(res, {
    'logout: status 200 ou 204': (r) => r.status === 200 || r.status === 204,
    'logout: < 200ms':           (r) => r.timings.duration < 200,
  });
}

// ---------------------------------------------------------------------------
// Parcours principal
// ---------------------------------------------------------------------------
export default function () {
  const journeyStart = Date.now();
  let   allOk        = true;
  let   token        = null;

  // Étape 1 : Login
  group('1. Login', () => {
    token = stepLogin();
    if (!token) {
      allOk = false;
    }
  });

  if (!token) {
    journeyFailed.add(1);
    journeySuccess.add(false);
    sleep(2);
    return;
  }

  think(1, 2);

  // Étape 2 : Tableau de bord
  group('2. Tableau de bord', () => {
    if (!stepDashboard(token)) {
      stepFailures.add(1);
      allOk = false;
    }
  });
  think(1, 3);

  // Étape 3 : Créer événement
  group('3. Créer événement', () => {
    if (!stepCreateEvent(token)) {
      stepFailures.add(1);
      allOk = false;
    }
  });
  think(1, 3);

  // Étape 4 : Créer tâche
  group('4. Créer tâche', () => {
    if (!stepCreateTask(token)) {
      stepFailures.add(1);
      allOk = false;
    }
  });
  think(2, 4);

  // Étape 5 : Uploader document
  group('5. Upload document', () => {
    if (!stepUploadDocument(token)) {
      stepFailures.add(1);
      allOk = false;
    }
  });
  think(1, 3);

  // Étape 6 : Envoyer message
  group('6. Envoyer message', () => {
    if (!stepSendMessage(token)) {
      stepFailures.add(1);
      allOk = false;
    }
  });
  think(1, 2);

  // Étape 7 : Logout
  group('7. Logout', () => {
    if (!stepLogout(token)) {
      stepFailures.add(1);
      allOk = false;
    }
  });

  // Métriques de fin de parcours
  journeyDuration.add(Date.now() - journeyStart);
  journeySuccess.add(allOk);

  if (allOk) {
    journeyComplete.add(1);
  } else {
    journeyFailed.add(1);
  }

  // Délai entre deux parcours (respiration)
  sleep(Math.random() * 3 + 2);
}

// ---------------------------------------------------------------------------
// Résumé
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  const steps = [
    ['Login',             'step_login_duration'],
    ['Tableau de bord',   'step_dashboard_duration'],
    ['Créer événement',   'step_create_event_duration'],
    ['Créer tâche',       'step_create_task_duration'],
    ['Upload document',   'step_upload_doc_duration'],
    ['Envoyer message',   'step_send_message_duration'],
    ['Logout',            'step_logout_duration'],
  ];

  const stepReport = steps.map(([name, metric]) => {
    const p50 = data.metrics?.[metric]?.values?.['p(50)'] ?? 'N/A';
    const p95 = data.metrics?.[metric]?.values?.['p(95)'] ?? 'N/A';
    return `  ${name.padEnd(20)} p50=${p50}ms  p95=${p95}ms`;
  }).join('\n');

  return {
    'stdout': `
=== FULL JOURNEY LOAD TEST – RAPPORT ===
Type de test        : ${__ENV.TEST_TYPE || 'smoke'}
Parcours complets   : ${data.metrics?.journey_complete_count?.values?.count ?? 0}
Parcours échoués    : ${data.metrics?.journey_failed_count?.values?.count ?? 0}
Taux de succès      : ${((data.metrics?.journey_success_rate?.values?.rate ?? 0) * 100).toFixed(1)} %
Durée totale p95    : ${data.metrics?.journey_total_duration?.values?.['p(95)'] ?? 'N/A'} ms
Erreurs d'étapes    : ${data.metrics?.step_failures?.values?.count ?? 0}

Métriques par étape :
${stepReport}
=========================================
`,
    'reports/full-journey-summary.json': JSON.stringify(data, null, 2),
  };
}
