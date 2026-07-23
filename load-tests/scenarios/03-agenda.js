// Scénario 03 : Module Agenda
// Création, consultation et modification d'événements
import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { login, getHeaders, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'
import { randomUser, randomItem, eventTitles } from '../helpers/data.js'

export const options = {
  scenarios: {
    agenda: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 30 },
        { duration: '4m', target: 30 },
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
  const user = randomUser()
  const token = login(user.email, user.password)
  const h = getHeaders(token)

  group('Lecture événements', () => {
    const list = http.get(`${BASE_URL}/api/v1/events?month=2026-08`, { headers: h })
    check(list, { 'liste événements 200': r => r.status === 200 })
  })

  group('Création événement', () => {
    const event = http.post(`${BASE_URL}/api/v1/events`, JSON.stringify({
      title: randomItem(eventTitles),
      start_date: '2026-08-15 09:00',
      end_date: '2026-08-15 10:00',
      description: 'Test k6',
    }), { headers: h })
    check(event, { 'créé 201': r => r.status === 201 })

    if (event.status === 201) {
      const id = event.json('data.id')
      // Modifier puis supprimer
      http.put(`${BASE_URL}/api/v1/events/${id}`, JSON.stringify({ title: 'Modifié k6' }), { headers: h })
      http.del(`${BASE_URL}/api/v1/events/${id}`, null, { headers: h })
    }
  })

  sleep(Math.random() * 2 + 1)
}
