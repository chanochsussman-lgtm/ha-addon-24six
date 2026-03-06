import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { AlbumCard, ArtistCard } from '../components/Cards'
import SongRow, { SongRowSkeleton } from '../components/SongRow'

const TABS = ['All', 'Songs', 'Albums', 'Artists', 'Playlists', 'Podcasts']
const RECENT_KEY = '24six_recent_searches'

function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

function getRecentSearches() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function saveRecentSearch(q) {
  try {
    const prev = getRecentSearches().filter(s => s !== q)
    localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 8)))
  } catch {}
}
function clearRecentSearches() {
  try { localStorage.removeItem(RECENT_KEY) } catch {}
}

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('All')
  const [recentSearches, setRecentSearches] = useState(getRecentSearches)
  const navigate = useNavigate()

  const doSearch = useCallback(debounce(async (q) => {
    if (!q.trim()) { setResults(null); return }
    setLoading(true)
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    const d = await r.json()
    setResults(d)
    setLoading(false)
    saveRecentSearch(q.trim())
    setRecentSearches(getRecentSearches())
  }, 400), [])

  const handleChange = (e) => {
    setQuery(e.target.value)
    doSearch(e.target.value)
  }

  const handleSelectSearch = (q) => {
    setQuery(q)
    doSearch.cancel?.()
    doSearch(q)
  }

  const songs = results?.songs || results?.tracks || []
  const albums = results?.albums || []
  const artists = results?.artists || []
  const playlists = results?.playlists || []
  const podcasts = results?.podcasts || []

  return (
    <div className="pt-8 pb-6 fade-in">
      {/* Search input */}
      <div className="px-6 mb-6">
        <h1 className="font-display text-3xl mb-4" style={{ color: 'var(--text)' }}>Search</h1>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Songs, artists, albums…"
            value={query}
            onChange={handleChange}
            autoFocus
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {query && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--muted)' }}
              onClick={() => { setQuery(''); setResults(null) }}
            >✕</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {results && (
        <div className="flex gap-2 px-6 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                background: tab === t ? 'var(--accent)' : 'var(--card)',
                color: tab === t ? '#0d0d0f' : 'var(--text-secondary)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="px-6">
          <SongRowSkeleton count={5} />
        </div>
      )}
      {results && !loading && (
        <div>
          {/* Songs */}
          {(tab === 'All' || tab === 'Songs') && songs.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold px-6 mb-3" style={{ color: 'var(--text)' }}>Songs</h2>
              {songs.slice(0, tab === 'All' ? 5 : 50).map((song, i) => (
                <SongRow key={song.id || i} song={song} index={i} queue={songs} showIndex />
              ))}
            </div>
          )}

          {/* Albums */}
          {(tab === 'All' || tab === 'Albums') && albums.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold px-6 mb-3" style={{ color: 'var(--text)' }}>Albums</h2>
              <div className="flex gap-4 overflow-x-auto px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
                {albums.slice(0, tab === 'All' ? 8 : 50).map((item, i) => (
                  <AlbumCard key={item.id || i} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Artists */}
          {(tab === 'All' || tab === 'Artists') && artists.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold px-6 mb-3" style={{ color: 'var(--text)' }}>Artists</h2>
              <div className="flex gap-4 overflow-x-auto px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
                {artists.slice(0, tab === 'All' ? 8 : 50).map((item, i) => (
                  <ArtistCard key={item.id || i} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Playlists */}
          {(tab === 'All' || tab === 'Playlists') && playlists.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold px-6 mb-3" style={{ color: 'var(--text)' }}>Playlists</h2>
              <div className="flex gap-4 overflow-x-auto px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
                {playlists.slice(0, tab === 'All' ? 8 : 50).map((item, i) => (
                  <div key={item.id || i} className="cursor-pointer" onClick={() => navigate(`/playlist/${item.id}`)}>
                    <div className="w-36 h-36 rounded-xl mb-2 overflow-hidden" style={{ background: 'var(--card)' }}>
                      {item.artwork && <img src={item.artwork} alt={item.title} className="w-full h-full object-cover" />}
                    </div>
                    <p className="text-sm truncate" style={{ color: 'var(--text)', maxWidth: 144 }}>{item.title || item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Podcasts */}
          {(tab === 'All' || tab === 'Podcasts') && podcasts.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold px-6 mb-3" style={{ color: 'var(--text)' }}>Podcasts</h2>
              <div className="flex gap-4 overflow-x-auto px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
                {podcasts.slice(0, tab === 'All' ? 8 : 50).map((item, i) => (
                  <div key={item.id || i} className="flex-shrink-0 w-36 cursor-pointer" onClick={() => navigate(`/podcast/${item.id}`)}>
                    <div className="w-36 h-36 rounded-xl mb-2 overflow-hidden" style={{ background: 'var(--card)' }}>
                      {item.artwork || item.image
                        ? <img src={item.artwork || item.image} alt={item.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-3xl">🎙️</div>
                      }
                    </div>
                    <p className="text-sm truncate font-medium" style={{ color: 'var(--text)', maxWidth: 144 }}>{item.title || item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!songs.length && !albums.length && !artists.length && !playlists.length && !podcasts.length && (
            <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>No results for "{query}"</p>
          )}
        </div>
      )}

      {/* No query: show recent searches + trending + browse */}
      {!query && (
        <>
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="px-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Recent</h2>
                <button className="text-xs" style={{ color: 'var(--muted)' }}
                  onClick={() => { clearRecentSearches(); setRecentSearches([]) }}>Clear</button>
              </div>
              <div className="flex flex-col gap-0.5">
                {recentSearches.map((s, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-3 py-2 px-3 rounded-xl text-left transition-colors hover:bg-card w-full"
                    onClick={() => handleSelectSearch(s)}
                  >
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>🕐</span>
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending songs */}
          <TrendingSongs onSearch={handleSelectSearch} />

          {/* Browse categories */}
          <BrowseCategories />
        </>
      )}
    </div>
  )
}

function TrendingSongs() {
  const { data, isLoading } = useQuery('trendingSearch', () =>
    fetch('/api/browse/section/trendingSongs?limit=10').then(r => r.json())
  )
  const songs = data?.data || data?.songs || data?.items || data || []

  if (!isLoading && !songs.length) return null

  return (
    <div className="mb-6">
      <h2 className="font-semibold px-6 mb-3 text-sm" style={{ color: 'var(--text)' }}>Trending</h2>
      {isLoading && <SongRowSkeleton count={5} />}
      {!isLoading && songs.slice(0, 8).map((song, i) => (
        <SongRow key={song.id || i} song={song} index={i} queue={songs} showIndex />
      ))}
    </div>
  )
}

function BrowseCategories() {
  const [cats, setCats] = React.useState([])
  const navigate = useNavigate()

  React.useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => {
      setCats(d.categories || d.data || d || [])
    }).catch(() => {})
  }, [])

  if (!cats.length) return null

  return (
    <div className="px-6">
      <h2 className="font-semibold mb-4 text-sm" style={{ color: 'var(--text)' }}>Browse</h2>
      <div className="grid grid-cols-2 gap-3">
        {cats.slice(0, 12).map((cat, i) => (
          <div
            key={cat.id || i}
            className="rounded-xl p-4 cursor-pointer transition-opacity hover:opacity-80 overflow-hidden relative"
            style={{
              background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
              minHeight: 72,
            }}
            onClick={() => navigate(`/category/${cat.id}`)}
          >
            <p className="font-semibold text-sm" style={{ color: '#fff' }}>{cat.name || cat.title}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const CATEGORY_COLORS = [
  '#1a5f4a', '#5c3317', '#2d4a7a', '#6b2d5e',
  '#4a3a1a', '#1a4a4a', '#5a2d2d', '#2d5a2d',
]
