import React from 'react'
import { usePlayerStore } from '../store'
import { useQuery } from 'react-query'
import { api } from '../api'
import SongRow from '../components/SongRow'
import { AlbumCard } from '../components/Cards'
import { useParams } from 'react-router-dom'

// ── Queue ────────────────────────────────────────────────────────────────────
export function Queue() {
  const { currentSong, queue, queueIndex } = usePlayerStore()

  return (
    <div className="pt-8 pb-6 px-4 fade-in">
      <h1 className="font-display text-3xl px-2 mb-6" style={{ color: 'var(--text)' }}>Queue</h1>

      {currentSong && (
        <div className="mb-6">
          <p className="text-xs font-medium px-3 mb-2" style={{ color: 'var(--accent)' }}>NOW PLAYING</p>
          <SongRow song={currentSong} />
        </div>
      )}

      {queue.length > 0 && (
        <div>
          <p className="text-xs font-medium px-3 mb-2" style={{ color: 'var(--muted)' }}>
            NEXT UP · {queue.length - queueIndex - 1} songs
          </p>
          {queue.slice(queueIndex + 1).map((song, i) => (
            <SongRow key={song.id || i} song={song} index={queueIndex + 1 + i} queue={queue} showIndex />
          ))}
        </div>
      )}

      {!currentSong && !queue.length && (
        <p className="px-3 text-sm" style={{ color: 'var(--muted)' }}>Queue is empty. Play some music!</p>
      )}
    </div>
  )
}

// ── Recently Played ──────────────────────────────────────────────────────────
export function RecentlyPlayed() {
  const { data, isLoading } = useQuery('recent', api.recent)
  const items = data?.data || data?.songs || data || []

  return (
    <div className="pt-8 pb-6 fade-in">
      <h1 className="font-display text-3xl px-6 mb-6" style={{ color: 'var(--text)' }}>Recently Played</h1>
      {isLoading && <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>}
      {items.map((item, i) => (
        <SongRow key={item.id || i} song={item} index={i} queue={items} showIndex />
      ))}
      {!isLoading && !items.length && (
        <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>Nothing played yet.</p>
      )}
    </div>
  )
}

// ── Favorites ─────────────────────────────────────────────────────────────────
export function Favorites() {
  const { data, isLoading } = useQuery('favorites', api.favorites)
  const items = data?.songs || data?.data || data || []

  return (
    <div className="pt-8 pb-6 fade-in">
      <h1 className="font-display text-3xl px-6 mb-6" style={{ color: 'var(--text)' }}>Favorites</h1>
      {isLoading && <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>}
      {items.map((item, i) => (
        <SongRow key={item.id || i} song={item} index={i} queue={items} showIndex />
      ))}
      {!isLoading && !items.length && (
        <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>No favorites yet.</p>
      )}
    </div>
  )
}

// ── Category Page ─────────────────────────────────────────────────────────────
export function CategoryPage() {
  const { id } = useParams()
  const { data, isLoading } = useQuery(['category', id], () => api.category(id))
  const cat = data?.category || data
  const items = data?.albums || data?.songs || data?.data || []

  return (
    <div className="pt-8 pb-6 fade-in">
      <h1 className="font-display text-3xl px-6 mb-6" style={{ color: 'var(--text)' }}>
        {cat?.name || cat?.title || 'Category'}
      </h1>
      {isLoading && <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 px-6">
        {items.map((item, i) => (
          <AlbumCard key={item.id || i} item={item} />
        ))}
      </div>
    </div>
  )
}

export default Queue
