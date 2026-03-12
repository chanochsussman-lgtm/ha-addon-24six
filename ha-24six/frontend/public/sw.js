// 24Six Service Worker — keeps app shell cached and audio fetch alive
const CACHE = 'twentyfour-six-v3'
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

  // Never intercept API, WS, or audio stream calls
  if (url.pathname.includes('/api/') || url.pathname.includes('/ws/')) return

  if (evt.request.mode === 'navigate') {
    evt.respondWith(
      fetch(evt.request)
        .then(res => { caches.open(CACHE).then(c => c.put(evt.request, res.clone())); return res })
        .catch(() => caches.match('./index.html'))
    )
    return
  }

  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) return cached
      return fetch(evt.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(evt.request, res.clone()))
        return res
      })
    })
  )
})

// Keep SW alive with periodic pings from the page
self.addEventListener('message', evt => {
  if (evt.data === 'ping') evt.source?.postMessage('pong')
  // When SW gets a ping while page is backgrounded, do a no-op fetch
  // to prevent the SW from being killed
  if (evt.data === 'keepalive') {
    evt.waitUntil(
      self.clients.matchAll().then(() => {})
    )
  }
})

// Periodic background sync — keep SW alive even when page is backgrounded
self.addEventListener('periodicsync', evt => {
  if (evt.tag === 'keepalive') {
    evt.waitUntil(Promise.resolve())
  }
})
