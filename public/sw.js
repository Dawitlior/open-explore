// One-release cleanup worker for the old Orca app-shell PWA.
// Installability now uses the web manifest only; this file removes stale
// /sw.js registrations that could refresh tabs or serve outdated assets.
function isOrcaShellCache(name) {
  return name === 'orca-shell-v10' || /^orca-shell-v\d+/.test(name);
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.allSettled(cacheNames.filter(isOrcaShellCache).map((name) => caches.delete(name)));
      await self.clients.claim();
    } finally {
      await self.registration.unregister();
    }
  })());
});
