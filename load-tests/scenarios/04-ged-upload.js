// Scénario 04 : GED — Upload de documents
// Test de charge sur l'upload de fichiers (opération lourde)
import http from 'k6/http'
import { check, sleep } from 'k6'
import { login, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'
import { randomUser } from '../helpers/data.js'
import encoding from 'k6/encoding'

export const options = {
  scenarios: { ged_upload: { executor: 'constant-vus', vus: 20, duration: '5m' } },
  thresholds: {
    http_req_duration: ['p(95)<5000'], // upload plus lent
    http_req_failed: ['rate<0.02'],
  },
}

// Génère un "PDF" de taille variable (100KB à 2MB)
function generateFakePdf(sizeKB) {
  const bytes = new Uint8Array(sizeKB * 1024)
  bytes[0] = 0x25; bytes[1] = 0x50; bytes[2] = 0x44; bytes[3] = 0x46 // %PDF header
  for (let i = 4; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return encoding.b64encode(bytes)
}

export default function() {
  const token = login(randomUser().email, randomUser().password)
  const sizeKB = [100, 500, 1024, 2048][Math.floor(Math.random() * 4)]

  const res = http.post(`${BASE_URL}/api/v1/documents`, {
    name: `Document test ${Date.now()}.pdf`,
    file: http.file(generateFakePdf(sizeKB), 'test.pdf', 'application/pdf'),
    folder_id: null,
  }, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  })

  check(res, { 'upload réussi': r => r.status === 201 || r.status === 200 })
  sleep(Math.random() * 5 + 3) // think time plus long (document lourd)
}
