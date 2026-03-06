import React, { useState, useEffect, useRef } from 'react'
import { useQuery } from 'react-query'
import { usePlayerStore } from '../store'
import { getArtwork, getSongTitle, getArtistName } from '../api'

export default function LiveRadioPage() {
  const { data, isLoading, error } = useQuery('live', () =>
    fetch('/api/live').then(r => r.json()), {
    refetchInterval: 30000, // refresh every 30s
  })
  const { data: replays, isLoading: loadingReplays } = useQuery('liveReplays', () =>
    fetch('/api/live/replays').then(r => r.json())
  )
  const [liveActive, setLiveActive] = useState(false)
  const audioRef = useRef(null)
  const { audioEl, currentSong } = usePlayerStore()

  const live = data?.live || data
  const replayList = replays?.data || replays?.items || replays || []

  const isLivePlaying = liveActive && currentSong?.isLive

  const playLive = () => {
    if (!live?.stream_url && !live?.id) return
    const url = live?.stream_url || `/api/live/stream`
    const { audioEl: el } = usePlayerStore.getState()
    if (el) {
      el.src = url
      el.play().catch(() => {})
      usePlayerStore.setState({
        currentSong: {
          id: 'live',
          title: live?.title || 'Live Radio',
          artist: { name: live?.artist || '24Six Live' },
          artwork: live?.artwork || live?.image,
          isLive: true,
        },
        isPlaying: true,
        progress: 0,
        duration: 0,
      })
      setLiveActive(true)
    }
  }

  const stopLive = () => {
    const { audioEl: el } = usePlayerStore.getState()
    if (el) { el.pause(); el.src = '' }
    usePlayerStore.setState({ isPlaying: false })
    setLiveActive(false)
  }

  return (
    <div className="pt-8 pb-6 fade-in">
      <div className="px-6 mb-6">
        <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text)' }}>Live</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Live radio and audio replays</p>
      </div>

      {/* Live player card */}
      <div className="mx-6 mb-8 rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {isLoading && (
          <div className="h-48 shimmer" />
        )}
        {!isLoading && (
          <>
            {/* Hero artwork */}
            <div className="relative h-48 overflow-hidden">
              {live?.artwork || live?.image ? (
                <img src={live?.artwork || live?.image} alt="Live" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1e1f25, #2a2b32)' }}>
                  <span className="text-6xl">📡</span>
                </div>
              )}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.8))' }} />

              {/* LIVE badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: '#e53935', color: '#fff' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                LIVE
              </div>

              <div className="absolute bottom-0 left-0 p-4">
                <p className="font-display text-xl" style={{ color: '#fff' }}>{live?.title || 'On Air Now'}</p>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {live?.artist || live?.subtitle || '24Six Radio'}
                </p>
              </div>
            </div>

            <div className="px-5 py-4 flex items-center gap-3">
              {live?.isLive || live?.stream_url || live?.id ? (
                isLivePlaying ? (
                  <button
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-opacity hover:opacity-90"
                    style={{ background: '#e53935', color: '#fff' }}
                    onClick={stopLive}
                  >
                    <span>⏹</span> Stop
                  </button>
                ) : (
                  <button
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-opacity hover:opacity-90"
                    style={{ background: 'var(--accent)', color: '#0d0d0f' }}
                    onClick={playLive}
                  >
                    <span>▶</span> Listen Live
                  </button>
                )
              ) : (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {live?.stream_ended ? 'Stream has ended' : 'No live broadcast right now'}
                </p>
              )}

              {live?.listener_count != null && (
                <p className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>
                  {live.listener_count.toLocaleString()} listening
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Audio Replays */}
      <div className="px-6">
        <h2 className="font-display text-xl mb-4" style={{ color: 'var(--text)' }}>Audio Replays</h2>
        {loadingReplays && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-12 h-12 rounded-xl shimmer flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-3.5 shimmer rounded w-3/4 mb-2" />
                  <div className="h-3 shimmer rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loadingReplays && replayList.map((item, i) => {
          const art = getArtwork(item, 96)
          return (
            <div key={item.id || i}
              className="group flex items-center gap-3 py-2 px-2 rounded-xl cursor-pointer transition-colors hover:bg-card"
              onClick={() => {
                const { audioEl: el } = usePlayerStore.getState()
                const song = {
                  id: item.id,
                  title: item.title || item.name,
                  artist: { name: item.artist?.name || item.subtitle || '24Six' },
                  artwork: art,
                }
                usePlayerStore.getState().playSong(song)
              }}
            >
              {art
                ? <img src={art} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt="" />
                : <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'var(--card)' }}>📻</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.title || item.name}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {item.subtitle || item.artist?.name || '24Six Live'}
                  {item.duration && ` · ${Math.round(item.duration / 60)} min`}
                </p>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full flex items-center justify-center transition-opacity"
                style={{ background: 'var(--accent)', color: '#0d0d0f', fontSize: 12 }}
              >▶</button>
            </div>
          )
        })}
        {!loadingReplays && !replayList.length && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No replays available.</p>
        )}
      </div>
    </div>
  )
}
