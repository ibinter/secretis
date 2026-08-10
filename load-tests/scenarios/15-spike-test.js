// Scénario 15 : Test de spike (montée brutale de charge)
// Simule un pic soudain (ex: campagne marketing, annonce presse)
import http from 'k6/http'
import { check, sleep } from 'k6'
import { login, getHeaders, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'
import { randomUser } from '../helpers/data.js'

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 10 },   // baseline
        { duration: '30s', target: 500 },  // spike brutal
        { duration: '1m',  target: 500 },  // maintien spike
        { duration: '30s', target: 10 },   // retour normal
        { duration: '2m',  target: 10 },   // récupération
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<8000'],     // plus permissif pendant le spike
    http_req_failed: ['rate<0.05'],        // 5% d'erreurs tolérées pendant spike
    checks: ['rate>0.90'],
  },
}

export default function() {
  const token = login(randomUser().email, randomUser().password)
  const h = getHeaders(token)

  http.batch([
    ['GET', `${BASE_URL}/api/v1/dashboard/stats`, null, { headers: h }],
    ['GET', `${BASE_URL}/api/v1/events?upcoming=5`, null, { headers: h }],
  ])

  sleep(Math.random() * 2 + 1)
}
