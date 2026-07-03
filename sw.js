/* Vocabulary Fountain service worker
   IMPORTANT: bump CACHE_VERSION every time you deploy a new index.html,
   otherwise installed users keep the old cached version. */
var CACHE_VERSION = 'vf-lemon-1';
var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  // Navigations: serve cached index immediately, refresh cache in background
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(function (cached) {
        var fetched = fetch(e.request).then(function (resp) {
          if (resp && resp.ok) {
            var copy = resp.clone();
            caches.open(CACHE_VERSION).then(function (c) { c.put('./index.html', copy); });
          }
          return resp;
        }).catch(function () { return cached; });
        return cached || fetched;
      })
    );
    return;
  }

  // Everything else (icons, fonts): cache-first, then network + cache
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (resp) {
        if (resp && resp.ok && (e.request.url.indexOf(self.location.origin) === 0 ||
            e.request.url.indexOf('fonts.g') !== -1)) {
          var copy = resp.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function () { return cached; });
    })
  );
});
