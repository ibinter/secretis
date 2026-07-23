// Scénario 14 : Comportement à l'expiration de licence
// Vérifie que le middleware CheckLicense répond correctement sous charge
import http from 'k6/http'
import { check, sleep } from 'k6'
import { login, getHeaders, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'

export const options = {
  scenarios: { expiry: { executor: 'constant-vus', vus: 20, duration: '3m' } },
  thresholds: {
    http_req_duration: ['p(95)<1000'], // la vérification doit être rapide
    http_req_failed: ['rate<0.01'],
  },
}

export default function() {
  const token = login('secretaire@demo-secretis.ci', 'Password123!')
  const h = getHeaders(token)

  // Les endpoints d'abonnement doivent rester accessibles même si la licence est expirée
  const subRes = http.get(`${BASE_URL}/api/v1/subscription`, { headers: h })
  check(subRes, { 'subscription accessible': r => r.status === 200 })

  // Les endpoints métier doivent retourner 402 si expiré
  const eventsRes = http.get(`${BASE_URL}/api/v1/events`, { headers: h })
  check(eventsRes, { 'licence ok ou 402': r => r.status === 200 || r.status === 402 })

  sleep(Math.random() * 2 + 1)
}
