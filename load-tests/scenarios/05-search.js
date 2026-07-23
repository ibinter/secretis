// Scénario 05 : Recherche globale
// Teste la performance du moteur de recherche sous charge
import http from 'k6/http'
import { check, sleep } from 'k6'
import { login, getHeaders, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'
import { randomUser } from '../helpers/data.js'

const QUERIES = ['réunion', 'contrat', 'janvier', 'rapport', 'facture', 'urgent', 'direction', 'budget']

export const options = {
  scenarios: { search: { executor: 'constant-vus', vus: 50, duration: '5m' } },
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function() {
  const token = login(randomUser().email, randomUser().password)
  const h = getHeaders(token)
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)]

  const res = http.get(`${BASE_URL}/api/v1/search?q=${q}`, { headers: h })
  check(res, {
    'recherche 200': r => r.status === 200,
    'résultats présents': r => r.json('results') !== null,
  })

  sleep(Math.random() * 2 + 1)
}
