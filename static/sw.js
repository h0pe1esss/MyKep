const CACHE_NAME = 'mykep-pwa-v1';
const DYNAMIC_CACHE = 'mykep-dynamic-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/static/index.html',
    '/static/style.css',
    '/static/app.js',
    '/static/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('/api/schedule')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    return caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(event.request.url, response.clone());
                        return response;
                    });
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
        );
    }
});