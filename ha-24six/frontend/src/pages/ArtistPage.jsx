import { useLongPress } from '../hooks/useLongPress.js'
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { extractArtist, normTrack } from '../extract.js'
import { usePlayer } from '../store/index.jsx'
import AlbumCard from '../components/AlbumCard'
import ContextMenu from '../components/ContextMenu'

export default function ArtistPage() {
  const { id } = useParams()
  const nav    = useNavigate()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [menu,    setMenu]    = useState(null)
  const { playTrack, track: cur, playing } = usePlayer()

  useEffect(() => {
    setLoading(true); setError(null); setData(null)
    const base = window.ingressPath || ''
    fetch(`${base}/api/artists/${id}`)
      .then(r => r.json())
      .then(resp_artistpage => { setData(extractArtist(resp_artistpage)); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [id])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ width:28, height:28, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  )
  if (error) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
      <div style={{ color:'var(--muted)', fontSize:14, marginBottom:16 }}>Could not load artist</div>
      <button onClick={() => nav(-1)} style={{ background:'var(--accent)', color:'#000', fontWeight:700, padding:'8px 24px', borderRadius:20, border:'none', cursor:'pointer' }}>← Back</button>
    </div>
  )

  const { artist, songs, albums, featuredOn, similar } = data || {}
  const name   = artist?.name  || artist?.title || `Artist ${id}`
  const imgUrl = artist?.img   ? api.imgUrl(artist.img) : null
  const color  = artist?.color || '#2a2b32'
  const bio    = artist?.bio   || null

  const toTrack = s => normTrack(s, artist?.img, name)
  const allTracks = (songs || []).map(toTrack).filter(Boolean)

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

  const SongRow = ({ s, i }) => {
    const t = toTrack(s)
    const isActive = cur?.id === t?.id && playing
    return (
      <div className="tappable"
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
        <div style={{ width:40, height:40, borderRadius:6, overflow:'hidden', background:'var(--card)', flexShrink:0 }}>
          {/* top_songs may not have their own img — fall back to artist img */}
          <img src={api.imgUrl(s.img || artist?.img)} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight: isActive?600:400, color: isActive?'var(--accent)':'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {s.title || s.name}
          </div>
          <div style={{ fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {s.artists?.map(a=>a.name).join(', ') || s.subtitle || name}
          </div>
        </div>
        {s.length > 0 && (
          <div style={{ fontSize:11, color:'var(--muted)', flexShrink:0 }}>
            {Math.floor(s.length/60)}:{String(s.length%60).padStart(2,'0')}
          </div>
        )}
      </div>
    )
  }

  const CardRow = ({ title, items, circle }) => {
    if (!items?.length) return null
    return (
      <div style={{ marginBottom:24 }}>
        <div style={{ padding:'0 16px 8px', fontSize:15, fontWeight:700, color:'var(--text)' }}>{title}</div>
        <div className="scroll-row" style={{ padding:'2px 16px 12px' }}>
          {items.map(c => (
            <AlbumCard key={c.id} item={{ ...c, type: circle ? 'artist' : 'collection' }} size={circle ? 90 : 120} circle={circle} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Hero */}
      <div style={{ background:`linear-gradient(180deg, ${color}cc 0%, var(--bg) 100%)`, padding:'14px 16px 28px' }}>
        <button onClick={() => nav(-1)} style={{ background:'rgba(0,0,0,0.35)', borderRadius:'50%', width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:14, gap:12 }}>
          <div style={{ width:130, height:130, borderRadius:'50%', overflow:'hidden', background:'var(--card)', boxShadow:'0 8px 32px rgba(0,0,0,0.6)', flexShrink:0 }}>
            {imgUrl
              ? <img src={imgUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48 }}>👤</div>}
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:700, color:'var(--text)' }}>{name}</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>
              {[
                albums?.length  > 0 && `${albums.length} albums`,
                songs?.length   > 0 && `${songs.length} top songs`,
              ].filter(Boolean).join(' · ')}
            </div>
          </div>
          {allTracks.length > 0 && (
            <button onClick={() => playTrack(allTracks[0], allTracks, 0)}
              style={{ background:'var(--accent)', color:'#000', fontWeight:700, fontSize:13, padding:'9px 26px', borderRadius:30, display:'flex', alignItems:'center', gap:6, border:'none', cursor:'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z"/></svg>
              Play All
            </button>
          )}
        </div>
      </div>

      {/* Bio */}
      {bio && (
        <div style={{ padding:'0 16px 20px' }}>
          <BioText text={bio} />
        </div>
      )}

      {/* Top Songs */}
      {songs?.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ padding:'0 16px 8px', fontSize:15, fontWeight:700, color:'var(--text)' }}>Top Songs</div>
          {songs.map((s, i) => <SongRow key={s.id || i} s={s} i={i} />)}
        </div>
      )}

      {/* Albums */}
      <CardRow title="Albums" items={albums} />

      {/* Featured On */}
      <CardRow title="Featured On" items={featuredOn} />

      {/* Similar Artists */}
      <CardRow title="Similar Artists" items={similar} circle />

      {!songs?.length && !albums?.length && (
        <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>
          No content found — check browser console for raw API shape
        </div>
      )}

      {menu && <ContextMenu song={menu.song} queue={menu.queue} queueIndex={menu.idx} onClose={() => setMenu(null)} />}
    </div>
  )
}

// Collapsible bio text
function BioText({ text }) {
  const [open, setOpen] = useState(false)
  const short = text.length > 200
  return (
    <div>
      <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6,
        overflow: open ? 'visible' : 'hidden',
        display: '-webkit-box', WebkitLineClamp: open ? 'unset' : 3,
        WebkitBoxOrient: 'vertical' }}>
        {text}
      </div>
      {short && (
        <span onClick={() => setOpen(o => !o)}
          style={{ fontSize:12, color:'var(--accent)', cursor:'pointer', marginTop:4, display:'inline-block' }}>
          {open ? 'Show less' : 'Read more'}
        </span>
      )}
    </div>
  )
}
