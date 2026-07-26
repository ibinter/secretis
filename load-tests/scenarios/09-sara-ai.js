// Scénario 09 : Assistant IA SARA
// Teste la charge sur l'endpoint IA (groq/openai)
import http from 'k6/http'
import { check, sleep } from 'k6'
import { login, getHeaders, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'
import { randomUser } from '../helpers/data.js'

const QUESTIONS = [
  'Comment créer un événement dans SECRETIS ?',
  'Quelle est la différence entre un courrier entrant et sortant ?',
  'Comment générer un bilan SYSCOHADA ?',
  'Expliquez le module de gestion des visiteurs',
  "Comment configurer les droits d'accès ?",
]

export const options = {
  scenarios: { sara: { executor: 'constant-vus', vus: 20, duration: '5m' } },
  thresholds: {
    http_req_duration: ['p(95)<10000'], // IA peut être lente
    http_req_failed: ['rate<0.05'],     // plus tolérant sur l'IA
  },
}

export default function() {
  const token = login(randomUser().email, randomUser().password)
  const h = getHeaders(token)
  const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]

  const res = http.post(`${BASE_URL}/api/v1/sara/chat`, JSON.stringify({
    message: q,
    context: 'help',
  }), { headers: h })

  check(res, {
    'SARA répond 200': r => r.status === 200,
    'réponse non vide': r => r.json('data.message') && r.json('data.message').length > 0,
    'rate limit ok': r => r.status !== 429,
  })

  sleep(Math.random() * 5 + 3) // think time plus long
}
