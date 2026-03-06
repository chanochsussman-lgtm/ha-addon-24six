import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { getArtwork } from '../api'
import SongRow, { SongRowSkeleton } from '../components/SongRow'
import { usePlayerStore } from '../store'

export default function CollectionPage() {
  const { id } = useParams()
  const { playQueue } = usePlayerStore()

  const { data, isLoading } = useQuery(['collection', id], () =>
    fetch(`/api/collections/${id}`).then(r => r.json())
  )
  const { data: songsData, isLoading: loadingSongs } = useQuery(['collectionSongs', id], () =>
    fetch(`/api/collections/${id}/songs`).then(r => r.json())
  )

  const collection = data?.collection || data
  const songs = songsData?.data || songsData?.songs || songsData || []
  const artwork = getArtwork(collection, 400)

  return (
    <div className="fade-in">
      {/* Hero */}
      <div className="relative h-56 overflow-hidden">
        {artwork
          ? <img src={artwork} alt={collection?.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-5xl"
              style={{ background: 'linear-gradient(135deg, #1e1f25, #2a2b32)' }}>🎵</div>
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, var(--bg))' }} />
        <div className="absolute bottom-0 left-0 p-6">
          <p className="text-xs uppercase tracking-widest mb-1 font-semibold" style={{ color: 'var(--accent)' }}>
            {collection?.type || 'Collection'}
          </p>
          <h1 className="font-display text-3xl" style={{ color: 'var(--text)' }}>
            {isLoading ? '…' : collection?.title || collection?.name}
          </h1>
          {collection?.description && (
            <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
              {collection.description}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 flex items-center gap-3">
        <button
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105"
          style={{ background: 'var(--accent)', color: '#0d0d0f' }}
          onClick={() => songs.length && playQueue(songs, 0)}
        >
          <span className="text-xl">▶</span>
        </button>
        <button
          className="px-4 py-2 rounded-full text-sm border transition-colors hover:bg-card"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          onClick={() => usePlayerStore.getState().addToQueue(songs)}
        >
          Add to Queue
        </button>
        {songs.length > 0 && (
          <span className="text-sm ml-auto" style={{ color: 'var(--muted)' }}>
            {songs.length} songs
          </span>
        )}
      </div>

      {/* Songs */}
      {loadingSongs && <SongRowSkeleton count={10} />}
      {!loadingSongs && songs.map((song, i) => (
        <SongRow key={song.id || i} song={song} index={i} queue={songs} showIndex />
      ))}
      {!loadingSongs && !songs.length && (
        <p className="px-6 text-sm py-4" style={{ color: 'var(--muted)' }}>No songs in this collection.</p>
      )}
    </div>
  )
}
