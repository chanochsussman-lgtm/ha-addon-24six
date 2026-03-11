import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { usePlayer } from '../store/index.jsx'
import ContextMenu from '../components/ContextMenu'

const TABS = ['Top', 'Songs', 'Artists', 'Albums', 'Playlists']

function Spinner() {
  return <div style={{ width: 20, height: 20, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
}

function SongRow({ song, queue, queueIndex, isActive }) {
  const { playTrack } = usePlayer()
  const [menu, setMenu] = useState(false)
  const holdTimer = useRef(null)
  const nav = useNavigate()

  const toTrack = s => ({
    id: s.id,
    title: s.title || s.name,
    artist: s.artists?.map(a => a.name).join(', ') || s.subtitle || '',
    img: s.img
  })

  const onPointerDown = () => { holdTimer.current = setTimeout(() => setMenu(true), 500) }
  const onPointerUp   = () => clearTimeout(holdTimer.current)

  return (
    <>
      <div
        className="tappable"
        onClick={() => playTrack(toTrack(song), queue.map(toTrack), queueIndex)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: isActive ? 'rgba(200,168,75,0.08)' : 'transparent', userSelect: 'none' }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 6, overflow: 'hidden', background: 'var(--card)', flexShrink: 0 }}>
          {song.img
            ? <img src={api.imgUrl(song.img)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 18 }}>🎵</div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title || song.name}</div>
          {(song.artists?.length || song.subtitle) && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {song.artists?.map(a => a.name).join(', ') || song.subtitle}
            </div>
          )}
        </div>
        {isActive && <span style={{ color: 'var(--accent)', fontSize: 14 }}>♪</span>}
      </div>
      {menu && (
        <ContextMenu
          song={toTrack(song)}
          queue={queue.map(toTrack)}
          queueIndex={queueIndex}
          onClose={() => setMenu(false)}
        />
      )}
    </>
  )
}

function EntityCard({ item, type }) {
  const nav = useNavigate()
  const imgUrl = api.imgUrl(item.img)
  const isArtist = type === 'artist'

  const go = () => {
    if (type === 'artist') nav(`/artist/${item.id}`)
    else if (type === 'playlist') nav(`/playlist/${item.id}`)
    else nav(`/collection/${item.id}`)
  }

  return (
    <div className="tappable" onClick={go} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: 46, height: 46, borderRadius: isArtist ? '50%' : 8, overflow: 'hidden', background: 'var(--card)', flexShrink: 0 }}>
        {imgUrl
          ? <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--muted)' }}>{isArtist ? '👤' : '💿'}</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</div>
        {item.subtitle && <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subtitle}</div>}
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--muted)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
    </div>
  )
}

// Normalize search result sections from any response shape
function parseSections(data) {
  if (!data || typeof data !== 'object') return []
  const sections = []

  const trySection = (keys, label, type) => {
    for (const k of keys) {
      const v = data[k]
      if (Array.isArray(v) && v.length > 0) {
        sections.push({ label, items: v, type })
        return
      }
      // Sometimes wrapped: { data: [...] }
      if (v?.data && Array.isArray(v.data) && v.data.length > 0) {
        sections.push({ label, items: v.data, type })
        return
      }
    }
  }

  trySection(['songs', 'content', 'tracks'], 'Songs', 'song')
  trySection(['artists'], 'Artists', 'artist')
  trySection(['albums', 'collections'], 'Albums', 'collection')
  trySection(['playlists'], 'Playlists', 'playlist')

  // Fallback: render any array key we don't recognise
  const known = new Set(['songs','content','tracks','artists','albums','collections','playlists'])
  Object.entries(data).forEach(([k, v]) => {
    if (!known.has(k) && Array.isArray(v) && v.length > 0 && v[0]?.id) {
      sections.push({ label: k, items: v, type: 'collection' })
    }
  })

  return sections
}

export default function SearchPage() {
  const [query, setQuery]         = useState('')
  const [tab, setTab]             = useState('Top')
  const [quickResults, setQuick]  = useState([])
  const [fullResults, setFull]    = useState(null)
  const [showDropdown, setDrop]   = useState(false)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef(null)
  const quickTimer = useRef(null)
  const { track: cur, playing } = usePlayer()

  // Debounced quick search (typeahead)
  useEffect(() => {
    clearTimeout(quickTimer.current)
    if (!query.trim()) { setQuick([]); setDrop(false); return }
    quickTimer.current = setTimeout(async () => {
      try {
        const res = await api.searchQuick(query)
        const items = Array.isArray(res) ? res : (res?.data || res?.results || [])
        setQuick(items)
        setDrop(items.length > 0)
      } catch {}
    }, 250)
    return () => clearTimeout(quickTimer.current)
  }, [query])

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) return
    setDrop(false)
    setSearching(true)
    setFull(null)
    try {
      const res = await api.search(q)
      setFull(res)
    } catch {}
    setSearching(false)
  }, [])

  const onSubmit = (e) => {
    e?.preventDefault()
    doSearch(query)
  }

  const pickQuick = (item) => {
    const q = item.title || item.name || ''
    setQuery(q)
    setDrop(false)
    doSearch(q)
  }

  const clearSearch = () => {
    setQuery('')
    setQuick([])
    setFull(null)
    setDrop(false)
    inputRef.current?.focus()
  }

  const sections = parseSections(fullResults)

  // Filter by tab
  const tabTypeMap = { Songs: 'song', Artists: 'artist', Albums: 'collection', Playlists: 'playlist' }
  const visibleSections = tab === 'Top' ? sections : sections.filter(s => s.type === tabTypeMap[tab])

  // All songs across sections for queue context
  const allSongs = sections.find(s => s.type === 'song')?.items || []

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Search bar */}
      <div style={{ padding: '16px 16px 8px', position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg)' }}>
        <form onSubmit={onSubmit} style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--muted)" style={{ marginLeft: 12, flexShrink: 0 }}>
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => quickResults.length > 0 && setDrop(true)}
              placeholder="Search songs, artists, albums..."
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 15, padding: '12px 8px' }}
              autoFocus
            />
            {query ? (
              <button type="button" onClick={clearSearch} style={{ padding: '0 12px', background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
            ) : null}
          </div>

          {/* Typeahead dropdown */}
          {showDropdown && quickResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderTop: 'none', borderRadius: '0 0 12px 12px',
              zIndex: 100, maxHeight: 280, overflowY: 'auto'
            }}>
              {quickResults.slice(0, 8).map((item, i) => (
                <div
                  key={item.id || i}
                  className="tappable"
                  onClick={() => pickQuick(item)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--muted)">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</div>
                    {item.subtitle && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.subtitle}</div>}
                  </div>
                  {/* Arrow to fill in query */}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--muted)" style={{ transform: 'rotate(-45deg)' }}>
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                  </svg>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Tabs - only show when we have full results */}
      {fullResults && sections.length > 0 && (
        <div className="scroll-row" style={{ padding: '4px 16px 12px', gap: 8 }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flexShrink: 0,
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: tab === t ? 700 : 400,
                background: tab === t ? 'var(--accent)' : 'var(--surface)',
                color: tab === t ? '#000' : 'var(--text)',
                border: tab === t ? 'none' : '1px solid var(--border)',
                cursor: 'pointer'
              }}
            >{t}</button>
          ))}
        </div>
      )}

      {/* Loading */}
      {searching && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner />
        </div>
      )}

      {/* Empty state */}
      {!searching && !fullResults && !query && (
        <div style={{ padding: '60px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Search for songs, artists, albums or playlists</div>
        </div>
      )}

      {/* No results */}
      {!searching && fullResults && sections.length === 0 && (
        <div style={{ padding: '60px 32px', textAlign: 'center' }}>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>No results for "{query}"</div>
        </div>
      )}

      {/* Results by section */}
      {!searching && visibleSections.map(({ label, items, type }) => (
        <div key={label} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{label}</span>
            {items.length > 5 && (
              <span
                className="tappable"
                onClick={() => setTab(TABS.find(t => t.toLowerCase().includes(type.slice(0,4))) || 'Top')}
                style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}
              >View all</span>
            )}
          </div>
          {type === 'song'
            ? items.slice(0, tab === 'Top' ? 5 : 50).map((song, i) => (
                <SongRow
                  key={song.id || i}
                  song={song}
                  queue={allSongs}
                  queueIndex={allSongs.indexOf(song)}
                  isActive={cur?.id === song.id && playing}
                />
              ))
            : items.slice(0, tab === 'Top' ? 4 : 50).map((item, i) => (
                <EntityCard key={item.id || i} item={item} type={type} />
              ))
          }
        </div>
      ))}
    </div>
  )
}
