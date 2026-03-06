import React from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../store'
import { getArtwork, getSongTitle, getArtistName } from '../api'

// ── AlbumCard ─────────────────────────────────────────────────────────────────
export function AlbumCard({ item, size = 'md' }) {
  const navigate = useNavigate()
  const { playQueue } = usePlayerStore()
  const artwork = getArtwork(item, size === 'lg' ? 400 : 200)
  const dim = size === 'lg' ? 'w-44 h-44' : size === 'sm' ? 'w-28 h-28' : 'w-36 h-36'

  return (
    <div
      className="flex-shrink-0 cursor-pointer group"
      onClick={() => navigate(`/album/${item.id}`)}
    >
      <div className={`${dim} rounded-xl overflow-hidden relative mb-2`} style={{ background: 'var(--card)' }}>
        {artwork
          ? <img src={artwork} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center text-3xl">🎵</div>
        }
        <button
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-lg"
          style={{ background: 'var(--accent)', color: '#0d0d0f' }}
          onClick={async e => {
            e.stopPropagation()
            const r = await fetch(`/api/albums/${item.id}/songs`)
            const d = await r.json()
            const songs = d.songs || d.data || d
            if (songs.length) playQueue(songs, 0)
          }}
        >
          ▶
        </button>
      </div>
      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', maxWidth: size === 'lg' ? 176 : size === 'sm' ? 112 : 144 }}>
        {item.title || item.name}
      </p>
      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)', maxWidth: size === 'lg' ? 176 : size === 'sm' ? 112 : 144 }}>
        {getArtistName(item)}
      </p>
    </div>
  )
}

// ── ArtistCard ────────────────────────────────────────────────────────────────
export function ArtistCard({ item }) {
  const navigate = useNavigate()
  const artwork = getArtwork(item, 200)

  return (
    <div
      className="flex-shrink-0 cursor-pointer text-center group"
      style={{ width: 120 }}
      onClick={() => navigate(`/artist/${item.id}`)}
    >
      <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-2" style={{ background: 'var(--card)' }}>
        {artwork
          ? <img src={artwork} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
        }
      </div>
      <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>
        {item.name || item.title}
      </p>
    </div>
  )
}

// ── PlaylistCard ──────────────────────────────────────────────────────────────
export function PlaylistCard({ item }) {
  const navigate = useNavigate()
  const { playQueue } = usePlayerStore()
  const artwork = getArtwork(item, 200)

  return (
    <div
      className="flex-shrink-0 cursor-pointer group"
      style={{ width: 144 }}
      onClick={() => navigate(`/playlist/${item.id}`)}
    >
      <div className="w-36 h-36 rounded-xl overflow-hidden relative mb-2" style={{ background: 'var(--card)' }}>
        {artwork
          ? <img src={artwork} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center text-3xl">📋</div>
        }
        <button
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-lg"
          style={{ background: 'var(--accent)', color: '#0d0d0f' }}
          onClick={async e => {
            e.stopPropagation()
            const r = await fetch(`/api/playlists/${item.id}/songs`)
            const d = await r.json()
            const songs = d.songs || d.data || d
            if (songs.length) playQueue(songs, 0)
          }}
        >
          ▶
        </button>
      </div>
      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)', maxWidth: 144 }}>
        {item.title || item.name}
      </p>
      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)', maxWidth: 144 }}>
        {item.songCount ? `${item.songCount} songs` : ''}
      </p>
    </div>
  )
}

// ── SongCard (for grid displays) ─────────────────────────────────────────────
export function SongCard({ item, queue, index }) {
  const { playSong, playQueue } = usePlayerStore()
  const artwork = getArtwork(item, 200)

  const handlePlay = () => {
    if (queue) playQueue(queue, index ?? 0)
    else playSong(item)
  }

  return (
    <div
      className="cursor-pointer group p-3 rounded-xl transition-colors hover:bg-card"
      onClick={handlePlay}
    >
      <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 relative" style={{ background: 'var(--border)' }}>
        {artwork
          ? <img src={artwork} alt={getSongTitle(item)} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-3xl">🎵</div>
        }
      </div>
      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{getSongTitle(item)}</p>
      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{getArtistName(item)}</p>
    </div>
  )
}

// ── Section Row (horizontal scroll) ─────────────────────────────────────────
export function SectionRow({ title, children, onMore }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between px-6 mb-3">
        <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>{title}</h2>
        {onMore && (
          <button className="text-xs font-medium transition-colors hover:opacity-80" style={{ color: 'var(--accent)' }} onClick={onMore}>
            See all
          </button>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
        {children}
      </div>
    </div>
  )
}

// ── Loading skeleton ─────────────────────────────────────────────────────────
export function CardSkeleton({ count = 6, size = 144 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0" style={{ width: size }}>
          <div className="rounded-xl shimmer mb-2" style={{ width: size, height: size }} />
          <div className="rounded shimmer h-3 mb-1" style={{ width: size * 0.8 }} />
          <div className="rounded shimmer h-3" style={{ width: size * 0.5 }} />
        </div>
      ))}
    </>
  )
}
