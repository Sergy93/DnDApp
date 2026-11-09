const CACHE_NAME = 'dorian-dnd-cache-v40';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './bundle.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Pre-caching partial failure, network fallback will handle it:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // Only handle HTTP and HTTPS requests; ignore chrome-extension, moz-extension, etc.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Let API requests bypass Service Worker cache completely
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Let third-party CDN assets (Tailwind, Alpine CDN) bypass SW cache to avoid CORS restrictions
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Cache hit: return cached response and fetch fresh copy in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Cache miss: fetch from network and cache local static assets
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // If offline and request is HTML navigation, return cached index
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});
