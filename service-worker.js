// Lia's OS — Service Worker
// Strategy: Cache the app shell for offline use.
// Supabase data is NOT cached here (handled by localForage in the app).

const CACHE_NAME = 'liaos-v1';

// App shell files to cache for offline use
const SHELL_FILES = [
  './',
  './playground.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// CDN resources to cache (fonts, scripts)
const CDN_FILES = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://unpkg.com/localforage@1.10.0/dist/localforage.min.js',
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache local files (best effort)
      const localPromise = cache.addAll(SHELL_FILES).catch(() => {});
      // Cache CDN files (best effort — may fail on first install if offline)
      const cdnPromise = Promise.allSettled(
        CDN_FILES.map(url => cache.add(url).catch(() => {}))
      );
      return Promise.all([localPromise, cdnPromise]);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for shell & CDN, network-first for everything else
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache Supabase API calls
  if (url.hostname.includes('supabase')) return;

  // For Google Fonts: cache-first (they're immutable)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // For app shell and CDN: cache-first, fall back to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Only cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // If offline and not cached, return a basic offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./playground.html');
        }
      });
    })
  );
});
