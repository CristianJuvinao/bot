/* sw.js — Service Worker para PWA Biofood Bot */

const CACHE = 'biofood-bot-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

/* Instalación: cachear assets estáticos */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

/* Activación: limpiar caches viejos */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Fetch: cache-first para assets, network-first para API */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* Llamadas a la API del servidor → siempre red (nunca cache) */
  if (url.pathname.startsWith('/verificar') ||
      url.pathname.startsWith('/reservar')  ||
      url.pathname.startsWith('/logout')) {
    return; /* deja pasar sin interceptar */
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
