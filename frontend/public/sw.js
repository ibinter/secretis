/**
 * SECRETIS ERP — Service Worker
 * Cache stratégies : Cache First / Network First / Stale While Revalidate
 */

const CACHE_NAME = 'SECRETIS_CACHE_V1';
const STATIC_CACHE = 'SECRETIS_STATIC_V1';
const API_CACHE = 'SECRETIS_API_V1';
const SYNC_QUEUE = 'SECRETIS_SYNC_QUEUE';

// Assets statiques à pré-cacher au premier chargement
const PRE_CACHE_ASSETS = [
  '/',
  '/dashboard',
  '/agenda',
  '/courrier',
  '/taches',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Extensions d'assets statiques (Cache First)
const STATIC_EXTENSIONS = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.gif', '.webp'];

// Préfixes des routes API (Network First)
const API_PREFIXES = ['/api/', '/sanctum/'];

// ─────────────────────────────────────────────
// INSTALL — pré-cache des assets critiques
// ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installation — SECRETIS_CACHE_V1');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRE_CACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pré-cache partiel :', err);
      });
    })
  );
  self.skipWaiting();
});

// ─────────────────────────────────────────────
// ACTIVATE — nettoyage des anciens caches
// ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation — nettoyage des anciens caches');
  const validCaches = [CACHE_NAME, STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !validCaches.includes(name))
          .map((name) => {
            console.log('[SW] Suppression du cache obsolète :', name);
            return caches.delete(name);
          })
      )
    )
  );
  self.clients.claim();
});

// ─────────────────────────────────────────────
// FETCH — routage des requêtes
// ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorer les requêtes non-GET et les extensions de dev
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // API → Network First
  if (API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Assets statiques → Cache First
  const ext = '.' + url.pathname.split('.').pop();
  if (STATIC_EXTENSIONS.includes(ext)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Pages HTML → Stale While Revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});

// ─────────────────────────────────────────────
// Stratégie : Cache First (assets statiques)
// ─────────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

// ─────────────────────────────────────────────
// Stratégie : Network First (API)
// ─────────────────────────────────────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'Vous êtes hors ligne. Les données affichées sont en cache.'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ─────────────────────────────────────────────
// Stratégie : Stale While Revalidate (pages HTML)
// ─────────────────────────────────────────────
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || fetchPromise || offlineFallback(request);
}

// ─────────────────────────────────────────────
// Page de fallback offline
// ─────────────────────────────────────────────
async function offlineFallback(request) {
  const url = new URL(request.url);
  const isHtml = request.headers.get('accept')?.includes('text/html');

  if (isHtml) {
    const cached = await caches.match('/offline');
    if (cached) return cached;

    return new Response(
      `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SECRETIS — Hors ligne</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #1A3A5C; color: #fff; min-height: 100vh;
           display: flex; align-items: center; justify-content: center; }
    .container { text-align: center; padding: 2rem; max-width: 480px; }
    .logo { font-size: 2rem; font-weight: 800; letter-spacing: 2px; margin-bottom: 1.5rem; }
    .logo span { color: #F39C12; }
    h1 { font-size: 1.4rem; margin-bottom: 1rem; }
    p { color: rgba(255,255,255,0.75); line-height: 1.6; margin-bottom: 1.5rem; }
    .badge { display: inline-block; background: rgba(255,255,255,0.1);
             padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; }
    button { margin-top: 2rem; background: #F39C12; color: #fff; border: none;
             padding: 0.75rem 2rem; border-radius: 6px; cursor: pointer;
             font-size: 1rem; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">IS <span>SECRETIS</span></div>
    <h1>Vous êtes hors ligne</h1>
    <p>Les données sont disponibles en cache.<br>Reconnectez-vous pour accéder aux informations en temps réel.</p>
    <div class="badge">Mode hors ligne actif</div>
    <br>
    <button onclick="window.location.reload()">Réessayer la connexion</button>
  </div>
</body>
</html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  return new Response('Ressource non disponible hors ligne', { status: 503 });
}

// ─────────────────────────────────────────────
// BACKGROUND SYNC — actions offline en attente
// ─────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync :', event.tag);

  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncPendingTasks());
  }

  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingTasks() {
  try {
    const db = await openSyncDB();
    const pending = await db.getAll('pending-tasks');

    for (const task of pending) {
      const response = await fetch('/api/taches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(task.data)
      });

      if (response.ok) {
        await db.delete('pending-tasks', task.id);
        notifyClients('task-synced', { id: task.id });
      }
    }
  } catch (err) {
    console.error('[SW] Erreur sync tâches :', err);
  }
}

async function syncPendingMessages() {
  try {
    const db = await openSyncDB();
    const pending = await db.getAll('pending-messages');

    for (const msg of pending) {
      const response = await fetch('/api/courrier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(msg.data)
      });

      if (response.ok) {
        await db.delete('pending-messages', msg.id);
        notifyClients('message-synced', { id: msg.id });
      }
    }
  } catch (err) {
    console.error('[SW] Erreur sync messages :', err);
  }
}

// ─────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'SECRETIS', body: event.data.text(), icon: '/icons/icon-192x192.png' };
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: payload.image || null,
    vibrate: [200, 100, 200],
    tag: payload.tag || 'secretis-notification',
    renotify: true,
    requireInteraction: payload.requireInteraction || false,
    data: {
      url: payload.url || '/dashboard',
      timestamp: Date.now()
    },
    actions: payload.actions || [
      { action: 'open', title: 'Ouvrir' },
      { action: 'dismiss', title: 'Ignorer' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'IBIG SECRETIS', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ─────────────────────────────────────────────
// MESSAGE — communication avec l'app principale
// ─────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'QUEUE_TASK') {
    queueOfflineAction('pending-tasks', event.data.payload);
  }

  if (event.data?.type === 'QUEUE_MESSAGE') {
    queueOfflineAction('pending-messages', event.data.payload);
  }

  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_NAME });
  }
});

// ─────────────────────────────────────────────
// Utilitaires IndexedDB simple
// ─────────────────────────────────────────────
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('secretis-sync', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending-tasks')) {
        db.createObjectStore('pending-tasks', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pending-messages')) {
        db.createObjectStore('pending-messages', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      // Wrap avec des méthodes async simples
      resolve({
        getAll: (store) => new Promise((res, rej) => {
          const tx = db.transaction(store, 'readonly');
          const req = tx.objectStore(store).getAll();
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        }),
        delete: (store, id) => new Promise((res, rej) => {
          const tx = db.transaction(store, 'readwrite');
          const req = tx.objectStore(store).delete(id);
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
        add: (store, data) => new Promise((res, rej) => {
          const tx = db.transaction(store, 'readwrite');
          const req = tx.objectStore(store).add(data);
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        })
      });
    };
    request.onerror = () => reject(request.error);
  });
}

async function queueOfflineAction(store, payload) {
  try {
    const db = await openSyncDB();
    await db.add(store, { data: payload, queuedAt: Date.now() });
  } catch (err) {
    console.error('[SW] Erreur mise en file :', err);
  }
}

function notifyClients(type, data) {
  self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => client.postMessage({ type, data }));
  });
}
