const CACHE_NAME = "secretis-v6";
const PRECACHE_URLS = ["/", "/manifest.json", "/favicon.ico"];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => {
      self.clients.claim();
      self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: "SW_UPDATED", version: "v4" }));
      });
    })
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Toujours réseau pour: navigation, API, auth, sanctum
  if (
    event.request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/sanctum/") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/logout") ||
    url.pathname.startsWith("/register") ||
    url.pathname.startsWith("/build/") ||
    url.pathname.endsWith(".jsx") ||
    url.pathname.endsWith(".js") && url.pathname.includes("/build/") ||
    url.pathname.endsWith(".css") && url.pathname.includes("/build/")
  ) {
    // Network-first: ne jamais servir depuis cache pour ces ressources
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first pour images, fonts, assets statiques
  if (
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Par défaut: réseau
  event.respondWith(fetch(event.request));
});
