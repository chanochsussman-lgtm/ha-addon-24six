import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { api, getArtwork } from '../api'
import SongRow from '../components/SongRow'
import { usePlayerStore } from '../store'

export default function AlbumPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { playQueue } = usePlayerStore()

  const { data: album } = useQuery(['album', id], () => api.album(id))
  const { data: songsData } = useQuery(['albumSongs', id], () => api.albumSongs(id))
  const songs = songsData?.songs || songsData?.data || songsData || []
  const artwork = getArtwork(album, 400)

  return (
    <div className="fade-in">
      <div className="flex gap-6 px-6 pt-8 pb-6 flex-wrap">
        <div className="w-44 h-44 rounded-2xl overflow-hidden flex-shrink-0" style={{ background: 'var(--card)' }}>
          {artwork && <img src={artwork} alt={album?.title} className="w-full h-full object-cover" />}
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>ALBUM</p>
          <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text)' }}>{album?.title || '…'}</h1>
          <p
            className="text-sm cursor-pointer hover:underline mb-2"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => album?.artist?.id && navigate(`/artist/${album.artist.id}`)}
          >
            {album?.artist?.name || album?.artistName || ''}
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
            {album?.year && `${album.year} · `}{songs.length} songs
          </p>
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent)', color: '#0d0d0f' }}
            onClick={() => songs.length && playQueue(songs, 0)}
          >▶</button>
        </div>
      </div>
      <div className="px-2">
        {songs.map((song, i) => (
          <SongRow key={song.id || i} song={song} index={i} queue={songs} showIndex />
        ))}
      </div>
    </div>
  )
}
