import { useLongPress } from '../hooks/useLongPress.js'
import React, { useRef, useState } from 'react'
import { api } from '../api'
import { usePlayer } from '../store/index.jsx'
import ContextMenu from './ContextMenu'

// Single song row: artwork | title + artist | ♥ | ⋮
export function SongListRow({ song, queue, queueIndex, isActive }) {
  const { playTrack } = usePlayer()
  const [menu, setMenu] = useState(false)
  const [faved, setFaved] = useState(false)
  const holdTimer = useRef(null)
  const moved = useRef(false)

  const onPointerDown = (e) => {
    if (e.button === 2) return
    moved.current = false
    holdTimer.current = setTimeout(() => { if (!moved.current) setMenu(true) }, 500)
  }
  const onPointerMove   = () => { moved.current = true; clearTimeout(holdTimer.current) }
  const onPointerUp     = () => clearTimeout(holdTimer.current)
  const onContextMenu   = (e) => { e.preventDefault(); clearTimeout(holdTimer.current); setMenu(true) }

  const toT = s => ({
    id:     s.id,
    title:  s.title || s.name || '',
    artist: s.artists?.map(a => a.name).join(', ') || s.subtitle || '',
    img:    s.img || null,
    artistId:     s.artist_id || s.artistId || null,
    collectionId: s.collection_id || s.collectionId || null,
  })

  const t = toT(song)

  const doFav = async (e) => {
    e.stopPropagation()
    try {
      const base = window.ingressPath || ''
      await fetch(`${base}/api/library/favorites/${song.id}`, { method: 'POST' })
      setFaved(true)
    } catch {}
  }

  return (
    <>
      <div className="tappable"
        onClick={() => playTrack(t, queue.map(toT), queueIndex)}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onContextMenu={onContextMenu}
        style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)', background: isActive ? 'rgba(200,168,75,0.08)' : 'transparent', userSelect:'none' }}>
        {/* Artwork */}
        <div style={{ width:46, height:46, borderRadius:7, overflow:'hidden', background:'var(--card)', flexShrink:0 }}>
          {t.img
            ? <img src={api.imgUrl(t.img)} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:20 }}>🎵</div>
          }
        </div>
        {/* Title + artist */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--accent)' : 'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.title}</div>
          <div style={{ fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:1 }}>{t.artist}</div>
        </div>
        {/* Heart */}
        <button onClick={doFav} style={{ background:'none', border:'none', cursor:'pointer', padding:6, flexShrink:0, color: faved ? '#e05' : 'rgba(255,255,255,0.3)', display:'flex', alignItems:'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={faved ? '#e05' : 'none'} stroke={faved ? '#e05' : 'currentColor'} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        {/* 3-dot menu */}
        <button onClick={e => { e.stopPropagation(); setMenu(true) }} style={{ background:'none', border:'none', cursor:'pointer', padding:6, flexShrink:0, color:'rgba(255,255,255,0.3)', display:'flex', alignItems:'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      </div>
      {menu && <ContextMenu song={t} queue={queue.map(toT)} queueIndex={queueIndex} onClose={() => setMenu(false)} />}
    </>
  )
}

// Multi-column grid of song rows (like the Trending Now section)
// columns: how many columns side by side (default 1 on mobile, 3 on wide)
export function SongGrid({ songs, title, columns = 1 }) {
  const { track: cur, playing } = usePlayer()
  const allTracks = songs.map(s => ({
    id:     s.id,
    title:  s.title || s.name || '',
    artist: s.artists?.map(a => a.name).join(', ') || s.subtitle || '',
    img:    s.img || null,
  }))

  // Split into columns
  const cols = []
  const perCol = Math.ceil(songs.length / columns)
  for (let c = 0; c < columns; c++) {
    cols.push(songs.slice(c * perCol, (c + 1) * perCol))
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap:'0 1px' }}>
      {cols.map((col, ci) => (
        <div key={ci}>
          {col.map((s, i) => {
            const globalIdx = ci * perCol + i
            return (
              <SongListRow
                key={s.id || globalIdx}
                song={s}
                queue={allTracks}
                queueIndex={globalIdx}
                isActive={cur?.id === s.id && playing}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
