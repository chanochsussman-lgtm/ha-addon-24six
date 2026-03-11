import React, { useState, useEffect } from 'react'
import { usePlayer } from '../store/index.jsx'
import { api } from '../api'

function fmt(s) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function CastModal({ track, onClose }) {
  const [speakers, setSpeakers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [casting, setCasting]   = useState(null)
  const [done, setDone]         = useState(null)
  const b = window.ingressPath || ''

  useEffect(() => {
    fetch(`${b}/api/ha/speakers`)
      .then(r => r.json())
      .then(d => { setSpeakers(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cast = async (entity_id) => {
    setCasting(entity_id); setDone(null)
    try {
      const r = await fetch(`${b}/api/ha/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id, track_id: track.id })
      })
      const d = await r.json()
      setDone(d.ok ? 'ok' : d.error || 'error')
    } catch (e) { setDone('error') }
    setCasting(null)
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'flex-end' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'var(--surface)', borderRadius:'20px 20px 0 0', width:'100%', paddingBottom:32, animation:'slideUp 0.22s ease' }}>
        <div style={{ padding:'18px 20px 12px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Cast to Speaker</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{track?.title}</div>
        </div>
        {loading && <div style={{ padding:32, textAlign:'center', color:'var(--muted)' }}>Loading speakers...</div>}
        {!loading && speakers.length === 0 && (
          <div style={{ padding:32, textAlign:'center', color:'var(--muted)' }}>No media players found in Home Assistant</div>
        )}
        {speakers.map(s => (
          <div key={s.entity_id} className="tappable" onClick={() => cast(s.entity_id)}
            style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ width:36, height:36, borderRadius:8, background:'var(--card)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--accent)"><path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/></svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{s.state}</div>
            </div>
            {casting === s.entity_id
              ? <div style={{ width:18, height:18, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
              : done && casting === null
                ? <span style={{ fontSize:12, color: done === 'ok' ? '#4caf50' : '#f66' }}>{done === 'ok' ? '✓' : '✗'}</span>
                : null
            }
          </div>
        ))}
        <div className="tappable" onClick={onClose}
          style={{ textAlign:'center', padding:'14px', color:'var(--muted)', fontSize:15, borderTop:'1px solid var(--border)', marginTop:4 }}>Cancel</div>
      </div>
    </div>
  )
}

function FullPlayer({ track, playing, progress, duration, loading, togglePlay, seek, playNext, playPrev, onClose }) {
  const [showCast, setShowCast] = useState(false)
  const pct = duration > 0 ? (progress / duration) * 100 : 0
  const imgUrl = track?.img ? api.imgUrl(track.img) : null

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'var(--bg)', display:'flex', flexDirection:'column', animation:'slideUp 0.28s ease' }}>
      {/* Background blur art */}
      {imgUrl && (
        <div style={{ position:'absolute', inset:0, backgroundImage:`url(${imgUrl})`, backgroundSize:'cover', backgroundPosition:'center', filter:'blur(40px) brightness(0.3)', transform:'scale(1.1)' }} />
      )}
      <div style={{ position:'relative', flex:1, display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px' }}>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', borderRadius:'50%', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
          </button>
          <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.7)', letterSpacing:1 }}>NOW PLAYING</div>
          <button onClick={() => setShowCast(true)} style={{ background:'rgba(255,255,255,0.1)', borderRadius:'50%', width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/></svg>
          </button>
        </div>

        {/* Artwork */}
        <div style={{ display:'flex', justifyContent:'center', padding:'20px 40px 32px' }}>
          <div style={{ width:'min(280px, 70vw)', height:'min(280px, 70vw)', borderRadius:18, overflow:'hidden', background:'var(--card)', boxShadow:'0 20px 60px rgba(0,0,0,0.7)' }}>
            {imgUrl
              ? <img src={imgUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:64 }}>🎵</div>
            }
          </div>
        </div>

        {/* Track info */}
        <div style={{ padding:'0 32px 24px', textAlign:'left' }}>
          <div style={{ fontSize:22, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track?.title || 'No track'}</div>
          <div style={{ fontSize:15, color:'rgba(255,255,255,0.6)', marginTop:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track?.artist || ''}</div>
        </div>

        {/* Progress */}
        <div style={{ padding:'0 32px', marginBottom:8 }}>
          <div style={{ height:4, background:'rgba(255,255,255,0.2)', borderRadius:2, cursor:'pointer', position:'relative' }}
            onClick={e => {
              if (!duration) return
              const r = e.currentTarget.getBoundingClientRect()
              seek(((e.clientX - r.left) / r.width) * duration)
            }}>
            <div style={{ height:'100%', background:'var(--accent)', borderRadius:2, width:`${pct}%`, transition:'width 0.5s linear' }} />
            <div style={{ position:'absolute', top:'50%', left:`${pct}%`, transform:'translate(-50%,-50%)', width:14, height:14, borderRadius:'50%', background:'var(--accent)', boxShadow:'0 0 6px rgba(200,168,75,0.8)' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{fmt(progress)}</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{fmt(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:32, padding:'8px 32px 32px' }}>
          <button onClick={playPrev} style={{ background:'transparent', border:'none', cursor:'pointer', padding:8 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
          </button>
          <button onClick={togglePlay} style={{ width:68, height:68, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer', boxShadow:'0 4px 20px rgba(200,168,75,0.5)' }}>
            {loading
              ? <div style={{ width:22, height:22, border:'3px solid #000', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
              : playing
                ? <svg width="24" height="24" viewBox="0 0 24 24" fill="#000"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg width="24" height="24" viewBox="0 0 24 24" fill="#000" style={{ marginLeft:3 }}><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <button onClick={() => playNext()} style={{ background:'transparent', border:'none', cursor:'pointer', padding:8 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>
      </div>

      {showCast && <CastModal track={track} onClose={() => setShowCast(false)} />}
    </div>
  )
}

export default function Player() {
  const { track, playing, progress, duration, loading, togglePlay, seek, playNext, playPrev } = usePlayer()
  const [expanded, setExpanded] = useState(false)
  const pct = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <>
      {/* Mini player bar */}
      <div style={{ background:'var(--surface)', borderTop:'1px solid var(--border)' }}>
        <div style={{ height:3, background:'var(--border)' }}
          onClick={e => {
            if (!duration) return
            const r = e.currentTarget.getBoundingClientRect()
            seek(((e.clientX - r.left) / r.width) * duration)
          }}>
          <div style={{ height:'100%', background:'var(--accent)', width:`${pct}%`, transition:'width 0.5s linear' }} />
        </div>

        <div style={{ height:'calc(var(--player-height) - 3px)', display:'flex', alignItems:'center', gap:10, padding:'0 14px' }}
          onClick={() => track && setExpanded(true)}>
          <div style={{ width:40, height:40, borderRadius:6, flexShrink:0, background:'var(--card)', overflow:'hidden' }}>
            {track?.img
              ? <img src={api.imgUrl(track.img)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🎵</div>
            }
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color: track?'var(--text)':'var(--muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {track?.title || 'No track playing'}
            </div>
            {track?.artist && <div style={{ fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track.artist}</div>}
          </div>
          {track && (
            <button onClick={e => { e.stopPropagation(); togglePlay() }} style={{ background:'transparent', border:'none', cursor:'pointer', padding:6, flexShrink:0 }}>
              {loading
                ? <div style={{ width:20, height:20, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                : playing
                  ? <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--accent)"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  : <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--accent)" style={{ marginLeft:2 }}><path d="M8 5v14l11-7z"/></svg>
              }
            </button>
          )}
          {track && (
            <button onClick={e => { e.stopPropagation(); playNext() }} style={{ background:'transparent', border:'none', cursor:'pointer', padding:6, flexShrink:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <FullPlayer
          track={track} playing={playing} progress={progress} duration={duration}
          loading={loading} togglePlay={togglePlay} seek={seek}
          playNext={playNext} playPrev={playPrev}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  )
}
