import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { usePlayer } from '../store/index.jsx'
import ContextMenu from '../components/ContextMenu'
import { extractSearch, extractQuickSearch } from '../extract.js'

const TABS = ['Top', 'Songs', 'Artists', 'Albums', 'Playlists']

function Spinner() {
  return <div style={{ width:20, height:20, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />
}

function parseSections(data) {
  const searchData = extractSearch(data)
  if (!searchData || typeof searchData !== 'object') return []
  const out = []
  const try_ = (keys, label, type) => {
    for (const k of keys) {
      const v = searchData[k]
      const arr = Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : null
      if (arr?.length) { out.push({ label, items:arr, type }); return }
    }
  }
  try_(['songs','content','tracks'], 'Songs', 'song')
  try_(['artists'], 'Artists', 'artist')
  try_(['albums','collections'], 'Albums', 'collection')
  try_(['playlists'], 'Playlists', 'playlist')
  const known = new Set(['songs','content','tracks','artists','albums','collections','playlists'])
  Object.entries(searchData).forEach(([k,v]) => {
    if (!known.has(k) && Array.isArray(v) && v.length && v[0]?.id)
      out.push({ label:k, items:v, type:'collection' })
  })
  return out
}

function SongRow({ song, queue, queueIndex, isActive }) {
  const { playTrack } = usePlayer()
  const [menu, setMenu] = useState(false)
  const hold = useRef(null)
  const toT  = s => ({ id:s.id, title:s.title||s.name, artist:s.artists?.map(a=>a.name).join(', ')||s.subtitle||'', img:s.img })
  return (
    <>
      <div className="tappable"
        onClick={() => playTrack(toT(song), queue.map(toT), queueIndex)}
        onPointerDown={() => { hold.current = setTimeout(()=>setMenu(true),500) }}
        onPointerUp={() => clearTimeout(hold.current)}
        onPointerCancel={() => clearTimeout(hold.current)}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', background:isActive?'rgba(200,168,75,0.08)':'transparent', userSelect:'none' }}>
        <div style={{ width:42, height:42, borderRadius:6, overflow:'hidden', background:'var(--card)', flexShrink:0 }}>
          {song.img ? <img src={api.imgUrl(song.img)} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:18 }}>🎵</div>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:isActive?600:400, color:isActive?'var(--accent)':'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{song.title||song.name}</div>
          {(song.artists?.length||song.subtitle) && (
            <div style={{ fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {song.artists?.map(a=>a.name).join(', ')||song.subtitle}
            </div>
          )}
        </div>
        {isActive && <span style={{ color:'var(--accent)', fontSize:14 }}>♪</span>}
      </div>
      {menu && <ContextMenu song={toT(song)} queue={queue.map(toT)} queueIndex={queueIndex} onClose={()=>setMenu(false)} />}
    </>
  )
}

function EntityCard({ item, type }) {
  const nav = useNavigate()
  const go = () => {
    if (type==='artist') nav(`/artist/${item.id}`)
    else if (type==='playlist') nav(`/playlist/${item.id}`)
    else nav(`/collection/${item.id}`)
  }
  return (
    <div className="tappable" onClick={go} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width:46, height:46, borderRadius:type==='artist'?'50%':8, overflow:'hidden', background:'var(--card)', flexShrink:0 }}>
        {item.img ? <img src={api.imgUrl(item.img)} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'var(--muted)' }}>{type==='artist'?'👤':'💿'}</div>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.title||item.name}</div>
        {item.subtitle && <div style={{ fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.subtitle}</div>}
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--muted)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
    </div>
  )
}

export default function SearchPage() {
  const [query,    setQuery]    = useState('')
  const [tab,      setTab]      = useState('Top')
  const [suggs,    setSuggs]    = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const [full,     setFull]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const inputRef  = useRef(null)
  const timer     = useRef(null)
  const { track: cur, playing } = usePlayer()

  // ── Typeahead — server now always returns flat array ─────────────────────
  useEffect(() => {
    clearTimeout(timer.current)
    if (!query.trim()) { setSuggs([]); setShowDrop(false); return }
    timer.current = setTimeout(async () => {
      try {
        const res = await api.searchQuick(query.trim())
        // Server normalizes to array, but handle both just in case
        const items = Array.isArray(res) ? res
          : Array.isArray(res?.data) ? res.data
          : Array.isArray(res?.results) ? res.results
          : []
        setSuggs(items)
        setShowDrop(items.length > 0)
      } catch { setSuggs([]); setShowDrop(false) }
    }, 220)
    return () => clearTimeout(timer.current)
  }, [query])

  const doSearch = useCallback(async q => {
    if (!q.trim()) return
    setShowDrop(false); setLoading(true); setFull(null); setTab('Top')
    try { setFull(await api.search(q.trim())) } catch {}
    setLoading(false)
  }, [])

  // ── KEY: use onMouseDown + preventDefault so dropdown click fires
  // BEFORE input onBlur, preventing the dropdown from hiding first ──────────
  const pickSugg = (e, item) => {
    e.preventDefault()           // stop input blur
    const label = item.title || item.name || ''
    setQuery(label)
    setShowDrop(false)
    doSearch(label)
  }

  const fillQuery = (e, item) => {
    e.preventDefault(); e.stopPropagation()
    setQuery(item.title || item.name || '')
    setShowDrop(false)
    inputRef.current?.focus()
  }

  const sections = parseSections(full)
  const tabMap   = { Songs:'song', Artists:'artist', Albums:'collection', Playlists:'playlist' }
  const visible  = tab==='Top' ? sections : sections.filter(s => s.type===tabMap[tab])
  const allSongs = sections.find(s=>s.type==='song')?.items || []

  return (
    <div style={{ minHeight:'100%' }}>

      {/* ── Search bar ── */}
      <div style={{ padding:'16px 16px 8px', position:'sticky', top:0, zIndex:200, background:'var(--bg)' }}>
        <div style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', background:'var(--surface)',
            borderRadius: showDrop && suggs.length ? '12px 12px 0 0' : 12,
            border:'1px solid var(--border)', overflow:'hidden' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--muted)" style={{ marginLeft:12, flexShrink:0 }}>
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => suggs.length > 0 && setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)} // small delay so mouseDown fires first
              onKeyDown={e => {
                if (e.key==='Enter') { e.preventDefault(); doSearch(query); setShowDrop(false) }
                if (e.key==='Escape') setShowDrop(false)
              }}
              placeholder="Search songs, artists, albums..."
              autoFocus
              style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'var(--text)', fontSize:15, padding:'12px 8px' }}
            />
            {loading && <div style={{ marginRight:10 }}><Spinner /></div>}
            {query && !loading && (
              <button type="button"
                onMouseDown={e => { e.preventDefault(); setQuery(''); setSuggs([]); setFull(null); setShowDrop(false); inputRef.current?.focus() }}
                style={{ padding:'0 10px', background:'transparent', border:'none', color:'var(--muted)', fontSize:20, cursor:'pointer', lineHeight:1 }}>×</button>
            )}
            <button type="button"
              onMouseDown={e => { e.preventDefault(); doSearch(query) }}
              style={{ background:'var(--accent)', border:'none', cursor:'pointer', padding:'0 16px', height:46, display:'flex', alignItems:'center', color:'#000', fontWeight:700, fontSize:12, flexShrink:0, letterSpacing:0.5 }}>
              GO
            </button>
          </div>

          {/* ── Typeahead dropdown ──
              CRITICAL: every interactive element uses onMouseDown+preventDefault
              so the input's onBlur 150ms delay is enough for clicks to register ── */}
          {showDrop && suggs.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--surface)',
              border:'1px solid var(--border)', borderTop:'none', borderRadius:'0 0 12px 12px',
              zIndex:300, maxHeight:320, overflowY:'auto', boxShadow:'0 8px 28px rgba(0,0,0,0.55)' }}>
              {suggs.slice(0, 10).map((item, i) => {
                const t = item._type || item.type || ''
                const icon = t.includes('artist') ? '👤' : t.includes('playlist') ? '📋' : t.includes('album')||t.includes('collection') ? '💿' : '🎵'
                return (
                  <div key={item.id || i}
                    onMouseDown={e => pickSugg(e, item)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                      borderBottom:'1px solid rgba(255,255,255,0.05)', cursor:'pointer',
                      background:'transparent', userSelect:'none' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <div style={{ width:38, height:38, borderRadius:6, overflow:'hidden', background:'var(--card)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>
                      {item.img ? <img src={api.imgUrl(item.img)} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.title||item.name}</div>
                      {item.subtitle && <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{item.subtitle}</div>}
                    </div>
                    {/* Fill-in arrow — puts text in box without searching */}
                    <div onMouseDown={e => fillQuery(e, item)}
                      style={{ padding:'6px 4px', cursor:'pointer', flexShrink:0, opacity:0.5 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--muted)" style={{ transform:'rotate(-45deg)', display:'block' }}>
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                      </svg>
                    </div>
                  </div>
                )
              })}
              {suggs.length > 10 && (
                <div style={{ padding:'8px 14px', fontSize:11, color:'var(--muted)', borderTop:'1px solid var(--border)', textAlign:'center' }}>
                  +{suggs.length-10} more — press Enter to see all
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {full && sections.length > 0 && (
        <div className="scroll-row" style={{ padding:'4px 16px 12px', gap:8 }}>
          {TABS.map(t => (
            <button key={t} onClick={()=>setTab(t)}
              style={{ flexShrink:0, padding:'6px 16px', borderRadius:20, fontSize:13, fontWeight:tab===t?700:400,
                background:tab===t?'var(--accent)':'var(--surface)', color:tab===t?'#000':'var(--text)',
                border:tab===t?'none':'1px solid var(--border)', cursor:'pointer' }}>{t}</button>
          ))}
        </div>
      )}

      {/* States */}
      {!loading && !full && !query && (
        <div style={{ padding:'60px 32px', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
          <div style={{ color:'var(--text-secondary)', fontSize:15 }}>Search songs, artists, albums, playlists</div>
        </div>
      )}
      {!loading && full && sections.length===0 && (
        <div style={{ padding:'60px 32px', textAlign:'center', color:'var(--muted)', fontSize:14 }}>No results for "{query}"</div>
      )}

      {/* Results */}
      {!loading && visible.map(({ label, items, type }) => (
        <div key={label} style={{ marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px 4px' }}>
            <span style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{label}</span>
            {items.length > 5 && (
              <span className="tappable" onClick={() => setTab(TABS.find(t=>tabMap[t]===type)||'Top')}
                style={{ fontSize:12, color:'var(--accent)', fontWeight:500 }}>View all</span>
            )}
          </div>
          {type==='song'
            ? items.slice(0, tab==='Top'?5:50).map((s,i) => <SongRow key={s.id||i} song={s} queue={allSongs} queueIndex={allSongs.indexOf(s)} isActive={cur?.id===s.id&&playing} />)
            : items.slice(0, tab==='Top'?4:50).map((item,i) => <EntityCard key={item.id||i} item={item} type={type} />)
          }
        </div>
      ))}
    </div>
  )
}
