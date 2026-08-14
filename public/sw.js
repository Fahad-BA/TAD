// TAD service worker — cache-first for the app shell, network for API calls.
const CACHE = 'tad-v1';
const ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never cache API lookups (RapidAPI / TikWM) — always live data.
  if (url.pathname.includes('/user/') || url.hostname.includes('rapidapi') || url.hostname.includes('tikwm')) return;
  // App shell: cache-first with background refresh.
  if (event.request.method === 'GET' && (url.origin === self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetched = fetch(event.request)
          .then((response) => {
            if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
            return response;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
  }
});
