/* AppCetato — Service Worker
 * Estrategias:
 *  - Cache First  → imágenes de Cloudinary (res.cloudinary.com)
 *  - Network First → navegación y datos (con fallback a caché → offline)
 *  - Stale-While-Revalidate → resto de assets estáticos same-origin
 */
const CACHE_SHELL = "appcetato-shell-v1";
const CACHE_DATA = "appcetato-data-v1";
const CACHE_IMAGES = "appcetato-images-v1";

const PRECACHE_URLS = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const keep = [CACHE_SHELL, CACHE_DATA, CACHE_IMAGES];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cache First para imágenes de Cloudinary
  if (url.hostname === "res.cloudinary.com") {
    event.respondWith(cacheFirst(request, CACHE_IMAGES));
    return;
  }

  // Network First para navegación y datos (permite ver la colección guardada offline)
  if (request.mode === "navigate" || url.pathname.endsWith(".json")) {
    event.respondWith(networkFirst(request, CACHE_DATA));
    return;
  }

  // SWR para assets estáticos same-origin
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, CACHE_SHELL));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return cached || Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await caches.match("/index.html");
      if (shell) return shell;
    }
    return Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}
