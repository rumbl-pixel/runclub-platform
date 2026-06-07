var CACHE_NAME = 'gwynne-park-run-club-v5';
var CORE_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './admin-dashboard.html',
  './student.html',
  './student-profile.html',
  './parent.html',
  './leaderboard.html',
  './privacy-policy.html',
  './kiosk.html',
  './styles.css',
  './kiosk.css',
  './config.js',
  './admin.js',
  './admin-dashboard.js',
  './admin-goals.js',
  './goals.js',
  './kiosk.js',
  './leaderboard.js',
  './parent.js',
  './pwa.js',
  './scanning.js',
  './student.js',
  './tracking.js',
  './manifest.webmanifest',
  './assets/gwynne-park-logo.png',
  './assets/app-icon-192.png',
  './assets/app-icon-512.png',
  './assets/qrcode-generator.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE_NAME;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') { return; }
  var requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) { return; }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) { return cached; }
      return fetch(event.request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      }).catch(function () {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
