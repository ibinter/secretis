// Scénario 06 : WebSocket Reverb
// Connexions simultanées au serveur WebSocket
import ws from 'k6/ws'
import { check, sleep } from 'k6'
import { login, BASE_URL_CONST as BASE_URL } from '../helpers/auth.js'
import { randomUser } from '../helpers/data.js'

const WS_URL = (__ENV.WS_URL || 'ws://localhost:8080')

export const options = {
  scenarios: { websocket: { executor: 'constant-vus', vus: 200, duration: '5m' } },
  thresholds: {
    ws_connecting: ['p(95)<500'],
    ws_session_duration: ['p(95)<300000'], // sessions < 5min
    checks: ['rate>0.95'],
  },
}

export default function() {
  const token = login(randomUser().email, randomUser().password)

  const url = `${WS_URL}/app/secretis-key?protocol=7&client=js&version=8.0.0`

  const res = ws.connect(url, { headers: { 'Authorization': `Bearer ${token}` } }, (socket) => {
    socket.on('open', () => {
      // S'abonner au canal de notifications
      socket.send(JSON.stringify({
        event: 'pusher:subscribe',
        data: { auth: '', channel: `private-notifications.${Date.now()}` },
      }))
    })

    socket.on('message', (msg) => {
      const data = JSON.parse(msg)
      check(data, { 'message valide': d => d.event !== undefined })
    })

    socket.setTimeout(() => socket.close(), 30000) // 30s de connexion
  })

  check(res, { 'connexion WS établie': r => r && r.status === 101 })
  sleep(1)
}
