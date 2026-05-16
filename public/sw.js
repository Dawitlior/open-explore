// Minimal service worker for PWA installability.
// Required so browsers fire `beforeinstallprompt` and allow Add-to-Home-Screen.
// Network-first to avoid serving stale shells.

const CACHE = 'orca-shell-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Navigations → network first, fall back to cached root.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('/', fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        const cache = await caches.open(CACHE);
        const cached = await cache.match('/');
        return cached || Response.error();
      }
    })());
    return;
  }

  // Static assets → stale-while-revalidate.
  const url = new URL(req.url);
  if (url.origin === location.origin && /\.(?:js|css|png|jpg|jpeg|svg|woff2?|ico)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const network = fetch(req).then(res => { cache.put(req, res.clone()).catch(() => {}); return res; }).catch(() => cached);
      return cached || network;
    })());
  }
});
