const CACHE_NAME = 'chess-analyzer-v1';

// List of all the files that make up the app's shell
const urlsToCache = [
  '/',
  'index.html',
  'log-game.html',
  'dashboard.html',
  'style.css',
  'script.js',
  'dashboard.js',
  'manifest.json',
  'images/banner 1.png',
  'images/banner 2.png',
  'images/banner 3.png',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// 1. Install the service worker and cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Intercept network requests
self.addEventListener('fetch', event => {
  // Don't cache requests to the Google Apps Script API
  if (event.request.url.includes('script.google.com')) {
    return; // Let the request go to the network
  }

  // For all other requests, try the cache first, then the network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If we have a cached version, return it. Otherwise, fetch from the network.
        return response || fetch(event.request);
      })
  );
});