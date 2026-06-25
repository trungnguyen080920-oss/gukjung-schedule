// PolyGlot Hub — Service Worker (PWA)
// Chiến lược: Network-first cho API, Cache-first cho static assets
const CACHE_NAME = "polyglot-hub-v1";
const STATIC_ASSETS = ["/", "/dashboard", "/login", "/manifest.json"];

// Install: pre-cache các trang chính
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: dọn cache cũ
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // API calls: network-only (không cache — dữ liệu realtime)
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Static assets: network-first với cache fallback
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Background sync — trigger khi có kết nối trở lại
self.addEventListener("sync", (e) => {
  if (e.tag === "sync-anki") {
    e.waitUntil(fetch("/api/anki/stats").catch(() => {}));
  }
});

// Push notifications
self.addEventListener("push", (e) => {
  if (!e.data) return;
  const { title, body, icon } = e.data.json();
  e.waitUntil(
    self.registration.showNotification(title ?? "PolyGlot Hub", {
      body: body ?? "",
      icon: icon ?? "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    })
  );
});
