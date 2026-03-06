import React from 'react'
import { useQuery } from 'react-query'
import { api, getArtwork } from '../api'
import { usePlayerStore } from '../store'
import SongRow from '../components/SongRow'

export default function RewindPage() {
  const { data, isLoading } = useQuery('rewind', api.rewind)
  const { playQueue } = usePlayerStore()

  if (isLoading) return (
    <div className="pt-8 pb-6 px-6 fade-in">
      <div className="h-8 w-48 shimmer rounded mb-6" />
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 shimmer rounded-2xl mb-4" />)}
    </div>
  )

  const year = data?.year || new Date().getFullYear()
  const stats = data?.stats || {}
  const topSongs = data?.topSongs || []
  const topArtists = data?.topArtists || []
  const topAlbums = data?.topAlbums || []
  const monthlyHighlights = data?.monthlyHighlights || []
  const totalMinutes = stats.totalMinutes || 0
  const totalSongs = stats.totalSongs || 0

  return (
    <div className="pt-8 pb-6 fade-in">
      {/* Hero */}
      <div className="px-6 mb-8 text-center py-8 mx-6 rounded-3xl"
        style={{ background: 'linear-gradient(135deg, rgba(200,168,75,0.2), rgba(200,168,75,0.05))', border: '1px solid var(--border)' }}>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--accent)' }}>YOUR YEAR IN MUSIC</p>
        <h1 className="font-display text-5xl mb-3" style={{ color: 'var(--text)' }}>{year} Rewind</h1>
        <div className="flex justify-center gap-8 mt-4">
          <div><p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{totalMinutes.toLocaleString()}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>minutes listened</p></div>
          <div><p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{totalSongs.toLocaleString()}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>songs played</p></div>
        </div>
      </div>

      {/* Top Songs */}
      {topSongs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between px-6 mb-3">
            <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Your Top Songs</h2>
            {topSongs.length > 1 && (
              <button className="text-xs" style={{ color: 'var(--accent)' }}
                onClick={() => playQueue(topSongs)}>Play All</button>
            )}
          </div>
          {topSongs.slice(0, 10).map((song, i) => <SongRow key={song.id || i} song={song} index={i} queue={topSongs} showIndex />)}
        </div>
      )}

      {/* Top Artists */}
      {topArtists.length > 0 && (
        <div className="mb-8 px-6">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>Your Top Artists</h2>
          <div className="flex flex-wrap gap-3">
            {topArtists.slice(0, 10).map((a, i) => {
              const art = getArtwork(a, 80)
              return (
                <div key={a.id || i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  {art && <img src={art} className="w-8 h-8 rounded-full object-cover" alt={a.name} />}
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{a.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Monthly Highlights */}
      {monthlyHighlights.length > 0 && (
        <div className="mb-8 px-6">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>Monthly Highlights</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {monthlyHighlights.map((m, i) => (
              <div key={i} className="p-4 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--accent)' }}>{m.month}</p>
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{m.topSong?.title || m.topSong?.name || '—'}</p>
                <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{m.plays ? `${m.plays} plays` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!topSongs.length && !topArtists.length && (
        <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>No rewind data available yet. Keep listening!</p>
      )}
    </div>
  )
}
