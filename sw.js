/* nors. service worker
 *
 * Runtime caching only, no fixed file list to maintain. It speeds up repeat
 * visits and lets the app shell open offline. It deliberately handles just
 * three things on the site's own origin:
 *
 *   1. /assets/*                     hashed build files   -> cache first
 *   2. /wp-content/uploads/* images  product photos       -> cached copy first, refreshed in background
 *   3. page loads (navigations)      HTML                 -> network first, cached copy if offline/slow
 *
 * Everything else (shop API, cart, checkout, login, WordPress admin, other
 * websites, any non-GET request) goes straight to the network untouched.
 *
 * Kill switch: to remove this worker from every visitor, deploy a sw.js that
 * contains only:  self.addEventListener('install',()=>self.skipWaiting());
 * self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister()));
 */

const VERSION = 'v1';
const ASSETS = `nors-assets-${VERSION}`;
const IMAGES = `nors-images-${VERSION}`;
const PAGES = `nors-pages-${VERSION}`;
const KEEP = [ASSETS, IMAGES, PAGES];

const MAX_IMAGES = 150;
const MAX_PAGES = 30;
const NAV_TIMEOUT_MS = 4000;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith('nors-') && !KEEP.includes(n)).map((n) => caches.delete(n)));
      // Lets the browser start the page request while this worker wakes up.
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch (e) {
          /* optional feature */
        }
      }
      await self.clients.claim();
    })()
  );
});

// Pages that belong to WordPress itself, never intercepted.
const WORDPRESS_PREFIXES = ['/wp-', '/xmlrpc.php', '/index.php', '/api/', '/enterprise'];

function isPlainResponse(res) {
  return res && res.ok && res.type === 'basic';
}

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) {
    await cache.delete(keys[i]);
  }
}

// Hashed build files never change, so a cached copy is always right.
async function cacheFirstAsset(event) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(event.request);
  if (hit) return hit;
  const res = await fetch(event.request);
  // A missing file can come back as the HTML fallback page with status 200;
  // never store that under a .js/.css name.
  const type = res.headers.get('content-type') || '';
  if (isPlainResponse(res) && !type.includes('text/html')) {
    event.waitUntil(cache.put(event.request, res.clone()));
  }
  return res;
}

// Show the saved photo instantly, refresh it in the background.
async function imageStaleWhileRevalidate(event) {
  const cache = await caches.open(IMAGES);
  const hit = await cache.match(event.request);
  const refresh = fetch(event.request)
    .then(async (res) => {
      const type = res.headers.get('content-type') || '';
      if (isPlainResponse(res) && type.startsWith('image/')) {
        await cache.put(event.request, res.clone());
        await trim(cache, MAX_IMAGES);
      }
      return res;
    })
    .catch(() => null);
  event.waitUntil(refresh);
  if (hit) return hit;
  return (await refresh) || Response.error();
}

// Always try the live page first so visitors get new releases straight away.
// Fall back to the saved copy when offline or when the network takes too long.
async function pageNetworkFirst(event) {
  const req = event.request;
  const cache = await caches.open(PAGES);

  const network = Promise.resolve(event.preloadResponse)
    .then((pre) => pre || fetch(req))
    .then(async (res) => {
      if (isPlainResponse(res)) {
        await cache.put(req, res.clone());
        await trim(cache, MAX_PAGES);
      }
      return res;
    });
  // Keeps the worker alive until the cache write is done, even when we answered from cache.
  event.waitUntil(network.catch(() => undefined));

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), NAV_TIMEOUT_MS);
  });
  try {
    const first = await Promise.race([network, timeout]);
    if (first) return first;
  } catch (e) {
    /* offline: use the saved copy below */
  } finally {
    clearTimeout(timer);
  }

  // The app is a single-page app, so the saved homepage can stand in for any
  // route offline: the JavaScript (also cached) reads the URL and shows the right screen.
  const saved = (await cache.match(req, { ignoreVary: true })) || (await cache.match('/', { ignoreVary: true }));
  if (saved) return saved;
  return network.catch(
    () =>
      new Response('You are offline. Please reconnect and try again.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;

  if (path.startsWith('/assets/')) {
    event.respondWith(cacheFirstAsset(event));
    return;
  }

  if (req.destination === 'image' && path.startsWith('/wp-content/uploads/')) {
    event.respondWith(imageStaleWhileRevalidate(event));
    return;
  }

  if (req.mode === 'navigate') {
    if (WORDPRESS_PREFIXES.some((p) => path.startsWith(p))) return;
    // Pages with a query string (order confirmations, tracking, previews) are
    // always loaded live and never saved.
    if (url.search) return;
    event.respondWith(pageNetworkFirst(event));
  }
});
