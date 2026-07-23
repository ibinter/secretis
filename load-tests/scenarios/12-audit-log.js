// Scénario 12 : Journal d'audit sous charge
// L'audit log est écrit à chaque action → test de performance des requêtes en insertion
import http from 'k6/http'
import { check, sleep } from 'k6'
import { login, getHeaders, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'
import { randomUser } from '../helpers/data.js'

export const options = {
  scenarios: { audit: { executor: 'constant-vus', vus: 50, duration: '5m' } },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function() {
  const token = login(randomUser().email, randomUser().password)
  const h = getHeaders(token)

  // Déclencher des actions qui génèrent des entrées d'audit
  const actions = [
    () => http.get(`${BASE_URL}/api/v1/events`, { headers: h }),
    () => http.get(`${BASE_URL}/api/v1/documents`, { headers: h }),
    () => http.get(`${BASE_URL}/api/v1/tasks`, { headers: h }),
  ]

  actions[Math.floor(Math.random() * actions.length)]()

  // Consulter le journal d'audit (admin seulement)
  const auditRes = http.get(`${BASE_URL}/api/v1/audit-log?limit=50`, { headers: h })
  check(auditRes, { 'audit log accessible': r => r.status === 200 || r.status === 403 })

  sleep(Math.random() * 2 + 1)
}
