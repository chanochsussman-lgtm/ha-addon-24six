import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { usePlayer } from '../store/index.jsx'
import AlbumCard from '../components/AlbumCard'
import ContextMenu from '../components/ContextMenu'

export default function ArtistPage() {
  const { id }   = useParams()
  const nav      = useNavigate()
  const [artist,      setArtist]      = useState(null)
  const [topSongs,    setTopSongs]    = useState([])
  const [collections, setCollections] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [menu,        setMenu]        = useState(null)
  const { playTrack, track: cur, playing } = usePlayer()

  useEffect(() => {
    setLoading(true); setError(null); setArtist(null); setTopSongs([]); setCollections([])
    api.artist(id)
      .then(d => {
        // Server now normalizes to { artist, top_songs, collections }
        // but handle raw shape too just in case
        const a   = d?.artist      ?? (d?.id ? d : {})
        const ts  = d?.top_songs   ?? d?.songs   ?? []
        const col = d?.collections ?? d?.albums  ?? []
        setArtist(Array.isArray(a) ? a[0] ?? {} : a)
        setTopSongs(Array.isArray(ts)  ? ts  : [])
        setCollections(Array.isArray(col) ? col : [])
        setLoading(false)
      })
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

  const name     = artist?.name || artist?.title || `Artist ${id}`
  const imgUrl   = artist?.img ? api.imgUrl(artist.img) : null
  const gradColor = artist?.color || '#1e1f25'

  const toTrack = s => ({
    id:     s.id,
    title:  s.title || s.name || '',
    artist: s.artists?.map(a => a.name).join(', ') || s.subtitle || name,
    img:    s.img || artist?.img || null,
  })
  const allTracks = topSongs.map(toTrack)

  const holdTimers = useRef({})
  const onPD = (s, i) => () => { holdTimers.current[i] = setTimeout(() => setMenu({ song: toTrack(s), queue: allTracks, idx: i }), 500) }
  const onPU = i     => () => clearTimeout(holdTimers.current[i])

  return (
    <div>
      {/* Hero */}
      <div style={{ background:`linear-gradient(180deg, ${gradColor}cc 0%, var(--bg) 100%)`, padding:'14px 16px 24px' }}>
        <button onClick={() => nav(-1)} style={{ background:'rgba(0,0,0,0.35)', borderRadius:'50%', width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:14, gap:12 }}>
          <div style={{ width:120, height:120, borderRadius:'50%', overflow:'hidden', background:'var(--card)', boxShadow:'0 8px 32px rgba(0,0,0,0.6)' }}>
            {imgUrl
              ? <img src={imgUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48, color:'var(--muted)' }}>👤</div>
            }
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:700, color:'var(--text)' }}>{name}</div>
            {(artist?.collection_count > 0 || collections.length > 0) && (
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{artist?.collection_count || collections.length} albums</div>
            )}
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

      {/* Top Songs */}
      {topSongs.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ padding:'12px 16px 6px', fontSize:15, fontWeight:700, color:'var(--text)' }}>Top Songs</div>
          {topSongs.map((s, i) => {
            const isActive = cur?.id === s.id && playing
            return (
              <div key={s.id || i} className="tappable"
                onClick={() => playTrack(toTrack(s), allTracks, i)}
                onPointerDown={onPD(s,i)} onPointerUp={onPU(i)} onPointerCancel={onPU(i)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 16px', background:isActive?'rgba(200,168,75,0.08)':'transparent', borderBottom:'1px solid rgba(255,255,255,0.04)', userSelect:'none' }}>
                <div style={{ width:28, textAlign:'center', flexShrink:0 }}>
                  {isActive ? <span style={{ color:'var(--accent)', fontSize:16 }}>♪</span>
                             : <span style={{ color:'var(--muted)', fontSize:12 }}>{i+1}</span>}
                </div>
                <div style={{ width:40, height:40, borderRadius:5, overflow:'hidden', background:'var(--card)', flexShrink:0 }}>
                  {(s.img || artist?.img) && <img src={api.imgUrl(s.img || artist?.img)} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:isActive?600:400, color:isActive?'var(--accent)':'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.title||s.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.subtitle||s.artists?.map(a=>a.name).join(', ')||''}</div>
                </div>
                {s.length > 0 && <div style={{ fontSize:11, color:'var(--muted)', flexShrink:0 }}>{Math.floor(s.length/60)}:{String(s.length%60).padStart(2,'0')}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Albums */}
      {collections.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ padding:'0 16px 8px', fontSize:15, fontWeight:700, color:'var(--text)' }}>Albums</div>
          <div className="scroll-row" style={{ padding:'2px 16px 12px' }}>
            {collections.map(c => <AlbumCard key={c.id} item={{ ...c, type:'collection' }} size={120} />)}
          </div>
        </div>
      )}

      {topSongs.length === 0 && collections.length === 0 && (
        <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>No content found</div>
      )}

      {menu && <ContextMenu song={menu.song} queue={menu.queue} queueIndex={menu.idx} onClose={() => setMenu(null)} />}
    </div>
  )
}
