import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const Ctx = createContext(null)
const audio = new Audio()
// Do NOT set crossOrigin - Mux CDN URLs are cross-origin and don't need credentials

export function PlayerProvider({ children }) {
  const [track, setTrack]       = useState(null)
  const [queue, setQueue]       = useState([])
  const [qIdx, setQIdx]         = useState(0)
  const [playing, setPlaying]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading]   = useState(false)
  const queueRef = useRef([])
  const qIdxRef  = useRef(0)
  const _playRef = useRef(null)

  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { qIdxRef.current = qIdx }, [qIdx])

  useEffect(() => {
    const onTime  = () => setProgress(audio.currentTime)
    const onDur   = () => setDuration(isNaN(audio.duration) ? 0 : audio.duration)
    const onPlay  = () => { setPlaying(true); setLoading(false) }
    const onPause = () => setPlaying(false)
    const onWait  = () => setLoading(true)
    const onCan   = () => setLoading(false)
    const onEnd   = () => {
      const q = queueRef.current
      const i = qIdxRef.current
      if (i < q.length - 1) _playRef.current?.(q[i + 1], q, i + 1)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('durationchange', onDur)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('waiting', onWait)
    audio.addEventListener('canplay', onCan)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('durationchange', onDur)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('waiting', onWait)
      audio.removeEventListener('canplay', onCan)
      audio.removeEventListener('ended', onEnd)
    }
  }, [])

  const _play = useCallback(async (t, q, i) => {
    setTrack(t)
    setQueue(q)
    setQIdx(i)
    queueRef.current = q
    qIdxRef.current = i
    setLoading(true)
    setProgress(0)
    setDuration(0)

    try {
      const base = window.ingressPath || ''
      const res  = await fetch(`${base}/api/audio/${t.id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const url  = typeof data === 'string' ? data : data?.url
      if (!url) throw new Error('No URL in response: ' + JSON.stringify(data))

      console.log('[player] src:', url.slice(0, 80))
      audio.src = url
      audio.load()
      const playPromise = audio.play()
      if (playPromise) await playPromise
    } catch (e) {
      console.error('[player] error:', e.message)
      setLoading(false)
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title, artist: t.artist || '',
        artwork: t.img ? [{ src: t.img, sizes: '512x512', type: 'image/jpeg' }] : []
      })
    }
  }, [])

  // Keep ref in sync so the ended handler can call it
  useEffect(() => { _playRef.current = _play }, [_play])

  const playTrack = useCallback((t, q = [], i = 0) => _play(t, q.length ? q : [t], i), [_play])
  const togglePlay = useCallback(() => { audio.paused ? audio.play() : audio.pause() }, [])
  const seek = useCallback(s => { audio.currentTime = s }, [])

  const playNext = useCallback((songToInsert) => {
    if (songToInsert) {
      setQueue(q => {
        const next = [...q]
        next.splice(qIdxRef.current + 1, 0, songToInsert)
        queueRef.current = next
        return next
      })
    } else {
      const q = queueRef.current
      const i = qIdxRef.current
      if (i < q.length - 1) _play(q[i + 1], q, i + 1)
    }
  }, [_play])

  const playPrev = useCallback(() => {
    if (audio.currentTime > 3) { seek(0); return }
    const q = queueRef.current
    const i = qIdxRef.current
    if (i > 0) _play(q[i - 1], q, i - 1)
  }, [_play, seek])

  const addToQueue = useCallback((song) => {
    setQueue(q => { const n = [...q, song]; queueRef.current = n; return n })
  }, [])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play',          () => audio.play())
    navigator.mediaSession.setActionHandler('pause',         () => audio.pause())
    navigator.mediaSession.setActionHandler('nexttrack',     () => playNext())
    navigator.mediaSession.setActionHandler('previoustrack', playPrev)
  }, [playNext, playPrev])

  return (
    <Ctx.Provider value={{
      track, queue, qIdx, playing, progress, duration, loading,
      playTrack, togglePlay, seek, playNext, playPrev, addToQueue
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const usePlayer = () => useContext(Ctx)
