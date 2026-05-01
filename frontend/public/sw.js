const CACHE_NAME = "petunia-ai-v3";
const STATIC_ASSETS = [
  "/logo.png",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // No llamar skipWaiting() automáticamente — en iOS causa pantalla blanca
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // No cachear rutas de API ni rutas de app (protegidas por auth)
  if (url.pathname.startsWith("/api")) return;
  if (url.pathname.startsWith("/_next")) return;
  // Solo cachear assets estáticos del public folder
  const isStaticAsset = STATIC_ASSETS.some((a) => url.pathname === a)
    || url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?|ttf)$/);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
