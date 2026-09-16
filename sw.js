// NUKE 3000 — Service Worker (PWA)
const CACHE = 'nuke3000-v1';
const ASSETS = [
  '/nuke3000/',
  '/nuke3000/index.html',
  '/nuke3000/css/game.css',
  '/nuke3000/js/assets.js',
  '/nuke3000/js/data.js',
  '/nuke3000/js/setup.js',
  '/nuke3000/js/map.js',
  '/nuke3000/js/engine.js',
  '/nuke3000/js/combat.js',
  '/nuke3000/js/ui.js',
  '/nuke3000/js/online.js',
  '/nuke3000/js/firebase-config.js',
  '/nuke3000/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network first for Firebase, cache first for local assets
  if (e.request.url.includes('firebase') || e.request.url.includes('googleapis')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
