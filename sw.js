/* Daftar service worker.
   The page and its code are fetched fresh when there is a connection, so an
   update shows up as soon as it is uploaded. The cached copy is the fallback,
   which is what keeps the shop running with no internet.
   Icons and the manifest never change, so those come from the cache first. */

const CACHE = "daftar-v3";
const SHELL = ["./", "./index.html", "./config.js", "./manifest.json",
               "./icon-192.png", "./icon-512.png",
               "./icon-maskable.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isLive(req) {
  if (req.mode === "navigate") return true;
  const u = new URL(req.url);
  return u.pathname.endsWith("/") ||
         u.pathname.endsWith("index.html") ||
         u.pathname.endsWith("config.js");
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  if (isLive(req)) {
    // newest version wins; cache is the safety net when offline
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // icons, fonts and anything else: cache first, it never changes
  e.respondWith(
    caches.match(req).then(hit =>
      hit || fetch(req).then(res => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit)
    )
  );
});
