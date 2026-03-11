import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { api } from '../api'

// Singleton audio element
const audioEl = new Audio()
audioEl.crossOrigin = 'use-credentials'
audioEl.preload = 'metadata'

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null)
  const [queue, setQueue] = useState([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [loading, setLoading] = useState(false)

  // Wire up audio element events
  useEffect(() => {
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => playNext()
    const onTimeUpdate = () => setProgress(audioEl.currentTime)
    const onDuration = () => setDuration(audioEl.duration)
    const onWaiting = () => setLoading(true)
    const onCanPlay = () => setLoading(false)

    audioEl.addEventListener('play', onPlay)
    audioEl.addEventListener('pause', onPause)
    audioEl.addEventListener('ended', onEnded)
    audioEl.addEventListener('timeupdate', onTimeUpdate)
    audioEl.addEventListener('durationchange', onDuration)
    audioEl.addEventListener('waiting', onWaiting)
    audioEl.addEventListener('canplay', onCanPlay)

    // Android: prevent suspension on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && playing) audioEl.play().catch(() => {})
    })

    return () => {
      audioEl.removeEventListener('play', onPlay)
      audioEl.removeEventListener('pause', onPause)
      audioEl.removeEventListener('ended', onEnded)
      audioEl.removeEventListener('timeupdate', onTimeUpdate)
      audioEl.removeEventListener('durationchange', onDuration)
      audioEl.removeEventListener('waiting', onWaiting)
      audioEl.removeEventListener('canplay', onCanPlay)
    }
  }, [playing])

  // MediaSession API
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.subtitle || '',
      artwork: currentTrack.img ? [{ src: currentTrack.img, sizes: '512x512' }] : []
    })
    navigator.mediaSession.setActionHandler('play', () => audioEl.play())
    navigator.mediaSession.setActionHandler('pause', () => audioEl.pause())
    navigator.mediaSession.setActionHandler('previoustrack', playPrev)
    navigator.mediaSession.setActionHandler('nexttrack', playNext)
  }, [currentTrack])

  const playTrack = useCallback((track, tracks = [], index = 0) => {
    setCurrentTrack(track)
    setQueue(tracks)
    setQueueIndex(index)
    audioEl.src = api.audioUrl(track.id)
    audioEl.load()
    audioEl.play().catch(e => console.error('[player] Play error:', e))
  }, [])

  const playNext = useCallback(() => {
    if (queue.length === 0) return
    const next = (queueIndex + 1) % queue.length
    setQueueIndex(next)
    playTrack(queue[next], queue, next)
  }, [queue, queueIndex, playTrack])

  const playPrev = useCallback(() => {
    if (audioEl.currentTime > 3) {
      audioEl.currentTime = 0
      return
    }
    if (queue.length === 0) return
    const prev = (queueIndex - 1 + queue.length) % queue.length
    setQueueIndex(prev)
    playTrack(queue[prev], queue, prev)
  }, [queue, queueIndex, playTrack])

  const togglePlay = useCallback(() => {
    if (playing) audioEl.pause()
    else audioEl.play().catch(() => {})
  }, [playing])

  const seek = useCallback((time) => {
    audioEl.currentTime = time
  }, [])

  const changeVolume = useCallback((v) => {
    audioEl.volume = v
    setVolume(v)
  }, [])

  return (
    <PlayerContext.Provider value={{
      currentTrack, queue, queueIndex,
      playing, progress, duration, volume, loading,
      playTrack, playNext, playPrev, togglePlay, seek, changeVolume
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  return useContext(PlayerContext)
}
