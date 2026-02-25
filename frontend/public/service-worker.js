/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'aasaanapp-v4';

// Install event - skip waiting for immediate activation
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing', CACHE_NAME);
  self.skipWaiting();
});

// Activate event - delete ALL old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - NETWORK FIRST for everything
// This ensures users always get the latest code and data
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests entirely (let browser handle POST, PUT, DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful same-origin responses
        if (response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed - try cache as offline fallback
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Nothing in cache either
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});
