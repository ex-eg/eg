/* elgoharyX — service worker (network-first, offline fallback)
   Network-first keeps content fresh when online and only falls back to
   cache when the network is unavailable, so users never get a stale app. */
const CACHE = 'apb-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // never cache writes
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // let cross-origin (Firebase, imgbb) pass through untouched

  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      return caches.match('./index.html');          // SPA fallback when offline
    }
  })());
});
