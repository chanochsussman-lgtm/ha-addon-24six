import React, { useState, useEffect } from 'react'
import { usePlayer } from '../store/index.jsx'
import { api } from '../api'

function fmt(s) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

// ── Cast Modal ────────────────────────────────────────────────────────────────
function CastModal({ track, onClose }) {
  const [speakers, setSpeakers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [casting, setCasting]   = useState(null)
  const [results, setResults]   = useState({})
  const b = window.ingressPath || ''

  useEffect(() => {
    fetch(`${b}/api/ha/speakers`)
      .then(r => r.json())
      .then(d => {
        const all = Array.isArray(d) ? d : []
        all.sort((a, b) => {
          const rank = s => s==='playing'?0 : s==='idle'||s==='paused'?1 : s==='off'?2 : 3
          return rank(a.state) - rank(b.state)
        })
        setSpeakers(all); setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const cast = async (entity_id) => {
    setCasting(entity_id)
    try {
      const r = await fetch(`${b}/api/ha/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id, track_id: track.id, track_title: track.title })
      })
      const d = await r.json()
      setResults(prev => ({ ...prev, [entity_id]: d.ok ? 'ok' : (d.error || 'error') }))
    } catch (e) {
      setResults(prev => ({ ...prev, [entity_id]: 'error' }))
    }
    setCasting(null)
  }

  const setVolume = (entity_id, volume) => {
    fetch(`${b}/api/ha/volume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id, volume })
    }).catch(() => {})
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'flex-end' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'var(--surface)', borderRadius:'20px 20px 0 0', width:'100%', maxHeight:'80vh', overflowY:'auto', paddingBottom:32, animation:'slideUp 0.22s ease' }}>
        <div style={{ padding:'18px 20px 12px', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--surface)' }}>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Cast to Speaker</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{track?.title}</div>
        </div>
        {loading && <div style={{ padding:32, textAlign:'center', color:'var(--muted)' }}>Loading speakers...</div>}
        {!loading && speakers.length === 0 && (
          <div style={{ padding:32, textAlign:'center', color:'var(--muted)' }}>No media players found</div>
        )}
        {speakers.map(s => {
          const isCasting = casting === s.entity_id
          const result = results[s.entity_id]
          const unavailable = s.state === 'unavailable'
          return (
            <div key={s.entity_id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <div className={unavailable ? '' : 'tappable'}
                onClick={() => !unavailable && !isCasting && cast(s.entity_id)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', opacity: unavailable ? 0.4 : 1 }}>
                <div style={{ width:34, height:34, borderRadius:8, background:'var(--card)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill={result==='ok' ? '#4caf50' : 'var(--accent)'}>
                    <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/>
                  </svg>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name}</div>
                  <div style={{ fontSize:11, marginTop:1, color: result==='ok'?'#4caf50' : result?'#f66' : s.state==='playing'?'var(--accent)':s.state==='idle'||s.state==='paused'?'#4caf50':'var(--muted)' }}>
                    {result==='ok' ? '✓ Playing' : result ? `✗ ${result}` : s.state}
                  </div>
                </div>
                {isCasting && <div style={{ width:16, height:16, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />}
              </div>
              {!unavailable && s.volume != null && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 20px 10px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--muted)"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                  <input type="range" min="0" max="1" step="0.02" defaultValue={s.volume}
                    onChange={e => setVolume(s.entity_id, parseFloat(e.target.value))}
                    style={{ flex:1, accentColor:'var(--accent)' }} />
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--muted)"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                </div>
              )}
            </div>
          )
        })}
        <div className="tappable" onClick={onClose}
          style={{ textAlign:'center', padding:14, color:'var(--muted)', fontSize:15, borderTop:'1px solid var(--border)', marginTop:4 }}>Cancel</div>
      </div>
    </div>
  )
}

// ── Full Screen Player ────────────────────────────────────────────────────────
function FullPlayer({ onClose }) {
  const { track, playing, progress, duration, loading, togglePlay, seek, playNext, playPrev } = usePlayer()
  const [showCast, setShowCast] = useState(false)
  const pct    = duration > 0 ? (progress / duration) * 100 : 0
  const imgUrl = track?.img ? api.imgUrl(track.img) : null

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'var(--bg)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Blurred background */}
      {imgUrl && (
        <div style={{ position:'absolute', inset:0, backgroundImage:`url(${imgUrl})`, backgroundSize:'cover', backgroundPosition:'center', filter:'blur(50px) brightness(0.25)', transform:'scale(1.15)', pointerEvents:'none' }} />
      )}

      <div style={{ position:'relative', flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 8px', flexShrink:0 }}>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.12)', borderRadius:'50%', width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
          </button>
          <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.6)', letterSpacing:1.5 }}>NOW PLAYING</span>
          <button onClick={() => setShowCast(true)} style={{ background:'rgba(255,255,255,0.12)', borderRadius:'50%', width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/>
            </svg>
          </button>
        </div>

        {/* Artwork */}
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', flex:1, padding:'8px 48px', minHeight:0 }}>
          <div style={{ width:'100%', maxWidth:280, aspectRatio:'1', borderRadius:18, overflow:'hidden', background:'var(--card)', boxShadow:'0 24px 64px rgba(0,0,0,0.7)', flexShrink:0 }}>
            {imgUrl
              ? <img src={imgUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:72 }}>🎵</div>
            }
          </div>
        </div>

        {/* Track info + controls - fixed bottom section */}
        <div style={{ flexShrink:0, padding:'0 28px 32px' }}>
          {/* Info */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:22, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track?.title || '—'}</div>
            <div style={{ fontSize:15, color:'rgba(255,255,255,0.55)', marginTop:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track?.artist || ''}</div>
          </div>

          {/* Scrub bar */}
          <div style={{ marginBottom:6 }}>
            <div style={{ height:4, background:'rgba(255,255,255,0.18)', borderRadius:2, cursor:'pointer', position:'relative' }}
              onClick={e => {
                if (!duration) return
                const r = e.currentTarget.getBoundingClientRect()
                seek(((e.clientX - r.left) / r.width) * duration)
              }}>
              <div style={{ height:'100%', background:'var(--accent)', borderRadius:2, width:`${pct}%`, transition:'width 0.4s linear' }} />
              <div style={{ position:'absolute', top:'50%', left:`${pct}%`, transform:'translate(-50%,-50%)', width:14, height:14, borderRadius:'50%', background:'var(--accent)', boxShadow:'0 0 8px rgba(200,168,75,0.9)', transition:'left 0.4s linear' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>{fmt(progress)}</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>{fmt(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:8 }}>
            <button onClick={playPrev} style={{ background:'transparent', border:'none', cursor:'pointer', padding:10 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </button>
            <button onClick={togglePlay} style={{ width:72, height:72, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer', boxShadow:'0 4px 24px rgba(200,168,75,0.6)', flexShrink:0 }}>
              {loading
                ? <div style={{ width:24, height:24, border:'3px solid #000', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                : playing
                  ? <svg width="26" height="26" viewBox="0 0 24 24" fill="#000"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  : <svg width="26" height="26" viewBox="0 0 24 24" fill="#000" style={{ marginLeft:3 }}><path d="M8 5v14l11-7z"/></svg>
              }
            </button>
            <button onClick={() => playNext()} style={{ background:'transparent', border:'none', cursor:'pointer', padding:10 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>
        </div>
      </div>

      {showCast && <CastModal track={track} onClose={() => setShowCast(false)} />}
    </div>
  )
}

// ── Mini Player Bar ───────────────────────────────────────────────────────────
export default function Player() {
  const { track, playing, progress, duration, loading, togglePlay, playNext } = usePlayer()
  const [expanded, setExpanded] = useState(false)
  const pct = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <>
      <div style={{ background:'var(--surface)', borderTop:'1px solid var(--border)' }}>
        {/* Thin progress bar */}
        <div style={{ height:3, background:'var(--border)', cursor: duration ? 'pointer' : 'default' }}>
          <div style={{ height:'100%', background:'var(--accent)', width:`${pct}%`, transition:'width 0.4s linear' }} />
        </div>
        {/* Bar content */}
        <div style={{ height:'calc(var(--player-height) - 3px)', display:'flex', alignItems:'center', gap:10, padding:'0 14px' }}>
          {/* Left: art + info — tap to expand */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0, cursor: track?'pointer':'default' }}
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
              {track?.artist && (
                <div style={{ fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track.artist}</div>
              )}
            </div>
          </div>
          {/* Right: play + next buttons */}
          {track && (
            <>
              <button onClick={e => { e.stopPropagation(); togglePlay() }}
                style={{ background:'transparent', border:'none', cursor:'pointer', padding:6, flexShrink:0, display:'flex', alignItems:'center' }}>
                {loading
                  ? <div style={{ width:22, height:22, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                  : playing
                    ? <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--accent)"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    : <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--accent)"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>
              <button onClick={e => { e.stopPropagation(); playNext() }}
                style={{ background:'transparent', border:'none', cursor:'pointer', padding:6, flexShrink:0, display:'flex', alignItems:'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
            </>
          )}
        </div>
      </div>
      {expanded && <FullPlayer onClose={() => setExpanded(false)} />}
    </>
  )
}
