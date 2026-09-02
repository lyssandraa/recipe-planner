// Minimal offline-shell service worker. No data sync, no background fetch,
// just: cache a handful of static assets up front, and when a navigation
// request fails outright (no network at all), serve a plain offline page
// instead of the browser's own connection-error interstitial. Everything
// that actually needs live data (recipes, pantry, shopping list) is
// server-rendered per request and simply won't have fresh content offline,
// that's expected and fine, the goal here is just "don't crash".

const CACHE_NAME = "recipe-planner-shell-v1";
const SHELL_ASSETS = [
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {
        // Any one asset failing to cache (e.g. offline during install
        // itself) shouldn't block installation.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Page navigations: go to the network for fresh, dynamic content: if
  // that fails outright (offline), fall back to the cached shell page
  // rather than letting the browser show its own error.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html").then((r) => r ?? Response.error()))
    );
    return;
  }

  // Static assets (JS/CSS/images/fonts): cache-first, filling the cache
  // opportunistically as they're fetched, so a later offline visit can
  // still serve whatever was already seen online.
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request)
            .then((response) => {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
              return response;
            })
            .catch(() => cached)
      )
    );
  }
});
