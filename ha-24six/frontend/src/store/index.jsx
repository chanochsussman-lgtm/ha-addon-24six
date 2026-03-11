import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const Ctx = createContext(null)
const audio = new Audio()
audio.crossOrigin = 'use-credentials'

export function PlayerProvider({ children }) {
  const [track, setTrack]     = useState(null)
  const [queue, setQueue]     = useState([])
  const [qIdx, setQIdx]       = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onTime  = () => setProgress(audio.currentTime)
    const onDur   = () => setDuration(isNaN(audio.duration) ? 0 : audio.duration)
    const onPlay  = () => { setPlaying(true); setLoading(false) }
    const onPause = () => setPlaying(false)
    const onWait  = () => setLoading(true)
    const onCan   = () => setLoading(false)
    const onEnd   = () => playNext()
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

  const _play = useCallback((t, q, i) => {
    setTrack(t); setQueue(q); setQIdx(i); setLoading(true)
    audio.src = (window.ingressPath || '') + '/api/audio/' + t.id
    audio.play().catch(console.error)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title, artist: t.artist || '',
        artwork: t.img ? [{ src: t.img }] : []
      })
    }
  }, [])

  const playTrack = useCallback((t, q = [], i = 0) => _play(t, q, i), [_play])
  const togglePlay = useCallback(() => { audio.paused ? audio.play() : audio.pause() }, [])
  const seek = useCallback(t => { audio.currentTime = t }, [])

  const playNext = useCallback(() => {
    setQueue(q => {
      setQIdx(i => {
        if (i < q.length - 1) { _play(q[i+1], q, i+1); return i+1 }
        return i
      })
      return q
    })
  }, [_play])

  const playPrev = useCallback(() => {
    if (audio.currentTime > 3) { seek(0); return }
    setQueue(q => {
      setQIdx(i => {
        if (i > 0) { _play(q[i-1], q, i-1); return i-1 }
        return i
      })
      return q
    })
  }, [_play, seek])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => audio.play())
    navigator.mediaSession.setActionHandler('pause', () => audio.pause())
    navigator.mediaSession.setActionHandler('nexttrack', playNext)
    navigator.mediaSession.setActionHandler('previoustrack', playPrev)
  }, [playNext, playPrev])

  return (
    <Ctx.Provider value={{ track, queue, qIdx, playing, progress, duration, loading, playTrack, togglePlay, seek, playNext, playPrev }}>
      {children}
    </Ctx.Provider>
  )
}

export const usePlayer = () => useContext(Ctx)
