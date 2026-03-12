import React, { useState } from 'react'
import { usePlayer } from '../store/index.jsx'
import { api } from '../api'
import CastModal from './CastModal'

function fmt(s) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`
}

function FullPlayer({ onClose }) {
  const { track, playing, progress, duration, loading, togglePlay, seek, playNext, playPrev, volume, activeSpeakerName, applyVolume } = usePlayer()
  const [showCast, setShowCast] = useState(false)
  const pct    = duration > 0 ? (progress / duration) * 100 : 0
  const imgUrl = track?.img ? api.imgUrl(track.img) : null

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'var(--bg)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {imgUrl && (
        <div style={{ position:'absolute', inset:0, backgroundImage:`url(${imgUrl})`, backgroundSize:'cover', backgroundPosition:'center', filter:'blur(50px) brightness(0.22)', transform:'scale(1.2)', pointerEvents:'none' }} />
      )}
      <div style={{ position:'relative', flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 8px', flexShrink:0 }}>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.12)', borderRadius:'50%', width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
          </button>
          <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:1.8, textTransform:'uppercase' }}>Now Playing</span>
          <button onClick={() => setShowCast(true)} style={{ background:'rgba(255,255,255,0.12)', borderRadius:'50%', width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="white">
              <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/>
            </svg>
          </button>
        </div>

        {/* Artwork — flex fills remaining space */}
        <div style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center', padding:'4px 48px', minHeight:0 }}>
          <div style={{ width:'100%', maxWidth:290, aspectRatio:'1', borderRadius:18, overflow:'hidden', background:'var(--card)', boxShadow:'0 28px 72px rgba(0,0,0,0.75)', flexShrink:0 }}>
            {imgUrl
              ? <img src={imgUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:72 }}>🎵</div>
            }
          </div>
        </div>

        {/* Bottom controls — fixed height, never cut off */}
        <div style={{ flexShrink:0, padding:'4px 28px 36px' }}>
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:22, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track?.title || '—'}</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)', marginTop:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track?.artist || ''}</div>
          </div>

          {/* Scrub */}
          <div style={{ marginBottom:20 }}>
            <div style={{ height:4, background:'rgba(255,255,255,0.15)', borderRadius:2, cursor:'pointer', position:'relative' }}
              onClick={e => {
                if (!duration) return
                const r = e.currentTarget.getBoundingClientRect()
                seek(((e.clientX - r.left) / r.width) * duration)
              }}>
              <div style={{ height:'100%', background:'var(--accent)', borderRadius:2, width:`${pct}%`, transition:'width 0.35s linear' }} />
              <div style={{ position:'absolute', top:'50%', left:`${pct}%`, transform:'translate(-50%,-50%)', width:14, height:14, borderRadius:'50%', background:'var(--accent)', boxShadow:'0 0 8px rgba(200,168,75,0.9)', transition:'left 0.35s linear', pointerEvents:'none' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{fmt(progress)}</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{fmt(duration)}</span>
            </div>
          </div>

          {/* Playback controls */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0 }}>
            <button onClick={playPrev} style={{ flex:1, background:'transparent', border:'none', cursor:'pointer', display:'flex', justifyContent:'center', padding:12 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </button>
            <button onClick={togglePlay} style={{ width:72, height:72, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer', boxShadow:'0 4px 28px rgba(200,168,75,0.55)', flexShrink:0 }}>
              {loading
                ? <div style={{ width:24, height:24, border:'3px solid #000', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                : playing
                  ? <svg width="28" height="28" viewBox="0 0 24 24" fill="#000"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  : <svg width="28" height="28" viewBox="0 0 24 24" fill="#000" style={{ marginLeft:3 }}><path d="M8 5v14l11-7z"/></svg>
              }
            </button>
            <button onClick={() => playNext()} style={{ flex:1, background:'transparent', border:'none', cursor:'pointer', display:'flex', justifyContent:'center', padding:12 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>

          {/* Volume bar — reflects hw key changes */}
          <div style={{ marginTop:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:0.8 }}>Volume · {activeSpeakerName}</span>
              <span style={{ fontSize:11, color:'var(--accent)', fontWeight:700 }}>{Math.round(volume*100)}%</span>
            </div>
            <div style={{ position:'relative', height:4, background:'rgba(255,255,255,0.15)', borderRadius:2, cursor:'pointer' }}
              onClick={e => {
                const r=e.currentTarget.getBoundingClientRect()
                applyVolume((e.clientX-r.left)/r.width)
              }}>
              <div style={{ height:'100%', background:'var(--accent)', borderRadius:2, width:`${volume*100}%`, transition:'width 0.1s' }} />
            </div>
          </div>
        </div>
      </div>

      {showCast && <CastModal track={track} onClose={() => setShowCast(false)} />}
    </div>
  )
}

export default function Player() {
  const { track, playing, progress, duration, loading, togglePlay, playNext } = usePlayer()
  const [expanded, setExpanded] = useState(false)
  const pct = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <>
      <div style={{ background:'var(--surface)', borderTop:'1px solid var(--border)' }}>
        <div style={{ height:3, background:'var(--border)' }}>
          <div style={{ height:'100%', background:'var(--accent)', width:`${pct}%`, transition:'width 0.35s linear' }} />
        </div>
        <div style={{ height:'calc(var(--player-height) - 3px)', display:'flex', alignItems:'center', gap:10, padding:'0 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0, cursor:track?'pointer':'default' }}
            onClick={() => track && setExpanded(true)}>
            <div style={{ width:42, height:42, borderRadius:8, flexShrink:0, background:'var(--card)', overflow:'hidden' }}>
              {track?.img
                ? <img src={api.imgUrl(track.img)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🎵</div>
              }
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:track?'var(--text)':'var(--muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {track?.title || 'No track playing'}
              </div>
              {track?.artist && <div style={{ fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track.artist}</div>}
            </div>
          </div>
          {track && (
            <>
              <button onClick={e => { e.stopPropagation(); togglePlay() }}
                style={{ background:'transparent', border:'none', cursor:'pointer', padding:8, flexShrink:0, display:'flex', alignItems:'center' }}>
                {loading
                  ? <div style={{ width:22, height:22, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                  : playing
                    ? <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--accent)"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    : <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--accent)"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>
              <button onClick={e => { e.stopPropagation(); playNext() }}
                style={{ background:'transparent', border:'none', cursor:'pointer', padding:8, flexShrink:0, display:'flex', alignItems:'center' }}>
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
