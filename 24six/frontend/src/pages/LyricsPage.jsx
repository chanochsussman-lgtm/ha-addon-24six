import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { usePlayerStore } from '../store'
import { getSongTitle, getArtistName, getArtwork } from '../api'

export default function LyricsPage() {
  const { id } = useParams()
  const { currentSong, progress, isPlaying } = usePlayerStore()
  const activeSongId = id || currentSong?.id
  const [activeLine, setActiveLine] = useState(0)
  const lineRefs = useRef([])
  const containerRef = useRef(null)

  const { data, isLoading } = useQuery(
    ['lyrics', activeSongId],
    () => fetch(`/api/lyrics/${activeSongId}`).then(r => r.json()),
    { enabled: !!activeSongId }
  )

  const song = data?.song || currentSong
  const lyrics = data?.lyrics || ''
  const lyricsSync = data?.lyricsSync // JSON array of {time, line}
  const lines = lyricsSync
    ? lyricsSync
    : lyrics ? lyrics.split('\n').map((line, i) => ({ time: null, line })) : []

  // Auto-scroll synced lyrics
  useEffect(() => {
    if (!lyricsSync?.length) return
    const active = lyricsSync.reduce((acc, l, i) => l.time <= progress ? i : acc, 0)
    setActiveLine(active)
  }, [progress, lyricsSync])

  // Scroll active line into view
  useEffect(() => {
    const el = lineRefs.current[activeLine]
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeLine])

  const artwork = getArtwork(song, 80)

  return (
    <div className="pt-8 pb-24 fade-in" style={{ minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 mb-8">
        {artwork && (
          <img src={artwork} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
        )}
        <div>
          <h1 className="font-display text-2xl" style={{ color: 'var(--text)' }}>{getSongTitle(song)}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{getArtistName(song)}</p>
        </div>
      </div>

      {isLoading && (
        <div className="px-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-5 rounded shimmer mb-4" style={{ width: `${40 + Math.random() * 40}%` }} />
          ))}
        </div>
      )}

      {!isLoading && !lines.length && (
        <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>No lyrics available for this song.</p>
      )}

      {lines.length > 0 && (
        <div ref={containerRef} className="px-6">
          {lines.map((l, i) => {
            const isActive = lyricsSync ? i === activeLine : false
            const isPast = lyricsSync ? i < activeLine : false
            return (
              <p
                key={i}
                ref={el => lineRefs.current[i] = el}
                className="mb-3 leading-relaxed transition-all cursor-pointer"
                style={{
                  fontSize: isActive ? 22 : 18,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? 'var(--text)' : isPast ? 'var(--muted)' : 'var(--text-secondary)',
                  opacity: isPast ? 0.5 : 1,
                  fontFamily: "'DM Serif Display', serif",
                  transitionDuration: '0.3s',
                }}
                onClick={() => lyricsSync && usePlayerStore.getState().setProgress(l.time)}
              >
                {l.line || <br />}
              </p>
            )
          })}
          {data?.lyricsAttribution && (
            <p className="text-xs mt-8" style={{ color: 'var(--muted)' }}>{data.lyricsAttribution}</p>
          )}
        </div>
      )}
    </div>
  )
}
