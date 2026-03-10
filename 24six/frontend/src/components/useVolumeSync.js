/**
 * useVolumeSync
 *
 * Keeps the UI volume slider in sync with the actual playback device:
 *
 * Browser mode:
 *   - Listens to audioEl "volumechange" events → updates store
 *   - Hardware volume buttons (MediaSession + keydown) adjust audioEl.volume
 *
 * HA device mode:
 *   - Polls /api/ha/speakers every POLL_MS and updates store volume
 *   - Hardware volume buttons send volume_set to HA entity
 *   - Slider changes already call setVolume → /api/ha/call via store
 */
import { useEffect, useRef, useCallback } from 'react'
import { usePlayerStore } from '../store'

const POLL_MS = 3000
const STEP = 0.05

export function useVolumeSync() {
  const {
    audioEl,
    entity_id,
    volume,
    setVolume,
  } = usePlayerStore()

  const pollRef = useRef(null)
  const entityRef = useRef(entity_id)
  const volumeRef = useRef(volume)

  // Keep refs current so event handlers always see latest values
  useEffect(() => { entityRef.current = entity_id }, [entity_id])
  useEffect(() => { volumeRef.current = volume }, [volume])

  // ── Browser: listen to audioEl volumechange ───────────────────────────────
  useEffect(() => {
    if (!audioEl || entity_id) return
    const onVolumeChange = () => {
      setVolume(audioEl.volume)
    }
    audioEl.addEventListener('volumechange', onVolumeChange)
    return () => audioEl.removeEventListener('volumechange', onVolumeChange)
  }, [audioEl, entity_id, setVolume])

  // ── HA device: poll volume_level every POLL_MS ───────────────────────────
  useEffect(() => {
    if (!entity_id) {
      clearInterval(pollRef.current)
      return
    }

    const poll = async () => {
      try {
        const r = await fetch('/api/ha/speakers')
        if (!r.ok) return
        const speakers = await r.json()
        const sp = speakers.find(s => s.entity_id === entityRef.current)
        if (sp && typeof sp.volume === 'number') {
          // Only update if meaningfully different (avoids fighting with slider drag)
          if (Math.abs(sp.volume - volumeRef.current) > 0.02) {
            setVolume(sp.volume)
          }
        }
      } catch {}
    }

    poll() // immediate first poll
    pollRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [entity_id, setVolume])

  // ── Hardware volume buttons ───────────────────────────────────────────────
  const adjustVolume = useCallback((delta) => {
    const current = volumeRef.current
    const next = Math.min(1, Math.max(0, current + delta))

    if (entityRef.current) {
      // HA device
      setVolume(next)
      fetch('/api/ha/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'media_player',
          service: 'volume_set',
          entity_id: entityRef.current,
          data: { volume_level: next },
        }),
      }).catch(() => {})
    } else {
      // Browser audio element
      setVolume(next)
      const el = usePlayerStore.getState().audioEl
      if (el) el.volume = next
    }
  }, [setVolume])

  // Keyboard volume keys (desktop / Android keyboards with media keys)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'AudioVolumeUp'   || e.code === 'AudioVolumeUp')   { e.preventDefault(); adjustVolume(+STEP) }
      if (e.key === 'AudioVolumeDown' || e.code === 'AudioVolumeDown') { e.preventDefault(); adjustVolume(-STEP) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adjustVolume])

  // MediaSession action handlers (Android hardware buttons route here in PWA/Chrome)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.setActionHandler('seekforward', null)  // keep default
      navigator.mediaSession.setActionHandler('seekbackward', null) // keep default
    } catch {}
    // volumeup/volumedown aren't in the standard MediaSession spec yet,
    // but some browsers/Chromium forks support them
    try {
      navigator.mediaSession.setActionHandler('seekto', null)
    } catch {}
  }, [])

  return { adjustVolume }
}

