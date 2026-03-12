import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// ── Ingress path detection ────────────────────────────────────────────────────
const parts = window.location.pathname.split('/')
const idx = parts.indexOf('hassio_ingress')
window.ingressPath = idx !== -1 ? '/' + parts.slice(1, idx + 2).join('/') : ''

// ── Expose audio resume hook for visibility handler ───────────────────────────
window.__resumeAudioIfPlaying = () => {}  // filled in by store

// ── Visibility change — resume audio when tab comes back ─────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    window.__resumeAudioIfPlaying?.()
    pingServer()
  }
})

// ── Service Worker ────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = window.ingressPath + '/sw.js'
    navigator.serviceWorker.register(swUrl, { scope: window.ingressPath + '/' })
      .then(reg => {
        console.log('[sw] Registered, scope:', reg.scope)
        setInterval(() => reg.active?.postMessage('keepalive'), 15_000)
        setInterval(() => reg.update(), 5 * 60_000)
      })
      .catch(e => console.warn('[sw] Registration failed:', e))
  })
}

// ── Server keep-alive ─────────────────────────────────────────────────────────
let serverAlive = true
function pingServer() {
  fetch((window.ingressPath || '') + '/api/setup/status', { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error('non-ok')
      if (!serverAlive) { serverAlive = true; window.__serverReconnected?.() }
    })
    .catch(() => {
      if (serverAlive) { serverAlive = false; window.__serverDisconnected?.() }
    })
}
setInterval(pingServer, 25_000)

// ── Wake lock ─────────────────────────────────────────────────────────────────
let wakeLock = null
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return
  try {
    wakeLock = await navigator.wakeLock.request('screen')
    wakeLock.addEventListener('release', () => { wakeLock = null })
  } catch {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !wakeLock) requestWakeLock()
})
document.addEventListener('click', () => { if (!wakeLock) requestWakeLock() }, { once: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={window.ingressPath || '/'}>
    <App />
  </BrowserRouter>
)
