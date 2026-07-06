const CACHE_NAME = "hospital-inventory-app-v13";
const APP_SHELL = [
  "/Ecart-/",
  "/Ecart-/manifest.webmanifest?v=20260707a",
  "/Ecart-/viewer.webmanifest?v=20260707a",
  "/Ecart-/pharmacy-viewer.webmanifest?v=20260707a",
  "/Ecart-/narcotic-viewer.webmanifest?v=20260707a",
  "/Ecart-/icons/app-icon-192.png?v=20260707a",
  "/Ecart-/icons/app-icon-desktop-512.png?v=20260707a",
  "/Ecart-/icons/narcotic-icon-192.png?v=20260707a",
  "/Ecart-/icons/narcotic-icon-desktop-512.png?v=20260707a",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.pathname.includes("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/Ecart-/")));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
});
