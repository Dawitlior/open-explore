// Minimal service worker for PWA installability.
// Bumped cache name to force eviction of stale shells after a project revert.

const CACHE = 'orca-shell-v5';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Nuke ALL previous caches — not just non-matching ones — so a revert
    // can never serve a stale bundle.
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
    // Force every open tab to reload onto the fresh bundle.
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const c of clients) {
      try { c.navigate(c.url); } catch { /* ignore */ }
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Navigations → network only. No fallback to stale cache.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => Response.error()));
    return;
  }

  // Static assets → network-first, cache only as offline fallback.
  const url = new URL(req.url);
  if (url.origin === location.origin && /\.(?:js|css|png|jpg|jpeg|svg|woff2?|ico)$/.test(url.pathname)) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone()).catch(() => {});
        return res;
      } catch {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        return cached || Response.error();
      }
    })());
  }
});
