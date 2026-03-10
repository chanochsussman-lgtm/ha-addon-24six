import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { api, getArtwork } from '../api'
import SongRow from '../components/SongRow'
import { usePlayerStore } from '../store'

export default function PlaylistPage() {
  const { id } = useParams()
  const { playQueue } = usePlayerStore()

  const { data: playlist } = useQuery(['playlist', id], () => api.playlist(id))
  const { data: songsData } = useQuery(['playlistSongs', id], () => api.playlistSongs(id))
  const songs = songsData?.songs || songsData?.data || songsData || []
  const artwork = getArtwork(playlist, 400)

  return (
    <div className="fade-in">
      <div className="flex gap-6 px-6 pt-8 pb-6 flex-wrap">
        <div className="w-44 h-44 rounded-2xl overflow-hidden flex-shrink-0" style={{ background: 'var(--card)' }}>
          {artwork && <img src={artwork} alt={playlist?.title} className="w-full h-full object-cover" />}
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>PLAYLIST</p>
          <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text)' }}>{playlist?.title || playlist?.name || '…'}</h1>
          {playlist?.description && (
            <p className="text-sm mb-2 truncate-2" style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>
              {playlist.description}
            </p>
          )}
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>{songs.length} songs</p>
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent)', color: '#0d0d0f' }}
            onClick={() => songs.length && playQueue(songs, 0)}
          >▶</button>
        </div>
      </div>
      <div className="px-2">
        {songs.map((song, i) => (
          <SongRow key={song.id || i} song={song} index={i} queue={songs} showIndex showAlbum />
        ))}
      </div>
    </div>
  )
}
