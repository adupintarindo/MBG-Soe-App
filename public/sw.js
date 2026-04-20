// MBG Soe — Service Worker
// Strategy:
//   - Network-first for navigation + API (Supabase) with timeout fallback to cache
//   - Stale-while-revalidate for static assets (_next/static, icons)
//   - Offline fallback page for navigation
//   - Background sync hook for queued mutations (via IndexedDB outbox)
//
// Version bump invalidates old caches.

const VERSION = "mbg-soe-v1";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

function isSupabaseApi(url) {
  return /\.supabase\.co\/rest\/v1\//.test(url.href) ||
    /\.supabase\.co\/auth\/v1\//.test(url.href);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // mutations handled by outbox on client
  const url = new URL(req.url);

  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          const clone = net.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
          return net;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          return caches.match("/offline") || new Response(
            "<h1>Offline</h1><p>Reconnect to load this page.</p>",
            { headers: { "Content-Type": "text/html" } }
          );
        }
      })()
    );
    return;
  }

  if (isSupabaseApi(url)) {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          if (net.ok) {
            const clone = net.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
          }
          return net;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: "offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
          });
        }
      })()
    );
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "mbg-outbox-flush") {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "flush-outbox" }));
      })
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "skip-waiting") self.skipWaiting();
});
