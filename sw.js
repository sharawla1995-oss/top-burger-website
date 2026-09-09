const CACHE_NAME = 'top-burger-v6.6.1';
const APP_SHELL = [
  './','./index.html','./styles.css?v=6.6.1','./app.js?v=6.6.1',
  './theme.js?v=6.6.1','./install-prompt.js?v=6.6.1','./manifest.json',
  './icon-192.png','./icon-512.png','./top-burger-logo.jpg'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(event.request);
      if(response && response.ok){
        const cache=await caches.open(CACHE_NAME);
        await cache.put(event.request,response.clone());
      }
      return response;
    }catch(err){
      const cached=await caches.match(event.request);
      if(cached)return cached;
      if(event.request.mode==='navigate'){
        const shell=await caches.match('./index.html');
        if(shell)return shell;
      }
      throw err;
    }
  })());
});
