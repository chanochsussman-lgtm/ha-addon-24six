import { useLongPress } from '../hooks/useLongPress.js'
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { extractCollection, normTrack } from '../extract.js'
import { usePlayer } from '../store/index.jsx'
import AlbumCard from '../components/AlbumCard'
import ContextMenu from '../components/ContextMenu'

export default function CollectionPage() {
  const { id }  = useParams()
  const nav     = useNavigate()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [menu,    setMenu]    = useState(null)
  const { playTrack, track: cur, playing } = usePlayer()
  const autoPlayed = useRef(false)

  useEffect(() => {
    autoPlayed.current = false
    setLoading(true); setData(null)
    const base = window.ingressPath || ''
    fetch(`${base}/api/collections/${id}`)
      .then(r => r.json())
      .then(d => { setData(extractCollection(d)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const { meta = {}, songs = [], albums = [], featuredOn = [], artistObj } = data || {}

  const toTrack = s => normTrack(s, meta?.img, meta?.artists?.map(a=>a.name).join(', ') || artistObj?.name)
  const allTracks = songs.map(toTrack).filter(Boolean)

  // Auto-play singles
  useEffect(() => {
    if (data && allTracks.length === 1 && !autoPlayed.current) {
      autoPlayed.current = true
      playTrack(allTracks[0], allTracks, 0)
    }
  }, [data])

  const makeLongPress = (s, i) => {
    const trigger = () => setMenu({ song: toTrack(s), queue: allTracks, idx: i })
    return {
      onPointerDown:   (e) => { if (e.button === 2) return; e.currentTarget._lpt = setTimeout(trigger, 500) },
      onPointerUp:     (e) => clearTimeout(e.currentTarget._lpt),
      onPointerCancel: (e) => clearTimeout(e.currentTarget._lpt),
      onPointerMove:   (e) => clearTimeout(e.currentTarget._lpt),
      onContextMenu:   (e) => { e.preventDefault(); clearTimeout(e.currentTarget._lpt); trigger() },
    }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ width:28, height:28, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  )

  const imgUrl    = meta?.img   ? api.imgUrl(meta.img)   : null
  const gradColor = meta?.color || '#2a2b32'
  const artistName = meta?.artists?.map(a=>a.name).join(', ') || artistObj?.name || ''

  return (
    <div>
      {/* Hero */}
      <div style={{ background:`linear-gradient(180deg, ${gradColor}99 0%, var(--bg) 100%)`, padding:'14px 16px 24px' }}>
        <button onClick={() => nav(-1)} style={{ background:'rgba(0,0,0,0.35)', borderRadius:'50%', width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:14, gap:14 }}>
          <div style={{ width:150, height:150, borderRadius:12, overflow:'hidden', background:'var(--card)', boxShadow:'0 8px 30px rgba(0,0,0,0.5)' }}>
            {imgUrl && <img src={imgUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>{meta?.title}</div>
            {artistName && (
              <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:3, cursor: artistObj?.id ? 'pointer' : 'default' }}
                onClick={() => artistObj?.id && nav(`/artist/${artistObj.id}`)}>
                {artistName}
              </div>
            )}
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>
              {[
                meta?.release_date && new Date(meta.release_date).getFullYear(),
                allTracks.length > 0 && `${allTracks.length} track${allTracks.length !== 1 ? 's' : ''}`,
              ].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button onClick={() => allTracks.length && playTrack(allTracks[0], allTracks, 0)}
            style={{ background:'var(--accent)', color:'#000', fontWeight:700, fontSize:14, padding:'11px 32px', borderRadius:30, display:'flex', alignItems:'center', gap:7, border:'none', cursor:'pointer', opacity: allTracks.length ? 1 : 0.4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z"/></svg>
            Play All
          </button>
        </div>
      </div>

      {/* Track list */}
      <div style={{ marginBottom: 24 }}>
        {songs.map((s, i) => {
          const t = toTrack(s)
          const isActive = cur?.id === t?.id && playing
          return (
            <div key={s.id || i} className="tappable"
              onClick={() => t && playTrack(t, allTracks, i)}
              {...makeLongPress(s, i)}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 16px',
                background: isActive ? 'rgba(200,168,75,0.08)' : 'transparent',
                borderBottom:'1px solid rgba(255,255,255,0.04)', userSelect:'none' }}>
              <div style={{ width:28, textAlign:'center', flexShrink:0 }}>
                {isActive
                  ? <span style={{ color:'var(--accent)', fontSize:16 }}>♪</span>
                  : <span style={{ color:'var(--muted)', fontSize:12 }}>{i+1}</span>}
              </div>
              <div style={{ width:40, height:40, borderRadius:5, overflow:'hidden', background:'var(--card)', flexShrink:0 }}>
                {(s.img || meta?.img) && <img src={api.imgUrl(s.img || meta.img)} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight: isActive?600:400, color: isActive?'var(--accent)':'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {s.title || s.name}
                </div>
                <div style={{ fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {s.artists?.map(a=>a.name).join(', ') || s.subtitle || artistName}
                </div>
              </div>
              {s.length > 0 && <div style={{ fontSize:11, color:'var(--muted)', flexShrink:0 }}>{Math.floor(s.length/60)}:{String(s.length%60).padStart(2,'0')}</div>}
            </div>
          )
        })}
        {songs.length === 0 && !loading && (
          <div style={{ padding:32, textAlign:'center', color:'var(--muted)' }}>No tracks found</div>
        )}
      </div>

      {/* More from this artist */}
      {albums.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ padding:'0 16px 8px', fontSize:15, fontWeight:700, color:'var(--text)' }}>
            More from {artistName || 'this artist'}
          </div>
          <div className="scroll-row" style={{ padding:'2px 16px 12px' }}>
            {albums.filter(a => a.id !== Number(id)).map(c => (
              <AlbumCard key={c.id} item={{ ...c, type:'collection' }} size={120} />
            ))}
          </div>
        </div>
      )}

      {/* Featured on */}
      {featuredOn.length > 0 && (
        <div style={{ marginBottom:32 }}>
          <div style={{ padding:'0 16px 8px', fontSize:15, fontWeight:700, color:'var(--text)' }}>Featured On</div>
          <div className="scroll-row" style={{ padding:'2px 16px 12px' }}>
            {featuredOn.map(c => (
              <AlbumCard key={c.id} item={{ ...c, type:'collection' }} size={120} />
            ))}
          </div>
        </div>
      )}

      {menu && <ContextMenu song={menu.song} queue={menu.queue} queueIndex={menu.idx} onClose={() => setMenu(null)} />}
    </div>
  )
}
