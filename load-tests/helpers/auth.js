import http from 'k6/http'
import { check } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'

/**
 * Authentifie un utilisateur via Laravel Sanctum et retourne le token Bearer.
 * Récupère d'abord le cookie CSRF, puis POST /api/v1/auth/login.
 *
 * @param {string} email
 * @param {string} password
 * @returns {string|null} token Bearer
 */
export function login(email, password) {
  // 1. Récupérer le token CSRF
  const csrf = http.get(`${BASE_URL}/sanctum/csrf-cookie`)
  const csrfToken = csrf.cookies['XSRF-TOKEN'][0].value

  // 2. Se connecter
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email,
    password,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': decodeURIComponent(csrfToken),
      'Accept': 'application/json',
    },
  })

  check(res, {
    'login status 200': r => r.status === 200,
    'has token': r => r.json('data.token') !== undefined,
  })

  return res.json('data.token')
}

/**
 * Construit les headers HTTP standards pour les requêtes authentifiées.
 *
 * @param {string} token   Token Bearer
 * @param {object} [extra] Headers supplémentaires à fusionner
 * @returns {object}
 */
export function getHeaders(token, extra = {}) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...extra,
  }
}

export const BASE_URL_CONST = BASE_URL
