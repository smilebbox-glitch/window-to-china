const CACHE_PREFIX = "okno-v-kitai-pwa-";
const CACHE_NAME = `${CACHE_PREFIX}v179-3`;

const PRECACHE = [
  "/offline.html",
  "/manifest.json",
  "/favicon.svg",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/news", self.location.origin);

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (target.origin === self.location.origin) {
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) return client.navigate(target.href);
          return client;
        }
      }
    }
    return self.clients.openWindow(target.href);
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Intelligence/API data must always come from the network. We deliberately
  // do not cache news, analytics, user, pilot, admin or metrics responses.
  if (url.pathname.startsWith("/api/")) return;

  // HTML/navigation is network-first. If the server is unavailable, show a
  // neutral offline screen instead of potentially stale business information.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html")),
    );
    return;
  }

  // Application JavaScript and CSS are network-first so a newly deployed UI
  // is visible immediately. Cached code is used only when the server cannot be reached.
  const isCodeAsset =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:css|js)$/.test(url.pathname);

  if (isCodeAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok && response.type === "basic") {
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await cache.match(request);
          return cached || Response.error();
        }
      }),
    );
    return;
  }

  const isStaticAsset = /\.(?:json|woff2?|png|svg|ico)$/.test(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      const refresh = async () => {
        const response = await fetch(request);
        if (response.ok && response.type === "basic") {
          await cache.put(request, response.clone());
        }
        return response;
      };

      if (cached) {
        event.waitUntil(refresh().then(() => undefined).catch(() => undefined));
        return cached;
      }

      return refresh();
    }),
  );
});
