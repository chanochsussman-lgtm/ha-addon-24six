// 24Six Service Worker — keeps app shell cached and audio fetch alive
const CACHE = 'twentyfour-six-v4'
const PRECACHE = ['./', './index.html']

self.addEventListener('install', evt => {
  self.skipWaiting()
  evt.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {})))
})

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url)

  // Never intercept API, WS, audio, or non-GET requests
  if (
    url.pathname.includes('/api/') ||
    url.pathname.includes('/ws/') ||
    evt.request.method !== 'GET'
  ) return

  if (evt.request.mode === 'navigate') {
    // For navigation: fetch fresh, fall back to cached index.html
    // IMPORTANT: clone before reading to avoid "body already used" error
    evt.respondWith(
      fetch(evt.request.clone())
        .then(res => {
          if (res.ok) {
            const toCache = res.clone()
            caches.open(CACHE).then(c => c.put(evt.request, toCache))
          }
          return res
        })
        .catch(() => caches.match('./index.html'))
    )
    return
  }

  // For assets: cache-first
  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) return cached
      return fetch(evt.request.clone()).then(res => {
        if (res && res.ok && res.status < 400) {
          const toCache = res.clone()
          caches.open(CACHE).then(c => c.put(evt.request, toCache))
        }
        return res
      }).catch(() => new Response('', { status: 503 }))
    })
  )
})

self.addEventListener('message', evt => {
  if (evt.data === 'ping') evt.source?.postMessage('pong')
  if (evt.data === 'keepalive') {
    evt.waitUntil(self.clients.matchAll().then(() => {}))
  }
})

self.addEventListener('periodicsync', evt => {
  if (evt.tag === 'keepalive') evt.waitUntil(Promise.resolve())
})
