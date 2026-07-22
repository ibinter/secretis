/**
 * IBIG SECRETIS – Test de charge : WebSockets (Laravel Reverb)
 *
 * Objectifs :
 *  - 200 connexions WebSocket simultanées
 *  - Envoi de messages en temps réel
 *  - Vérifie la latence des messages (< 100ms)
 *  - Test de reconnexion automatique
 *
 * NOTE : k6 supporte les WebSockets nativement via le module k6/ws.
 */

import ws    from 'k6/ws';
import http  from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { requireLogin, getHeaders, pickAccount } from '../helpers/auth.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL    || 'http://localhost:8000';
const WS_URL   = __ENV.WS_URL     || 'ws://localhost:8080';  // Laravel Reverb
const APP_KEY  = __ENV.REVERB_KEY || 'app-key';

export const options = {
  scenarios: {
    // Connexions simultanées (200 VU)
    ws_connections: {
      executor:   'ramping-vus',
      startVUs:   0,
      stages: [
        { duration: '1m',  target: 50  },
        { duration: '2m',  target: 200 },
        { duration: '3m',  target: 200 },
        { duration: '1m',  target: 0   },
      ],
      tags: { scenario: 'ws-load' },
      exec: 'wsLoadTest',
    },
    // Test de reconnexion (10 VU, déconnexions volontaires)
    ws_reconnect: {
      executor:   'constant-vus',
      vus:        10,
      duration:   '3m',
      startTime:  '2m',
      tags:       { scenario: 'ws-reconnect' },
      exec:       'wsReconnectTest',
    },
  },
  thresholds: {
    // WebSocket
    'ws_connecting':            ['p(95)<500'],
    'ws_msgs_sent':             ['count>0'],
    'ws_session_duration':      ['p(95)<65000'],  // durée session WS
    // Métriques custom
    'message_latency':          ['p(95)<100'],     // latence message < 100ms
    'ws_connect_success_rate':  ['rate>0.95'],
    'ws_reconnect_success':     ['rate>0.90'],
    'ws_errors':                ['count<10'],
  },
};

// ---------------------------------------------------------------------------
// Métriques custom
// ---------------------------------------------------------------------------
const messageLatency       = new Trend('message_latency',       true);
const wsConnectSuccessRate = new Rate('ws_connect_success_rate');
const wsReconnectSuccess   = new Rate('ws_reconnect_success');
const wsErrors             = new Counter('ws_errors');
const messagesReceived     = new Counter('messages_received');
const messagesSent         = new Counter('messages_sent');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let _token  = null;
let _userId = null;

function ensureToken() {
  if (!_token) {
    const account = pickAccount();
    const res     = requireLogin(BASE_URL, account);
    _token  = res; // requireLogin retourne le token
    // Récupérer l'userId
    const meRes = http.get(`${BASE_URL}/api/auth/me`, {
      headers: getHeaders(_token),
    });
    try { _userId = JSON.parse(meRes.body).id; } catch { _userId = __VU; }
  }
  return _token;
}

function buildWsUrl(token) {
  // Pusher-compatible URL (Laravel Reverb)
  return `${WS_URL}/app/${APP_KEY}?protocol=7&client=js&version=7.4.0&flash=false`;
}

// ---------------------------------------------------------------------------
// Scénario 1 : Test de charge WebSocket
// ---------------------------------------------------------------------------
export function wsLoadTest() {
  const token = ensureToken();
  const wsUrl = buildWsUrl(token);

  const connectStart = Date.now();
  let   connected    = false;
  let   pingStart    = 0;

  const res = ws.connect(
    wsUrl,
    {
      headers: { 'Authorization': `Bearer ${token}` },
      tags:    { operation: 'ws_connect' },
    },
    function (socket) {
      socket.on('open', () => {
        connected = true;
        wsConnectSuccessRate.add(true);

        // Authentification Pusher/Reverb
        socket.send(JSON.stringify({
          event: 'pusher:subscribe',
          data:  { channel: `private-user.${_userId}` },
        }));

        // S'abonner au canal général de notifications
        socket.send(JSON.stringify({
          event: 'pusher:subscribe',
          data:  { channel: 'notifications' },
        }));

        messagesSent.add(1);

        // Envoi périodique de messages (toutes les 5s)
        socket.setInterval(() => {
          pingStart = Date.now();
          socket.send(JSON.stringify({
            event: 'client-ping',
            data:  { timestamp: pingStart, vu: __VU },
            channel: `private-user.${_userId}`,
          }));
          messagesSent.add(1);
        }, 5000);

        // Fermer après 60s
        socket.setTimeout(() => {
          socket.close();
        }, 60000);
      });

      socket.on('message', (data) => {
        messagesReceived.add(1);

        try {
          const msg = JSON.parse(data);

          // Mesure latence sur les pongs
          if (msg.event === 'client-pong' || msg.event === 'pusher:pong') {
            if (pingStart > 0) {
              messageLatency.add(Date.now() - pingStart);
              pingStart = 0;
            }
          }

          // Vérification connexion établie
          if (msg.event === 'pusher:connection_established') {
            check(msg, {
              'WS: connection_established reçu': (m) => m.event === 'pusher:connection_established',
              'WS: socket_id présent':           (m) => {
                try { return !!JSON.parse(m.data).socket_id; } catch { return false; }
              },
            });
          }

          // Vérification subscription success
          if (msg.event === 'pusher_internal:subscription_succeeded') {
            check(msg, {
              'WS: subscription_succeeded':  (m) => m.event === 'pusher_internal:subscription_succeeded',
            });
          }

        } catch { /* ignore messages non-JSON */ }
      });

      socket.on('error', (e) => {
        wsErrors.add(1);
        wsConnectSuccessRate.add(false);
        check(e, {
          'WS: pas d\'erreur critique': () => false,
        });
      });

      socket.on('close', () => {
        // Connexion fermée proprement
      });
    },
  );

  if (!connected) {
    wsConnectSuccessRate.add(false);
    wsErrors.add(1);
  }

  check(res, {
    'WS connect: code 101 (upgrade)': (r) => r && r.status === 101,
  });

  sleep(Math.random() * 2 + 1);
}

// ---------------------------------------------------------------------------
// Scénario 2 : Test de reconnexion automatique
// ---------------------------------------------------------------------------
export function wsReconnectTest() {
  const token = ensureToken();
  const wsUrl = buildWsUrl(token);

  group('Test reconnexion WS', () => {
    let reconnectCount  = 0;
    let reconnectOk     = false;

    // Première connexion
    ws.connect(wsUrl, {}, function (socket) {
      socket.on('open', () => {
        // Déconnexion volontaire après 2s
        socket.setTimeout(() => socket.close(), 2000);
      });
      socket.on('close', () => { reconnectCount++; });
    });

    sleep(0.5);

    // Tentative de reconnexion (simule le comportement du client)
    const reconnectStart = Date.now();
    ws.connect(wsUrl, {}, function (socket) {
      socket.on('open', () => {
        reconnectOk = true;
        wsReconnectSuccess.add(true);

        const latency = Date.now() - reconnectStart;
        messageLatency.add(latency);

        check({ latency }, {
          'reconnexion: latence < 2s':    (d) => d.latency < 2000,
          'reconnexion: latence < 5s':    (d) => d.latency < 5000,
        });

        socket.setTimeout(() => socket.close(), 5000);
      });

      socket.on('error', () => {
        wsReconnectSuccess.add(false);
      });
    });

    if (!reconnectOk) {
      wsReconnectSuccess.add(false);
    }

    check({ reconnectCount }, {
      'reconnexion: au moins 1 cycle effectué': (d) => d.reconnectCount >= 1,
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
=== WEBSOCKET LOAD TEST – RAPPORT ===
p95 latence message  : ${data.metrics?.message_latency?.values?.['p(95)'] ?? 'N/A'} ms
Taux connexion OK    : ${((data.metrics?.ws_connect_success_rate?.values?.rate ?? 0) * 100).toFixed(1)} %
Taux reconnexion OK  : ${((data.metrics?.ws_reconnect_success?.values?.rate ?? 0) * 100).toFixed(1)} %
Messages envoyés     : ${data.metrics?.messages_sent?.values?.count ?? 0}
Messages reçus       : ${data.metrics?.messages_received?.values?.count ?? 0}
Erreurs WS           : ${data.metrics?.ws_errors?.values?.count ?? 0}
======================================
`,
    'reports/websocket-load-summary.json': JSON.stringify(data, null, 2),
  };
}
