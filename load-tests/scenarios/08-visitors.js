// Scénario 08 : Module Visiteurs (kiosk et enregistrements)
import http from 'k6/http'
import { check, sleep } from 'k6'
import { login, getHeaders, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'
import { randomUser } from '../helpers/data.js'

const FIRST_NAMES = ['Jean', 'Amina', 'Kofi', 'Marie', 'Ibrahim', 'Fatou', 'Pierre', 'Aicha']
const LAST_NAMES = ['Kouassi', 'Diallo', 'Mensah', 'Traore', 'Kone', 'Yao', 'Bamba', 'Ndiaye']

export const options = {
  scenarios: {
    visitors: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 40 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function() {
  const token = login(randomUser().email, randomUser().password)
  const h = getHeaders(token)

  const checkin = http.post(`${BASE_URL}/api/v1/visitors`, JSON.stringify({
    first_name: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
    last_name: LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)],
    purpose: 'meeting',
    host_user_id: 2,
  }), { headers: h })

  check(checkin, { 'check-in 201': r => r.status === 201 })

  if (checkin.status === 201) {
    const id = checkin.json('data.id')
    sleep(Math.random() * 30 + 10) // simuler la visite
    http.post(`${BASE_URL}/api/v1/visitors/${id}/checkout`, null, { headers: h })
  }

  sleep(2)
}
