/* Gidi Dash service worker. Built by vite.config.ts: the two placeholders are filled at build time.
   Precaches the game on the first visit, then serves everything from the cache (offline play).
   Same-origin GET only. It never talks to any other site. */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `gidi-dash-${VERSION}`;
// Servers may send "Vary: Origin"; module scripts carry an Origin header, the precache did not.
const MATCH = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gidi-dash-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // The game is one page: always answer page loads with the cached index.html.
    event.respondWith(
      caches.match(new URL('./index.html', self.registration.scope).href, MATCH).then((hit) => hit || fetch(req)),
    );
    return;
  }

  // Cache first. Files not in the first-visit list (later worlds) are cached the first time they load.
  event.respondWith(
    caches.match(req, MATCH).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
