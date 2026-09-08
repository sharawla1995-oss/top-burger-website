const CACHE_NAME = 'top-burger-v6.2.0';
const APP_SHELL = ['./','./index.html','./styles.css?v=6.2.0','./app.js?v=6.2.0','./manifest.json','./icon-192.png','./icon-512.png','./top-burger-logo.jpg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => {
    const copy=response.clone();
    caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    return response;
  }).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});
