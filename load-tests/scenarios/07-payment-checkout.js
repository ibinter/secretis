// Scénario 07 : Flux paiement complet
// Simule le parcours d'achat d'un abonnement
import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { login, getHeaders, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'
import { randomUser } from '../helpers/data.js'

export const options = {
  scenarios: { payment: { executor: 'constant-vus', vus: 10, duration: '5m' } },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function() {
  const token = login(randomUser().email, randomUser().password)
  const h = getHeaders(token)

  group('Consulter les plans', () => {
    const plans = http.get(`${BASE_URL}/api/v1/plans`, { headers: h })
    check(plans, {
      'plans 200': r => r.status === 200,
      'plans présents': r => r.json('data').length > 0,
    })
  })

  group('Créer une commande', () => {
    const order = http.post(`${BASE_URL}/api/v1/orders`, JSON.stringify({
      plan_id: 2, // Pro
      billing_period: 'monthly',
      payment_method: 'orange_money',
    }), { headers: h })
    check(order, { 'commande créée': r => r.status === 201 })

    if (order.status === 201) {
      const ref = order.json('data.reference')
      const status = http.get(`${BASE_URL}/api/v1/orders/${ref}`, { headers: h })
      check(status, { 'statut commande 200': r => r.status === 200 })
    }
  })

  sleep(Math.random() * 3 + 2)
}
