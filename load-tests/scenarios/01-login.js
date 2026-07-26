// Scénario 01 : Authentification
// Teste la robustesse de l'endpoint /api/v1/auth/login
// Métriques : temps connexion, taux d'échec, rate limiting

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Trend } from 'k6/metrics'
import { login, BASE_URL_CONST } from '../helpers/auth.js'
import { randomUser } from '../helpers/data.js'

const loginDuration = new Trend('login_duration')
const loginErrors = new Counter('login_errors')

export const options = {
  scenarios: {
    login_load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    login_duration: ['p(95)<2000'],
    login_errors: ['count<10'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function() {
  const user = randomUser()
  const start = Date.now()
  const token = login(user.email, user.password)
  loginDuration.add(Date.now() - start)

  if (!token) {
    loginErrors.add(1)
  }

  sleep(Math.random() * 2 + 1)
}
