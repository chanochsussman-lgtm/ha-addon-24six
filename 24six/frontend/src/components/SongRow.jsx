import React, { useState } from 'react'
import { usePlayerStore, useDownloadStore, useZoneStore } from '../store'
import { getArtwork, getSongTitle, getArtistName, formatDuration } from '../api'
import ContextMenu from './ContextMenu'

export default function SongRow({ song, index, queue, showIndex = false, showAlbum = false }) {
  const { currentSong, isPlaying, playSong, playQueue } = usePlayerStore()
  const { isDownloaded } = useDownloadStore()
  const { activeZoneId, getActiveZone, playToZone } = useZoneStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = currentSong?.id === song?.id
  const artwork = getArtwork(song, 48)
  // Prefer Hebrew title if available
  const title = song?.title_hebrew || getSongTitle(song)
  const artist = song?.subtitle_hebrew || getArtistName(song)
  const downloaded = isDownloaded(song?.id)

  const handlePlay = () => {
    const activeZone = getActiveZone()
    if (activeZone?.id === 'browser') {
      // Browser zone — use existing playerStore (handles audio element)
      if (queue) playQueue(queue, index ?? 0)
      else playSong(song)
    } else {
      // HA zone — send to that zone's entity
      playToZone(activeZone.id, song, queue || null, index ?? 0)
    }
  }

  return (
    <>
      <div
        className="group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-card"
        onDoubleClick={handlePlay}
      >
        {/* Index / play indicator */}
        <div className="w-6 text-center flex-shrink-0 relative">
          {isActive && isPlaying ? (
            <NowPlayingBars />
          ) : (
            <>
              {showIndex && (
                <span className="text-xs group-hover:hidden block" style={{ color: 'var(--muted)' }}>
                  {(index ?? 0) + 1}
                </span>
              )}
              <button
                className={`${showIndex ? 'hidden group-hover:block' : 'block'} text-xs`}
                style={{ color: 'var(--text-secondary)' }}
                onClick={handlePlay}
              >▶</button>
            </>
          )}
        </div>

        {/* Artwork */}
        {artwork && (
          <div className="relative flex-shrink-0">
            <img src={artwork} alt={title} className="w-10 h-10 rounded-md object-cover" />
            {downloaded && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent)', fontSize: 8 }}>↓</div>
            )}
          </div>
        )}

        {/* Title + artist */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: isActive ? 'var(--accent)' : 'var(--text)' }}>
            {title}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{artist}</p>
        </div>

        {/* Album */}
        {showAlbum && (
          <p className="text-xs hidden md:block w-32 truncate text-right" style={{ color: 'var(--muted)' }}>
            {song?.album?.title || song?.albumTitle || ''}
          </p>
        )}

        {/* Duration */}
        <span className="text-xs w-10 text-right tabular-nums" style={{ color: 'var(--muted)' }}>
          {formatDuration(song?.duration || song?.length)}
        </span>

        {/* Context menu button */}
        <button
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
          style={{ color: 'var(--muted)' }}
          onClick={e => { e.stopPropagation(); setMenuOpen(true) }}
        >⋯</button>
      </div>

      {menuOpen && <ContextMenu song={song} onClose={() => setMenuOpen(false)} />}
    </>
  )
}

function NowPlayingBars() {
  // Fixed heights — no Math.random() in render (causes flicker on every re-render)
  return (
    <div className="flex items-end justify-center gap-0.5 h-4">
      {[0.6, 1.0, 0.75].map((h, i) => (
        <div key={i} className="w-1 rounded-sm now-playing-bar"
          style={{
            background: 'var(--accent)',
            height: `${h * 100}%`,
            animationDelay: `${i * 0.15}s`,
          }} />
      ))}
    </div>
  )
}

const SKELETON_WIDTHS = [75, 55, 80, 60, 70, 50, 65, 72]

export function SongRowSkeleton({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <div className="w-6 flex-shrink-0" />
          <div className="w-10 h-10 rounded-md shimmer flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-3 rounded shimmer mb-1.5" style={{ width: `${SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]}%` }} />
            <div className="h-2.5 rounded shimmer" style={{ width: `${SKELETON_WIDTHS[(i + 3) % SKELETON_WIDTHS.length] * 0.6}%` }} />
          </div>
          <div className="w-8 h-2.5 rounded shimmer" />
        </div>
      ))}
    </>
  )
}
