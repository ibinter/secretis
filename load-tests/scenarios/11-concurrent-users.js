// Scénario 11 : Utilisateurs concurrents mixtes (scénario réaliste)
// Simule un mix de tâches comme en production
import http from 'k6/http'
import { check, sleep } from 'k6'
import { login, getHeaders, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'
import { randomUser } from '../helpers/data.js'

export const options = {
  scenarios: {
    readers: {
      executor: 'constant-vus',
      vus: 80,
      duration: '10m',
      exec: 'readScenario',
    },
    writers: {
      executor: 'constant-vus',
      vus: 20,
      duration: '10m',
      exec: 'writeScenario',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
  },
}

export function readScenario() {
  const token = login(randomUser().email, randomUser().password)
  const h = getHeaders(token)

  const pages = [
    '/api/v1/events?upcoming=10',
    '/api/v1/tasks?status=pending',
    '/api/v1/documents?recent=20',
    '/api/v1/notifications?unread=true',
  ]

  http.batch(pages.map(p => ['GET', `${BASE_URL}${p}`, null, { headers: h }]))
  sleep(Math.random() * 5 + 2)
}

export function writeScenario() {
  const token = login(randomUser().email, randomUser().password)
  const h = getHeaders(token)

  http.post(`${BASE_URL}/api/v1/tasks`, JSON.stringify({
    title: `Tâche k6 ${Date.now()}`,
    priority: 'normal',
    status: 'pending',
  }), { headers: h })

  sleep(Math.random() * 8 + 4)
}
