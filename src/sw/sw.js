/* Gbese! service worker. Built by vite.config.ts: the two placeholders are filled at build time.
   Precaches the game on the first visit, then serves everything from the cache (offline play).
   Same-origin GET only. It never talks to any other site. */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
// O1b1: each later state's files ({ ogun: ["./worlds/ogun/...js"] }). Not fetched on the first
// visit: only when the player first goes there, then kept.
const WORLDS = __WORLDS__;
const CACHE = `gidi-dash-${VERSION}`;

/** The later states an older cache already holds, so an update keeps them playable offline. */
function worldsHeld() {
  return caches.keys().then((keys) =>
    Promise.all(
      keys
        .filter((k) => k.startsWith('gidi-dash-') && k !== CACHE)
        .map((k) => caches.open(k).then((c) => c.keys())),
    ).then((lists) => {
      const held = new Set();
      for (const reqs of lists) for (const r of reqs) {
        const m = /\/worlds\/([^/]+)\//.exec(new URL(r.url).pathname);
        if (m) held.add(m[1]);
      }
      return [...held];
    }),
  );
}
// Servers may send "Vary: Origin"; module scripts carry an Origin header, the precache did not.
const MATCH = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(PRECACHE).then(() =>
          // A state the player already has comes along in its new version. Best effort: if this
          // fails, the state downloads again the next time it is opened.
          worldsHeld()
            .then((ids) => Promise.all(ids.flatMap((id) => (WORLDS[id] || []).map((u) => cache.add(u).catch(() => undefined)))))
            .catch(() => undefined),
        ),
      )
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

// U1: "Tap to update" asks a waiting worker to take over now (it normally does by itself).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // ST3: the store privacy page (decision 56) is a plain page on this site, not part of the game.
  // Leave it to the network so it is never cached and never answered with the game's page.
  if (/\/privacy\.html$/.test(new URL(req.url).pathname)) return;

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
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(req, copy)));
          }
          return res;
        }),
    ),
  );
});
