// HanssonHub Production-Ready Service Worker
// Version: 1.1.0

const CACHE_VERSION = 'hanssonhub-v2';
const STATIC_CACHE_NAME = `${CACHE_VERSION}-static`;
const OFFLINE_CACHE_NAME = `${CACHE_VERSION}-offline`;

// Core static assets required for standalone app shell & offline fallback
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-192x192-maskable.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512x512-maskable.png',
  '/icons/icon-144x144.png',
  '/icons/icon-96x96.png',
  '/icons/icon-48x48.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png'
];

// Helper: Check if a URL should bypass the service worker completely
function shouldBypass(request, url) {
  // Non-GET requests (POST, PUT, DELETE, PATCH, etc.)
  if (request.method !== 'GET') {
    return true;
  }

  // WebSocket connections & SignalR endpoints
  if (
    request.headers.get('Upgrade') === 'websocket' ||
    url.pathname.includes('/HomeSecurityHub') ||
    url.pathname.includes('/ChatHub') ||
    url.pathname.includes('/signalr') ||
    url.pathname.includes('/negotiate')
  ) {
    return true;
  }

  // Backend Security APIs, Authentication endpoints, and Devtunnels
  if (
    url.pathname.startsWith('/Home_Security') ||
    url.pathname.startsWith('/User') ||
    url.pathname.startsWith('/Door') ||
    url.pathname.startsWith('/Camera') ||
    url.pathname.startsWith('/Chat') ||
    url.pathname.startsWith('/Dashboard') ||
    url.pathname.startsWith('/api') ||
    url.hostname.includes('devtunnels.ms') ||
    url.hostname.includes('ngrok')
  ) {
    return true;
  }

  // WebRTC / Live streaming media (HLS, RTSP proxies, m3u8, ts segments)
  if (
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.includes('/stream') ||
    url.pathname.includes('/live') ||
    url.pathname.includes('/webrtc')
  ) {
    return true;
  }

  // Chrome Extension / external schemes
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return true;
  }

  return false;
}

// 1. INSTALL: Pre-cache static shell & offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE_NAME);
      const offlineCache = await caches.open(OFFLINE_CACHE_NAME);
      
      // Cache core assets safely (individual fetch so one failure doesn't block install)
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (asset) => {
          try {
            const response = await fetch(asset, { cache: 'no-cache' });
            if (response.ok) {
              if (asset === '/offline.html') {
                await offlineCache.put(asset, response);
              } else {
                await staticCache.put(asset, response);
              }
            }
          } catch (err) {
            console.warn('[SW] Pre-cache skipped for:', asset, err);
          }
        })
      );

      // Immediately activate new service worker
      return self.skipWaiting();
    })()
  );
});

// 2. ACTIVATE: Clean up stale caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const expectedCaches = [STATIC_CACHE_NAME, OFFLINE_CACHE_NAME];
      const keys = await caches.keys();

      await Promise.all(
        keys.map(async (key) => {
          if (!expectedCaches.includes(key)) {
            console.log('[SW] Deleting legacy cache:', key);
            return caches.delete(key);
          }
        })
      );

      // Take control of all open client tabs immediately
      return self.clients.claim();
    })()
  );
});

// 3. FETCH: Smart routing with Navigation Fallback and Safe Asset Caching
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bypass dynamic APIs, auth, WebSockets, and WebRTC
  if (shouldBypass(request, url)) {
    return;
  }

  // Navigation requests (HTML page navigation) -> Network First with App Shell / Offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Attempt network fetch
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            // Update cached index.html in background
            const staticCache = await caches.open(STATIC_CACHE_NAME);
            staticCache.put('/index.html', networkResponse.clone()).catch(() => {});
            return networkResponse;
          }
        } catch (error) {
          // Network failed (offline)
        }

        // Try serving cached SPA index shell
        const cachedShell = await caches.match('/index.html');
        if (cachedShell) {
          return cachedShell;
        }

        // Fallback to dedicated offline.html
        const offlinePage = await caches.match('/offline.html');
        if (offlinePage) {
          return offlinePage;
        }

        return new Response('<h1>HanssonHub is offline</h1>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })()
    );
    return;
  }

  // Static Assets (Vite bundled JS, CSS, fonts, SVG, PNGs) -> Stale While Revalidate
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
     url.pathname.startsWith('/icons/') ||
     url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.css') ||
     url.pathname.endsWith('.png') ||
     url.pathname.endsWith('.svg') ||
     url.pathname.endsWith('.ico') ||
     url.pathname.endsWith('.woff2') ||
     url.pathname.endsWith('.woff'))
  ) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(request);
        
        // Fetch from network to revalidate in background
        const networkFetchPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const staticCache = await caches.open(STATIC_CACHE_NAME);
              await staticCache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        // Return cached asset immediately if available, otherwise wait for network
        return cachedResponse || networkFetchPromise;
      })()
    );
    return;
  }

  // Default GET requests -> Cache with Network Fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request);
    })
  );
});

// 4. MESSAGE: Support interactive events like SKIP_WAITING
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
