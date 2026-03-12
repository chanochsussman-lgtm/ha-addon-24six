import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { usePlayer } from '../store/index.jsx'
import ContextMenu from '../components/ContextMenu'

export default function CollectionPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [meta, setMeta]   = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [menu, setMenu] = useState(null)
  const { playTrack, track: cur, playing } = usePlayer()

  useEffect(() => {
    setLoading(true)
    // Single call - songs are in collection.contents
    api.collection(id).then(d => {
      const col = d?.collection || d
      setMeta(col)
      // Songs live in collection.contents
      const arr = col?.contents || []
      setSongs(Array.isArray(arr) ? arr : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const toTrack = s => ({
    id: s.id,
    title: s.title || s.name,
    artist: s.artists?.map(a => a.name).join(', ') || s.subtitle || meta?.artists?.map(a=>a.name).join(', ') || '',
    img: s.img || meta?.img
  })

  const allTracks = songs.map(toTrack)
  const playAll  = () => { if (!allTracks.length) return; playTrack(allTracks[0], allTracks, 0) }

  // Auto-play if only 1 song (single) — but only if not already playing this track
  useEffect(() => {
    if (allTracks.length === 1 && !loading) {
      playTrack(allTracks[0], allTracks, 0)
    }
  }, [allTracks.length, loading])
  const playSong = i  => playTrack(allTracks[i], allTracks, i)

  const holdTimers = useRef({})
  const onPD = (s, i) => () => { holdTimers.current[i] = setTimeout(() => setMenu({ song: toTrack(s), queue: allTracks, idx: i }), 500) }
  const onPU = i      => () => clearTimeout(holdTimers.current[i])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ width:28, height:28, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  )

  const imgUrl   = meta?.img ? api.imgUrl(meta.img) : null
  const gradColor = meta?.color || '#2a2b32'

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
            <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:3 }}>
              {meta?.artists?.map(a=>a.name).join(', ')}
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>{songs.length} track{songs.length !== 1 ? 's':''}</div>
          </div>
          <button onClick={playAll} style={{ background:'var(--accent)', color:'#000', fontWeight:700, fontSize:14, padding:'11px 32px', borderRadius:30, display:'flex', alignItems:'center', gap:7, border:'none', cursor:'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z"/></svg>
            Play All
          </button>
        </div>
      </div>

      {/* Track list */}
      <div>
        {songs.map((s, i) => {
          const isActive = cur?.id === s.id && playing
          return (
            <div key={s.id || i} className="tappable" onClick={() => playSong(i)}
              onPointerDown={onPD(s,i)} onPointerUp={onPU(i)} onPointerCancel={onPU(i)}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 16px', background: isActive ? 'rgba(200,168,75,0.08)':'transparent', borderBottom:'1px solid rgba(255,255,255,0.04)', userSelect:'none' }}
            >
              <div style={{ width:28, textAlign:'center', flexShrink:0 }}>
                {isActive ? <span style={{ color:'var(--accent)', fontSize:16 }}>♪</span>
                           : <span style={{ color:'var(--muted)', fontSize:12 }}>{i+1}</span>}
              </div>
              <div style={{ width:40, height:40, borderRadius:5, overflow:'hidden', background:'var(--card)', flexShrink:0 }}>
                {(s.img || meta?.img) && <img src={api.imgUrl(s.img || meta.img)} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight: isActive?600:400, color: isActive?'var(--accent)':'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.title||s.name}</div>
                <div style={{ fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {s.artists?.map(a=>a.name).join(', ') || s.subtitle || ''}
                </div>
              </div>
              {s.length > 0 && <div style={{ fontSize:11, color:'var(--muted)', flexShrink:0 }}>{Math.floor(s.length/60)}:{String(s.length%60).padStart(2,'0')}</div>}
            </div>
          )
        })}
        {songs.length === 0 && <div style={{ padding:32, textAlign:'center', color:'var(--muted)' }}>No tracks found</div>}
      </div>

      {menu && <ContextMenu song={menu.song} queue={menu.queue} queueIndex={menu.idx} onClose={() => setMenu(null)} />}
    </div>
  )
}
