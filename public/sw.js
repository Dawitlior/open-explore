// Minimal service worker for PWA installability.
//
// IMPORTANT: This worker MUST NOT force-reload open tabs on activation.
// A previous version called `client.navigate(client.url)` inside `activate`,
// which silently wiped any unsaved form state (e.g. API-key entry forms)
// whenever users switched tabs and came back — Chrome re-checks the SW on
// tab focus, and a byte-different worker would skipWaiting → activate →
// reload everyone.
//
// Behavior now:
//   • install: pre-activate immediately (skipWaiting) but do NOT touch caches.
//   • activate: clear stale caches and claim clients — NO forced reloads.
//   • fetch:   network-first for navigations and static assets, with cache as
//              an offline-only fallback for assets.

const CACHE = 'orca-shell-v10';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    // Intentionally do NOT navigate/reload open clients — that destroys
    // in-progress form input. Returning users pick up the new bundle on
    // their next natural navigation.
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
