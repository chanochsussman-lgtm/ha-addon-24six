import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const Ctx = createContext(null)
const audio = new Audio()
audio.crossOrigin = 'use-credentials'

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
      if (i < q.length - 1) _play(q[i + 1], q, i + 1)
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

  const _play = async (t, q, i) => {
    setTrack(t)
    setQueue(q)
    setQIdx(i)
    queueRef.current = q
    qIdxRef.current = i
    setLoading(true)
    try {
      const base = window.ingressPath || ''
      const res = await fetch(`${base}/api/audio/${t.id}`)
      const data = await res.json()
      const url = data?.url || data
      if (!url || typeof url !== 'string') throw new Error('No URL in response')
      audio.src = url
      await audio.play()
    } catch (e) {
      console.error('[player] play error:', e)
      setLoading(false)
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title, artist: t.artist || '',
        artwork: t.img ? [{ src: t.img }] : []
      })
    }
  }

  const playTrack = useCallback((t, q = [], i = 0) => _play(t, q.length ? q : [t], i), [])

  const togglePlay = useCallback(() => {
    audio.paused ? audio.play() : audio.pause()
  }, [])

  const seek = useCallback(t => { audio.currentTime = t }, [])

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
  }, [])

  const playPrev = useCallback(() => {
    if (audio.currentTime > 3) { seek(0); return }
    const q = queueRef.current
    const i = qIdxRef.current
    if (i > 0) _play(q[i - 1], q, i - 1)
  }, [seek])

  const addToQueue = useCallback((song) => {
    setQueue(q => {
      const next = [...q, song]
      queueRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => audio.play())
    navigator.mediaSession.setActionHandler('pause', () => audio.pause())
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext())
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
