// Scénario 02 : Tableau de bord
// Simule des utilisateurs consultant leur dashboard (page la plus visitée)
import http from 'k6/http'
import { check, sleep } from 'k6'
import { login, getHeaders, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'
import { randomUser } from '../helpers/data.js'

export const options = {
  scenarios: { dashboard: { executor: 'constant-vus', vus: 100, duration: '5m' } },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function() {
  const { email, password } = randomUser()
  const token = login(email, password)
  const headers = getHeaders(token)

  // Charger le dashboard (plusieurs requêtes parallèles)
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/v1/dashboard/stats`, null, { headers }],
    ['GET', `${BASE_URL}/api/v1/events?upcoming=5`, null, { headers }],
    ['GET', `${BASE_URL}/api/v1/tasks?status=pending&limit=5`, null, { headers }],
    ['GET', `${BASE_URL}/api/v1/notifications/unread-count`, null, { headers }],
  ])

  check(responses[0], { 'dashboard stats 200': r => r.status === 200 })
  check(responses[1], { 'events 200': r => r.status === 200 })
  check(responses[2], { 'tasks 200': r => r.status === 200 })

  sleep(Math.random() * 3 + 2) // think time 2-5s
}
