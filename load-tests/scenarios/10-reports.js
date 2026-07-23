// Scénario 10 : Génération de rapports
// PDF et Excel sous charge
import http from 'k6/http'
import { check, sleep } from 'k6'
import { login, getHeaders, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'
import { randomUser } from '../helpers/data.js'

export const options = {
  scenarios: { reports: { executor: 'constant-vus', vus: 15, duration: '5m' } },
  thresholds: {
    http_req_duration: ['p(95)<8000'], // génération PDF lente
    http_req_failed: ['rate<0.02'],
  },
}

export default function() {
  const token = login(randomUser().email, randomUser().password)
  const h = getHeaders(token)

  const formats = ['pdf', 'excel', 'csv']
  const format = formats[Math.floor(Math.random() * formats.length)]

  const res = http.get(
    `${BASE_URL}/api/v1/events/export?format=${format}&from=2026-01-01&to=2026-12-31`,
    { headers: h, responseType: 'binary' }
  )

  check(res, {
    'export 200': r => r.status === 200,
    'contenu non vide': r => r.body.length > 0,
  })

  sleep(Math.random() * 5 + 3)
}
