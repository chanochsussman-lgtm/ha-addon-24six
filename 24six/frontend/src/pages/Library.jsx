import React, { useState, useMemo } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { AlbumCard, ArtistCard, CardSkeleton } from '../components/Cards'
import SongRow, { SongRowSkeleton } from '../components/SongRow'
import { usePlayerStore } from '../store'

const TABS = ['Songs', 'Albums', 'Artists', 'Playlists', 'Downloaded']

const SORT_SONGS = [
  { value: 'recently_added', label: 'Recently Added' },
  { value: 'a_z', label: 'A–Z' },
  { value: 'artist', label: 'Artist' },
]
const SORT_ALBUMS = [
  { value: 'recently_added', label: 'Recently Added' },
  { value: 'a_z', label: 'A–Z' },
  { value: 'artist', label: 'Artist' },
  { value: 'release_date', label: 'Release Date' },
]
const SORT_ARTISTS = [
  { value: 'a_z', label: 'A–Z' },
  { value: 'recently_added', label: 'Recently Added' },
]

function sortItems(items, sortBy) {
  const arr = [...items]
  if (sortBy === 'a_z') return arr.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''))
  if (sortBy === 'artist') return arr.sort((a, b) => (a.artist?.name || a.artistName || '').localeCompare(b.artist?.name || b.artistName || ''))
  if (sortBy === 'release_date') return arr.sort((a, b) => (b.year || 0) - (a.year || 0))
  return arr // recently_added: keep server order
}

export default function Library({ tab: initialTab = 'Songs' }) {
  const [tab, setTab] = useState(initialTab)
  const [sortSongs, setSortSongs] = useState('recently_added')
  const [sortAlbums, setSortAlbums] = useState('recently_added')
  const [sortArtists, setSortArtists] = useState('a_z')
  const { playQueue, audioEl } = usePlayerStore()
  const navigate = useNavigate()

  const { data: songs, isLoading: loadingSongs } = useQuery('librarySongs', api.librarySongs, { enabled: tab === 'Songs' })
  const { data: albums, isLoading: loadingAlbums } = useQuery('libraryAlbums', api.libraryAlbums, { enabled: tab === 'Albums' })
  const { data: artists, isLoading: loadingArtists } = useQuery('libraryArtists', api.libraryArtists, { enabled: tab === 'Artists' })
  const { data: playlists, isLoading: loadingPlaylists } = useQuery('myPlaylists', api.playlists, { enabled: tab === 'Playlists' })
  const { data: downloads, isLoading: loadingDownloads } = useQuery('downloads', api.downloads, { enabled: tab === 'Downloaded' })

  const songList   = useMemo(() => sortItems(songs?.songs   || songs?.data   || songs   || [], sortSongs),   [songs,   sortSongs])
  const albumList  = useMemo(() => sortItems(albums?.albums  || albums?.data  || albums  || [], sortAlbums),  [albums,  sortAlbums])
  const artistList = useMemo(() => sortItems(artists?.artists || artists?.data || artists || [], sortArtists), [artists, sortArtists])
  const playlistList = playlists?.playlists || playlists?.data || playlists || []
  const downloadList = (downloads || []).filter(d => d.status === 'completed')

  return (
    <div className="pt-8 pb-6 fade-in">
      <div className="px-6 mb-5 flex items-center justify-between">
        <h1 className="font-display text-3xl" style={{ color: 'var(--text)' }}>Library</h1>
        {tab === 'Songs'   && <SortPicker value={sortSongs}   options={SORT_SONGS}   onChange={setSortSongs} />}
        {tab === 'Albums'  && <SortPicker value={sortAlbums}  options={SORT_ALBUMS}  onChange={setSortAlbums} />}
        {tab === 'Artists' && <SortPicker value={sortArtists} options={SORT_ARTISTS} onChange={setSortArtists} />}
      </div>

      {/* Tab pills */}
      <div className="flex gap-2 px-6 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={{ background: tab === t ? 'var(--accent)' : 'var(--card)', color: tab === t ? '#0d0d0f' : 'var(--text-secondary)' }}
          >{t}</button>
        ))}
      </div>

      {/* ── Songs ────────────────────────────────────────────────────────────── */}
      {tab === 'Songs' && (
        <div>
          {!loadingSongs && songList.length > 0 && (
            <div className="flex items-center gap-3 px-6 mb-3">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                style={{ background: 'var(--accent)', color: '#0d0d0f' }}
                onClick={() => playQueue(songList, 0)}
              >▶ Play All</button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                onClick={() => playQueue([...songList].sort(() => Math.random() - 0.5), 0)}
              >⇌ Shuffle</button>
              <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>{songList.length} songs</span>
            </div>
          )}
          {loadingSongs && <SongRowSkeleton count={8} />}
          {!loadingSongs && songList.map((song, i) => (
            <SongRow key={song.id || i} song={song} index={i} queue={songList} showIndex />
          ))}
          {!loadingSongs && !songList.length && (
            <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>No saved songs yet.</p>
          )}
        </div>
      )}

      {/* ── Albums ───────────────────────────────────────────────────────────── */}
      {tab === 'Albums' && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 px-6">
          {loadingAlbums && Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
          {!loadingAlbums && albumList.map((item, i) => <AlbumCard key={item.id || i} item={item} />)}
          {!loadingAlbums && !albumList.length && (
            <p className="text-sm col-span-full" style={{ color: 'var(--muted)' }}>No saved albums yet.</p>
          )}
        </div>
      )}

      {/* ── Artists ──────────────────────────────────────────────────────────── */}
      {tab === 'Artists' && (
        <div className="flex flex-wrap gap-6 px-6">
          {loadingArtists && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2" style={{ width: 120 }}>
              <div className="w-24 h-24 rounded-full shimmer" />
              <div className="h-3 rounded shimmer w-16" />
            </div>
          ))}
          {!loadingArtists && artistList.map((item, i) => <ArtistCard key={item.id || i} item={item} />)}
          {!loadingArtists && !artistList.length && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No saved artists yet.</p>
          )}
        </div>
      )}

      {/* ── Playlists ────────────────────────────────────────────────────────── */}
      {tab === 'Playlists' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6">
          {loadingPlaylists && Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          {!loadingPlaylists && playlistList.map((item, i) => (
            <div key={item.id || i} className="cursor-pointer group" onClick={() => navigate(`/playlist/${item.id}`)}>
              <div className="w-full aspect-square rounded-2xl overflow-hidden mb-2 flex items-center justify-center text-3xl"
                style={{ background: 'var(--card)' }}>
                {item.artwork
                  ? <img src={item.artwork} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  : '🎵'}
              </div>
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.title || item.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{item.songCount != null ? `${item.songCount} songs` : ''}</p>
            </div>
          ))}
          {!loadingPlaylists && !playlistList.length && (
            <p className="text-sm col-span-full" style={{ color: 'var(--muted)' }}>No playlists yet. Create one from any song's menu.</p>
          )}
        </div>
      )}

      {/* ── Downloaded ───────────────────────────────────────────────────────── */}
      {tab === 'Downloaded' && (
        <div>
          {!loadingDownloads && downloadList.length > 0 && (
            <p className="px-6 mb-3 text-xs" style={{ color: 'var(--muted)' }}>{downloadList.length} songs downloaded</p>
          )}
          {loadingDownloads && <SongRowSkeleton count={6} />}
          {!loadingDownloads && downloadList.map((dl, i) => (
            <div key={dl.id || i}
              className="flex items-center gap-3 px-6 py-2.5 rounded-xl mx-2 cursor-pointer transition-colors hover:bg-card"
              onClick={() => {
                const el = usePlayerStore.getState().audioEl
                if (!el) return
                el.src = `/api/downloads/${dl.contentId}/play`
                el.play().catch(() => {})
                usePlayerStore.setState({
                  currentSong: { id: dl.contentId, title: dl.title, artist: { name: dl.artist }, artwork: dl.artwork },
                  isPlaying: true,
                })
              }}
            >
              {dl.artwork
                ? <img src={dl.artwork} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
                : <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg" style={{ background: 'var(--card)' }}>🎵</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{dl.title || 'Unknown'}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{dl.artist || ''}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(200,168,75,0.15)', color: 'var(--accent)' }}>↓</span>
            </div>
          ))}
          {!loadingDownloads && !downloadList.length && (
            <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>No downloaded songs yet. Download songs for offline playback.</p>
          )}
        </div>
      )}
    </div>
  )
}

function SortPicker({ value, options, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs" style={{ color: 'var(--muted)' }}>Sort:</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="text-xs rounded-lg px-2 py-1 outline-none"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
