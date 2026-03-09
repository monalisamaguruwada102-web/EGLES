const CACHE_NAME = 'egles-smis-v5';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css?v=5',
    '/app_v1.js?v=5',
    '/db.js?v=5',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    // Network first for API calls
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => new Response('{"error":"offline"}', {
                headers: { 'Content-Type': 'application/json' }
            }))
        );
        return;
    }

    // Cache first for static assets
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return res;
            });
        }).catch(() => caches.match('/index.html'))
    );
});
