import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { api, getArtwork } from '../api'
import { AlbumCard } from '../components/Cards'
import SongRow from '../components/SongRow'
import { usePlayerStore } from '../store'

export default function ArtistPage() {
  const { id } = useParams()
  const [tab, setTab] = useState('Songs')
  const [following, setFollowing] = useState(null) // null = unknown, true/false = known
  const [followLoading, setFollowLoading] = useState(false)
  const { playQueue } = usePlayerStore()

  const { data: artist } = useQuery(['artist', id], () => api.artist(id), {
    onSuccess: (d) => {
      // Initialise follow state from API response if provided
      if (d?.isFollowing !== undefined && following === null) {
        setFollowing(d.isFollowing)
      }
    }
  })
  const { data: songsData } = useQuery(['artistSongs', id], () => api.artistSongs(id))
  const { data: albumsData } = useQuery(['artistAlbums', id], () => api.artistAlbums(id))

  const songs = songsData?.songs || songsData?.data || songsData || []
  const albums = albumsData?.albums || albumsData?.data || albumsData || []
  const artwork = getArtwork(artist, 400)

  const handleFollow = async () => {
    setFollowLoading(true)
    const method = following ? 'DELETE' : 'POST'
    try {
      await fetch(`/api/artists/${id}/follow`, { method })
      setFollowing(f => !f)
    } catch {}
    setFollowLoading(false)
  }

  return (
    <div className="fade-in">
      {/* Hero */}
      <div className="relative h-64 overflow-hidden">
        {artwork
          ? <img src={artwork} alt={artist?.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full" style={{ background: 'var(--card)' }} />
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, var(--bg))' }} />
        <div className="absolute bottom-0 left-0 p-6">
          <h1 className="font-display text-4xl" style={{ color: 'var(--text)' }}>{artist?.name || '…'}</h1>
          {artist?.songCount && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{artist.songCount} songs</p>
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
        <button
          disabled={followLoading}
          className="px-4 py-2 rounded-full text-sm font-medium border transition-all hover:opacity-90"
          style={{
            background: following ? 'rgba(200,168,75,0.15)' : 'transparent',
            borderColor: following ? 'var(--accent)' : 'var(--border)',
            color: following ? 'var(--accent)' : 'var(--text-secondary)',
            opacity: followLoading ? 0.6 : 1,
          }}
          onClick={handleFollow}
        >
          {following ? '✓ Following' : '+ Follow'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 mb-4">
        {['Songs', 'Albums'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-full text-sm font-medium"
            style={{ background: tab === t ? 'var(--accent)' : 'var(--card)', color: tab === t ? '#0d0d0f' : 'var(--text-secondary)' }}
          >{t}</button>
        ))}
      </div>

      {tab === 'Songs' && songs.map((song, i) => (
        <SongRow key={song.id || i} song={song} index={i} queue={songs} showIndex />
      ))}

      {tab === 'Albums' && (
        <div className="flex flex-wrap gap-4 px-6 pb-6">
          {albums.map((a, i) => <AlbumCard key={a.id || i} item={a} />)}
        </div>
      )}
    </div>
  )
}
