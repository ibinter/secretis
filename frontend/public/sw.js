/**
 * SECRETIS ERP — Service Worker v2
 * Stratégies de cache avancées, Background Sync unifié, Push Notifications
 */

const CACHE_VERSION  = 'secretis-v2';
const STATIC_CACHE   = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE  = `${CACHE_VERSION}-dynamic`;
const API_CACHE      = `${CACHE_VERSION}-api`;
const ALL_CACHES     = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];

// Assets pré-cachés à l'installation (shell applicatif)
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Extensions considérées comme assets statiques → Cache First
const STATIC_EXTS = new Set([
  '.js', '.css', '.woff', '.woff2', '.ttf', '.eot',
  '.png', '.jpg', '.jpeg', '.svg', '.ico', '.gif', '.webp', '.avif',
]);

// Routes API → Network First
const API_PREFIXES = ['/api/', '/sanctum/', '/push/'];

// Durée max du cache API (ms)
const API_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

// ─────────────────────────────────────────────────────────────────────────────
// INSTALL — pré-cache du shell statique
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW v2] Installation');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((err) =>
        console.warn('[SW v2] Pré-cache partiel :', err)
      )
    )
  );
  // Ne pas skipWaiting ici — attendre que l'app décide via SKIP_WAITING
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATE — nettoyage des anciens caches
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW v2] Activation — nettoyage caches obsolètes');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !ALL_CACHES.includes(k))
          .map((k) => {
            console.log('[SW v2] Suppression :', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// FETCH — routage intelligent des requêtes
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer : non-GET, chrome-extension, hot-reload webpack
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.pathname.includes('__webpack_hmr')) return;
  if (url.hostname !== self.location.hostname) return;

  // Routes API → Network First (données sensibles : pas de cache si auth header)
  if (API_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    const hasAuth = request.headers.get('Authorization');
    event.respondWith(hasAuth ? networkOnly(request) : networkFirstWithTTL(request));
    return;
  }

  // Assets statiques → Cache First, mise à jour background
  const ext = '.' + url.pathname.split('.').pop().split('?')[0];
  if (STATIC_EXTS.has(ext)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Pages Inertia / HTML → Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ─────────────────────────────────────────────────────────────────────────────
// Stratégies
// ─────────────────────────────────────────────────────────────────────────────

/** Cache First — pour assets statiques (JS, CSS, images) */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

/** Network First avec TTL — pour API publiques (5 min) */
async function networkFirstWithTTL(request) {
  try {
    const response = await fetchWithTimeout(request.clone(), 8000);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      // Stocker avec timestamp dans un header custom (via Response wrapper)
      const body   = await response.clone().text();
      const stamped = new Response(body, {
        status:  response.status,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'sw-cached-at': String(Date.now()),
        },
      });
      cache.put(request, stamped);
      return response;
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      const cachedAt = Number(cached.headers.get('sw-cached-at') || 0);
      if (Date.now() - cachedAt < API_CACHE_MAX_AGE) return cached;
    }
    return new Response(
      JSON.stringify({ error: 'offline', message: 'Données hors ligne. Reconnectez-vous pour actualiser.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/** Network Only — pour routes API avec authentification */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      JSON.stringify({ error: 'offline', message: 'Connexion requise pour cette action.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/** Stale While Revalidate — pour pages HTML / Inertia */
async function staleWhileRevalidate(request) {
  const cache       = await caches.open(DYNAMIC_CACHE);
  const cached      = await cache.match(request);

  const fetchPromise = fetchWithTimeout(request.clone(), 10000)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached ?? (await fetchPromise) ?? offlineFallback(request);
}

/** fetch avec timeout */
async function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(request, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/** Fallback page hors ligne */
async function offlineFallback(request) {
  const isHtml = request.headers.get('accept')?.includes('text/html');
  if (isHtml) {
    const cached = await caches.match('/offline');
    if (cached) return cached;
    return new Response(
      `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>SECRETIS — Hors ligne</title>
      <style>body{font-family:system-ui,sans-serif;background:#1A3A5C;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}
      .box{text-align:center;padding:2rem;max-width:400px}.logo{font-size:1.5rem;font-weight:900;letter-spacing:2px;margin-bottom:1rem}
      .logo span{color:#F39C12}p{color:rgba(255,255,255,.75);line-height:1.6;margin:.75rem 0}
      button{background:#F39C12;color:#fff;border:none;padding:.75rem 1.5rem;border-radius:8px;cursor:pointer;font-size:1rem;font-weight:600;margin-top:1rem}</style>
      </head><body><div class="box"><div class="logo">IBIG <span>SECRETIS</span></div>
      <p>Vous êtes hors ligne. Les données disponibles en cache restent accessibles.</p>
      <button onclick="location.reload()">Réessayer</button></div></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html;charset=utf-8' } }
    );
  }
  return new Response('Ressource non disponible hors ligne.', { status: 503 });
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND SYNC — actions en attente (tag unifié)
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  console.log('[SW v2] Background sync :', event.tag);

  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
  // Rétrocompatibilité avec les anciens tags
  if (event.tag === 'sync-tasks')    event.waitUntil(syncPendingActions('pending-tasks'));
  if (event.tag === 'sync-messages') event.waitUntil(syncPendingActions('pending-messages'));
});

async function syncPendingActions(specificStore = null) {
  const db     = await openSyncDB();
  const stores = specificStore
    ? [specificStore]
    : ['pending-tasks', 'pending-messages', 'pending-forms'];

  const results = { synced: 0, failed: 0 };

  for (const store of stores) {
    let items = [];
    try { items = await db.getAll(store); } catch { continue; }

    for (const item of items) {
      try {
        const response = await fetch(item.url || '/api/sync', {
          method:  item.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept':       'application/json',
            'X-CSRF-TOKEN': item.csrf || '',
          },
          body: JSON.stringify(item.data),
        });

        if (response.ok) {
          await db.delete(store, item.id);
          results.synced++;
          notifyClients('action-synced', { store, id: item.id });
        } else {
          results.failed++;
          // Incrémenter le compteur de tentatives
          await db.update(store, item.id, { ...item, attempts: (item.attempts || 0) + 1 });
        }
      } catch {
        results.failed++;
      }
    }
  }

  notifyClients('sync-complete', results);
  console.log('[SW v2] Sync terminé :', results);
}

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { data = { body: event.data?.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'IBIG SECRETIS', {
      body:               data.body ?? '',
      icon:               data.icon ?? '/icons/icon-192x192.png',
      badge:              '/icons/icon-72x72.png',
      image:              data.image ?? undefined,
      vibrate:            [200, 100, 200],
      tag:                data.tag ?? 'secretis-notif',
      renotify:           true,
      requireInteraction: data.requireInteraction ?? false,
      silent:             data.silent ?? false,
      data:               { url: data.url ?? '/dashboard', timestamp: Date.now(), ...data.meta },
      actions:            data.actions ?? [
        { action: 'open',    title: 'Ouvrir' },
        { action: 'dismiss', title: 'Ignorer' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url ?? '/dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Télémétrie optionnelle (fire-and-forget)
  const { url, timestamp } = event.notification.data ?? {};
  if (url) {
    fetch('/api/notifications/dismissed', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url, timestamp, dismissed_at: Date.now() }),
    }).catch(() => {});
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE — communication bidirectionnelle avec l'app
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const { type, payload } = event.data ?? {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'QUEUE_ACTION':
      queueOfflineAction(payload.store ?? 'pending-forms', payload);
      break;

    case 'QUEUE_TASK':
      queueOfflineAction('pending-tasks', payload);
      break;

    case 'QUEUE_MESSAGE':
      queueOfflineAction('pending-messages', payload);
      break;

    case 'SYNC_NOW':
      syncPendingActions().then((r) => {
        event.ports[0]?.postMessage({ type: 'SYNC_RESULT', payload: r });
      });
      break;

    case 'GET_PENDING_COUNT':
      countPendingActions().then((count) => {
        event.ports[0]?.postMessage({ type: 'PENDING_COUNT', count });
      });
      break;

    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: CACHE_VERSION });
      break;

    case 'CLEAR_CACHE':
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => caches.delete(k)))
      ).then(() => event.ports[0]?.postMessage({ type: 'CACHE_CLEARED' }));
      break;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB — utilitaires
// ─────────────────────────────────────────────────────────────────────────────
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('secretis-sync-v2', 2);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const stores = ['pending-tasks', 'pending-messages', 'pending-forms'];
      for (const name of stores) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
        }
      }
    };

    req.onsuccess = (e) => {
      const db = e.target.result;
      resolve({
        getAll: (store) => new Promise((res, rej) => {
          try {
            const tx  = db.transaction(store, 'readonly');
            const r   = tx.objectStore(store).getAll();
            r.onsuccess = () => res(r.result);
            r.onerror   = () => rej(r.error);
          } catch (err) { rej(err); }
        }),
        delete: (store, id) => new Promise((res, rej) => {
          try {
            const tx  = db.transaction(store, 'readwrite');
            const r   = tx.objectStore(store).delete(id);
            r.onsuccess = () => res();
            r.onerror   = () => rej(r.error);
          } catch (err) { rej(err); }
        }),
        update: (store, id, data) => new Promise((res, rej) => {
          try {
            const tx  = db.transaction(store, 'readwrite');
            const r   = tx.objectStore(store).put({ ...data, id });
            r.onsuccess = () => res();
            r.onerror   = () => rej(r.error);
          } catch (err) { rej(err); }
        }),
        add: (store, data) => new Promise((res, rej) => {
          try {
            const tx  = db.transaction(store, 'readwrite');
            const r   = tx.objectStore(store).add(data);
            r.onsuccess = () => res(r.result);
            r.onerror   = () => rej(r.error);
          } catch (err) { rej(err); }
        }),
        count: (store) => new Promise((res, rej) => {
          try {
            const tx  = db.transaction(store, 'readonly');
            const r   = tx.objectStore(store).count();
            r.onsuccess = () => res(r.result);
            r.onerror   = () => rej(r.error);
          } catch (err) { rej(err); }
        }),
      });
    };

    req.onerror = () => reject(req.error);
  });
}

async function queueOfflineAction(store, payload) {
  try {
    const db = await openSyncDB();
    await db.add(store, {
      ...payload,
      queuedAt: Date.now(),
      attempts: 0,
    });
    notifyClients('action-queued', { store });
  } catch (err) {
    console.error('[SW v2] Erreur file d\'attente :', err);
  }
}

async function countPendingActions() {
  try {
    const db = await openSyncDB();
    const counts = await Promise.all([
      db.count('pending-tasks'),
      db.count('pending-messages'),
      db.count('pending-forms'),
    ]);
    return counts.reduce((a, b) => a + b, 0);
  } catch {
    return 0;
  }
}

function notifyClients(type, data) {
  self.clients
    .matchAll({ includeUncontrolled: true })
    .then((list) => list.forEach((c) => c.postMessage({ type, data })));
}
