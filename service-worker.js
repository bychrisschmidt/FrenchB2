const CACHE = "french-app-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Don't cache Firebase/Google auth or Firestore traffic — always go to network.
  if (e.request.url.includes("googleapis.com") || e.request.url.includes("gstatic.com/firebasejs")) {
    return;
  }

  const isPage = e.request.mode === "navigate" ||
    (e.request.headers.get("accept") || "").includes("text/html");

  if (isPage) {
    // Network-first for the HTML shell so config/content changes show up immediately.
    // Falls back to the cached copy only if the network is unavailable.
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for static assets (icons, manifest) — fine to serve stale, refresh in background.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return resp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
