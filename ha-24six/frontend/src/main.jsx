import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// ── Ingress path detection ───────────────────────────────────────────────────
const parts = window.location.pathname.split('/')
const idx = parts.indexOf('hassio_ingress')
window.ingressPath = idx !== -1 ? '/' + parts.slice(1, idx + 2).join('/') : ''

// ── Service Worker registration ──────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = window.ingressPath + '/sw.js'
    navigator.serviceWorker.register(swUrl, { scope: window.ingressPath + '/' })
      .then(reg => {
        console.log('[sw] Registered, scope:', reg.scope)

        // Keep SW alive — ping every 20s so it never goes idle
        setInterval(() => {
          if (reg.active) reg.active.postMessage('ping')
        }, 20_000)

        // Check for updates every 5 minutes
        setInterval(() => reg.update(), 5 * 60_000)
      })
      .catch(e => console.warn('[sw] Registration failed:', e))
  })
}

// ── Server keep-alive heartbeat ──────────────────────────────────────────────
// Pings the backend every 30s so the add-on process never idles/sleeps
// Also detects if the server died and shows a reconnect banner
let serverAlive = true
function pingServer() {
  fetch((window.ingressPath || '') + '/api/setup/status', { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error('non-ok')
      if (!serverAlive) {
        serverAlive = true
        window.__serverReconnected?.()
      }
    })
    .catch(() => {
      if (serverAlive) {
        serverAlive = false
        window.__serverDisconnected?.()
      }
    })
}
setInterval(pingServer, 30_000)

// ── Visibility change — re-ping immediately on tab focus ─────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') pingServer()
})

// ── Wake lock — prevent screen sleep while playing (best-effort) ─────────────
let wakeLock = null
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      console.log('[wakelock] Acquired')
    } catch {}
  }
}
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && wakeLock === null) {
    await requestWakeLock()
  }
})
requestWakeLock()

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={window.ingressPath || '/'}>
    <App />
  </BrowserRouter>
)
