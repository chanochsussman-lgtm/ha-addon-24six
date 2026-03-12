import React, { useState, useRef, useEffect } from 'react'
import { usePlayer } from '../store/index.jsx'
import { api } from '../api'
import CastModal from './CastModal'
import SpeakerDock from './SpeakerDock'

function fmt(s) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`
}

// ── Drag bar used for both seek and volume ───────────────────────────────────
function DragBar({ value, max=1, onChange, onCommit, height=5, accentColor='var(--accent)', children }) {
  const trackRef = useRef(null)
  const dragging = useRef(false)
  const pct = max > 0 ? Math.max(0, Math.min(1, value/max)) * 100 : 0

  const getVal = (e) => {
    const r = trackRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(max, ((e.clientX - r.left) / r.width) * max))
  }
  const onPD = (e) => { e.stopPropagation(); dragging.current=true; trackRef.current.setPointerCapture(e.pointerId); onChange(getVal(e)) }
  const onPM = (e) => { if (dragging.current) onChange(getVal(e)) }
  const onPU = (e) => { if (!dragging.current) return; dragging.current=false; const v=getVal(e); onChange(v); onCommit?.(v) }

  return (
    <div ref={trackRef}
      onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU}
      style={{ position:'relative', height:Math.max(height,28), display:'flex', alignItems:'center', cursor:'pointer', touchAction:'none', userSelect:'none' }}>
      <div style={{ width:'100%', height, background:'rgba(255,255,255,0.15)', borderRadius:height/2, overflow:'hidden', pointerEvents:'none' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:accentColor, borderRadius:height/2 }} />
      </div>
      <div style={{ position:'absolute', left:`${pct}%`, top:'50%', transform:'translate(-50%,-50%)', width:14, height:14, borderRadius:'50%', background:accentColor, boxShadow:`0 0 6px ${accentColor}99`, pointerEvents:'none' }} />
      {children}
    </div>
  )
}

// ── Volume bar with mute button ─────────────────────────────────────────────
function VolumeBar({ volume, muted, applyVolume, toggleMute, activeSpeakerName, onOpenDock }) {
  const pct = Math.round(volume * 100)
  const onWheel = (e) => { e.preventDefault(); applyVolume(volume + (e.deltaY < 0 ? 0.05 : -0.05)) }

  return (
    <div style={{ marginTop:20 }} onWheel={onWheel}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {/* Mute button */}
          <button onClick={toggleMute} style={{ background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', alignItems:'center', opacity: muted ? 1 : 0.5 }}>
            {muted
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)"><path resp_player="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path resp_player="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            }
          </button>
          {/* Speaker name — tappable, opens dock */}
          <button onClick={onOpenDock} style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:6, display:'flex', alignItems:'center', gap:5,
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
              <path resp_player="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2C12 14.36 7.05 10 1 10z"/>
            </svg>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:0.8 }}>
              {muted ? 'MUTED — ' : ''}{activeSpeakerName}
            </span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)"><path resp_player="M7 10l5 5 5-5z"/></svg>
          </button>
        </div>
        <span style={{ fontSize:12, color: muted ? 'var(--muted)' : 'var(--accent)', fontWeight:700 }}>
          {muted ? 'muted' : `${pct}%`}
        </span>
      </div>
      <DragBar value={muted ? 0 : volume} max={1} height={5}
        accentColor={muted ? 'var(--muted)' : 'var(--accent)'}
        onChange={v => { if (!muted) applyVolume(v) }}
        onCommit={v => { if (!muted) applyVolume(v) }}
      />
    </div>
  )
}


// ── Inline speaker strip (always visible in full player) ─────────────────────
function InlineSpeakerStrip() {
  const [speakers, setSpeakers]   = useState([])
  const [expanded, setExpanded]   = useState(false)
  const { track, playing, progress, activeSpeaker, setCastTarget, applyVolume } = usePlayer()
  const base = window.ingressPath || ''

  useEffect(() => {
    fetch(`${base}/api/ha/speakers`)
      .then(r => r.json())
      .then(resp_player => setSpeakers(Array.isArray(resp_player) ? resp_player : resp_player?.speakers || []))
      .catch(() => {})
  }, [])

  // Poll every 10s
  useEffect(() => {
    const t = setInterval(() => {
      fetch(`${base}/api/ha/speakers`)
        .then(r => r.json())
        .then(resp_player => setSpeakers(Array.isArray(resp_player) ? resp_player : resp_player?.speakers || []))
        .catch(() => {})
    }, 10000)
    return () => clearInterval(t)
  }, [])

  const castTo = async (sp) => {
    setCastTarget(sp.entity_id, sp.name)
    if (track) {
      // Sync: send current track + seek position
      await fetch(`${base}/api/ha/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: sp.entity_id,
          content_id: track.id,
          content_type: 'music',
          position: Math.floor(progress || 0),
        })
      }).catch(() => {})
    }
  }

  const setVol = async (entityId, vol) => {
    if (entityId === 'local') { applyVolume(vol); return }
    await fetch(`${base}/api/ha/volume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: entityId, volume_level: vol })
    }).catch(() => {})
  }

  const allSpeakers = [
    { entity_id: 'local', name: 'This Device', state: playing ? 'playing' : 'paused', volume_level: null },
    ...speakers
  ]

  const PREVIEW = 2  // show 2 speakers collapsed, expand to show all
  const shown = expanded ? allSpeakers : allSpeakers.slice(0, PREVIEW)

  return (
    <div style={{ marginTop:16, borderTop:'1px solid var(--border)', paddingTop:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.8 }}>Speakers</span>
        {allSpeakers.length > PREVIEW && (
          <button onClick={() => setExpanded(e=>!e)}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent)', fontSize:11, padding:0 }}>
            {expanded ? 'Show less ▲' : `+${allSpeakers.length - PREVIEW} more ▼`}
          </button>
        )}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {shown.map(sp => {
          const isActive = activeSpeaker ? sp.entity_id === activeSpeaker : sp.entity_id === 'local'
          return (
            <div key={sp.entity_id}
              style={{ background: isActive ? 'rgba(200,168,75,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius:10, padding:'10px 12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:30, height:30, borderRadius:7, background: isActive ? 'rgba(200,168,75,0.15)' : 'rgba(255,255,255,0.06)',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill={isActive ? 'var(--accent)' : 'rgba(255,255,255,0.4)'}>
                    {sp.entity_id === 'local'
                      ? <path resp_player="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                      : <path resp_player="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2C12 14.36 7.05 10 1 10z"/>
                    }
                  </svg>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight: isActive?600:400, color: isActive?'var(--accent)':'var(--text)',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sp.name}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:1 }}>
                    {sp.state === 'playing' ? '▶ Playing' : sp.state === 'paused' ? '⏸ Paused' : sp.state || 'Idle'}
                  </div>
                </div>
                {!isActive && (
                  <button onClick={() => castTo(sp)}
                    style={{ background:'var(--accent)', color:'#000', fontSize:10, fontWeight:700,
                      padding:'4px 10px', borderRadius:8, border:'none', cursor:'pointer', flexShrink:0 }}>
                    CAST
                  </button>
                )}
                {isActive && (
                  <span style={{ fontSize:9, background:'var(--accent)', color:'#000', fontWeight:700,
                    padding:'2px 7px', borderRadius:8, flexShrink:0 }}>ACTIVE</span>
                )}
              </div>
              {/* Volume slider */}
              {sp.state !== 'off' && sp.state !== 'unavailable' && (
                <SpeakerVolumeSlider
                  entityId={sp.entity_id}
                  initial={sp.volume_level}
                  onChange={setVol}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SpeakerVolumeSlider({ entityId, initial, onChange }) {
  const { volume } = usePlayer()
  const [val, setVal] = useState(
    entityId === 'local' ? Math.round(volume * 100) : Math.round((initial ?? 0.5) * 100)
  )
  const debounce = useRef(null)

  // Keep local slider in sync with store volume
  useEffect(() => {
    if (entityId === 'local') setVal(Math.round(volume * 100))
  }, [volume, entityId])

  const handle = (v) => {
    setVal(v)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => onChange(entityId, v / 100), 250)
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
        <path resp_player="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
      </svg>
      <input type="range" min="0" max="100" value={val}
        onChange={e => handle(Number(e.target.value))}
        style={{ flex:1, accentColor:'var(--accent)', cursor:'pointer' }}
      />
      <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)', minWidth:26, textAlign:'right' }}>{val}%</span>
    </div>
  )
}

// ── Full-screen player ───────────────────────────────────────────────────────
function FullPlayer({ onClose }) {
  const { track, playing, progress, duration, loading, togglePlay, seek,
          playNext, playPrev, volume, muted, activeSpeakerName, applyVolume, toggleMute, queue, qIdx } = usePlayer()
  const [showCast, setShowCast] = useState(false)
  const [showDock, setShowDock] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const pct = duration > 0 ? (progress/duration)*100 : 0
  const imgUrl = track?.img ? api.imgUrl(track.img) : null

  // PC keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName==='INPUT') return
      if (e.code==='Space')      { e.preventDefault(); togglePlay() }
      if (e.code==='ArrowRight') { e.preventDefault(); seek(Math.min(progress+10, duration)) }
      if (e.code==='ArrowLeft')  { e.preventDefault(); seek(Math.max(progress-10, 0)) }
      if (e.code==='ArrowUp')    { e.preventDefault(); applyVolume(volume+0.05) }
      if (e.code==='ArrowDown')  { e.preventDefault(); applyVolume(volume-0.05) }
      if (e.code==='KeyM')       { e.preventDefault(); toggleMute() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, seek, applyVolume, toggleMute, progress, duration, volume])

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'var(--bg)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {imgUrl && <div style={{ position:'absolute', inset:0, backgroundImage:`url(${imgUrl})`, backgroundSize:'cover', backgroundPosition:'center', filter:'blur(50px) brightness(0.2)', transform:'scale(1.2)', pointerEvents:'none' }} />}

      <div style={{ position:'relative', flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 8px', flexShrink:0 }}>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.12)', borderRadius:'50%', width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path resp_player="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
          </button>
          <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:1.8, textTransform:'uppercase' }}>Now Playing</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setShowQueue(q => !q)} style={{ background: showQueue?'rgba(200,168,75,0.25)':'rgba(255,255,255,0.12)', borderRadius:'50%', width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="white"><path resp_player="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/></svg>
            </button>
            <button onClick={() => setShowCast(true)} style={{ background:'rgba(255,255,255,0.12)', borderRadius:'50%', width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="white"><path resp_player="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/></svg>
            </button>
          </div>
        </div>

        {/* Queue panel */}
        {showQueue && (
          <div style={{ position:'absolute', top:64, left:0, right:0, bottom:0, background:'rgba(13,13,15,0.97)', zIndex:10, overflowY:'auto', padding:'8px 0 32px' }}>
            <div style={{ padding:'8px 20px 12px', fontSize:13, fontWeight:700, color:'var(--accent)', letterSpacing:0.5 }}>QUEUE — {queue.length} tracks</div>
            {queue.map((t,i) => (
              <div key={t.id||i} onClick={() => { /* play from queue */ }}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', background:i===qIdx?'rgba(200,168,75,0.1)':'transparent', cursor:'pointer' }}>
                <div style={{ width:38, height:38, borderRadius:6, overflow:'hidden', background:'var(--card)', flexShrink:0 }}>
                  {t.img && <img src={api.imgUrl(t.img)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:i===qIdx?700:400, color:i===qIdx?'var(--accent)':'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.title}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.artist}</div>
                </div>
                {i === qIdx && <span style={{ fontSize:12, color:'var(--accent)' }}>♪</span>}
              </div>
            ))}
          </div>
        )}

        {/* Artwork */}
        <div style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center', padding:'4px 48px', minHeight:0 }}>
          <div style={{ width:'100%', maxWidth:290, aspectRatio:'1', borderRadius:18, overflow:'hidden', background:'var(--card)', boxShadow:'0 28px 72px rgba(0,0,0,0.75)' }}>
            {imgUrl
              ? <img src={imgUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:72 }}>🎵</div>
            }
          </div>
        </div>

        {/* Controls */}
        <div style={{ flexShrink:0, padding:'4px 28px 32px' }}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:22, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track?.title||'—'}</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)', marginTop:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track?.artist||''}</div>
          </div>

          {/* Seek bar — swipeable via DragBar */}
          <div style={{ marginBottom:16 }}>
            <DragBar value={progress} max={duration||1} height={4}
              onChange={v => {}} // live update via audio events
              onCommit={v => seek(v)}
            />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{fmt(progress)}</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{fmt(duration)}</span>
            </div>
          </div>

          {/* Playback buttons */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0 }}>
            <button onClick={playPrev} style={{ flex:1, background:'transparent', border:'none', cursor:'pointer', display:'flex', justifyContent:'center', padding:12 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)"><path resp_player="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </button>
            <button onClick={togglePlay} style={{ width:72, height:72, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer', boxShadow:'0 4px 28px rgba(200,168,75,0.55)', flexShrink:0 }}>
              {loading
                ? <div style={{ width:24, height:24, border:'3px solid #000', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                : playing
                  ? <svg width="28" height="28" viewBox="0 0 24 24" fill="#000"><path resp_player="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  : <svg width="28" height="28" viewBox="0 0 24 24" fill="#000" style={{ marginLeft:3 }}><path resp_player="M8 5v14l11-7z"/></svg>
              }
            </button>
            <button onClick={() => playNext()} style={{ flex:1, background:'transparent', border:'none', cursor:'pointer', display:'flex', justifyContent:'center', padding:12 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)"><path resp_player="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>

          <VolumeBar volume={volume} muted={muted} applyVolume={applyVolume} toggleMute={toggleMute} activeSpeakerName={activeSpeakerName} onOpenDock={() => setShowDock(true)} />

          {/* Always-visible speaker strip */}
          <InlineSpeakerStrip />
        </div>
      </div>

      {showCast && <CastModal track={track} onClose={() => setShowCast(false)} />}
      {showDock && <SpeakerDock onClose={() => setShowDock(false)} />}
    </div>
  )
}

// ── Mini bar ─────────────────────────────────────────────────────────────────
export default function Player() {
  const { track, playing, progress, duration, loading, togglePlay, playNext } = usePlayer()
  const [expanded, setExpanded] = useState(false)
  const pct = duration > 0 ? (progress/duration)*100 : 0

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
                    ? <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--accent)"><path resp_player="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    : <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--accent)"><path resp_player="M8 5v14l11-7z"/></svg>
                }
              </button>
              <button onClick={e => { e.stopPropagation(); playNext() }}
                style={{ background:'transparent', border:'none', cursor:'pointer', padding:8, flexShrink:0, display:'flex', alignItems:'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--text-secondary)"><path resp_player="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
            </>
          )}
        </div>
      </div>
      {expanded && <FullPlayer onClose={() => setExpanded(false)} />}
    </>
  )
}
