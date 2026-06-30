// Brújula — Service Worker
// Estrategia: Network First para el HTML (siempre la versión más nueva),
// Cache First para assets estáticos que casi no cambian (íconos, manifest).

const CACHE_NAME = 'brujula-v2';
const APP_SHELL = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Instalar: cachear solo los assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejos y tomar control inmediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Funciones serverless y servicios externos: siempre red, nunca cachear
  if (
    url.pathname.startsWith('/.netlify/functions/') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // HTML (la app en sí, incluida la raíz "/"): Network First.
  // Siempre intenta traer la versión más nueva; si no hay internet,
  // recién ahí usa la última copia guardada como respaldo.
  const esHTML = url.pathname === '/' || url.pathname.endsWith('.html') || event.request.mode === 'navigate';
  if (esHTML) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Resto de assets estáticos (íconos, manifest): Cache First con fallback a red
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        return response;
      });
    })
  );
});
