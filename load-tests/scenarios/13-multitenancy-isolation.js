// Scénario 13 : Vérification isolation multi-tenant sous charge
// S'assure que les données restent isolées même sous forte charge
import http from 'k6/http'
import { check, sleep } from 'k6'
import { login, getHeaders, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'

const ORG_USERS = [
  { email: 'secretaire@demo-secretis.ci', password: 'Password123!', org: 2 },
  { email: 'admin@demo-secretis.ci', password: 'Password123!', org: 2 },
]

export const options = {
  scenarios: { isolation: { executor: 'constant-vus', vus: 30, duration: '5m' } },
  thresholds: {
    checks: ['rate>0.999'], // 0 tolérance sur la fuite de données
    http_req_failed: ['rate<0.01'],
  },
}

export default function() {
  const user = ORG_USERS[Math.floor(Math.random() * ORG_USERS.length)]
  const token = login(user.email, user.password)
  const h = getHeaders(token)

  // Essayer d'accéder à des ressources d'une autre org
  const crossOrgAttempt = http.get(`${BASE_URL}/api/v1/events?organization_id=999`, { headers: h })
  check(crossOrgAttempt, {
    'cross-org bloqué ou ignoré': r => {
      if (r.status === 200) {
        // Si 200, vérifier que les données appartiennent bien à notre org
        const data = r.json('data')
        return !data || data.every(item => item.organization_id === user.org || !item.organization_id)
      }
      return r.status === 403 || r.status === 422
    },
  })

  sleep(Math.random() * 2 + 1)
}
