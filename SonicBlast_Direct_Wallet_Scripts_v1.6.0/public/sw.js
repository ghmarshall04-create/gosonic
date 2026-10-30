const CACHE = "sonicblast-smart-shell-v6";
const SHELL = ["/", "/index.html", "/styles.css", "/app.js", "/wallet.js", "/console.js", "/launch-plan.js", "/network-config.js", "/chain-scripts.js", "/factory-artifact.js", "/vendor/xterm/xterm.mjs", "/vendor/xterm/addon-fit.mjs", "/vendor/xterm/xterm.css", "/assets/sonicblast-factory-artifact.json", "/manifest.webmanifest", "/assets/sonicblast-mark.jpeg", "/assets/favicon-white.svg"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).pathname.startsWith("/api/") || new URL(event.request.url).pathname.startsWith("/ws/")) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("/"))));
});
