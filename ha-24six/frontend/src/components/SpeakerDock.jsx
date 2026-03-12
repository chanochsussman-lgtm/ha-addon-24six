import React, { useEffect, useState, useRef, useCallback } from 'react'
import { usePlayer } from '../store/index.jsx'
import { api } from '../api'

// Volume slider for a single speaker card
function SpeakerVolume({ entityId, initialVol, onVolumeChange }) {
  const [vol, setVol] = useState(Math.round((initialVol || 0) * 100))
  const debounce = useRef(null)

  const onChange = (v) => {
    setVol(v)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => onVolumeChange(entityId, v / 100), 300)
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
      </svg>
      <input type="range" min="0" max="100" value={vol}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex:1, accentColor:'var(--accent)', height:3, cursor:'pointer' }}
      />
      <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)', minWidth:26, textAlign:'right' }}>{vol}%</span>
    </div>
  )
}

// Single speaker card
function SpeakerCard({ speaker, isActive, isCasting, onSelect, onVolume }) {
  const stateLabel = {
    playing: '▶ Playing',
    paused:  '⏸ Paused',
    idle:    'Idle',
    off:     'Off',
  }[speaker.state] || speaker.state || 'Unknown'

  const stateColor = speaker.state === 'playing' ? 'var(--accent)'
                   : speaker.state === 'paused'  ? 'rgba(255,255,255,0.5)'
                   : 'rgba(255,255,255,0.25)'

  return (
    <div
      onClick={() => onSelect(speaker)}
      style={{
        background: isActive ? 'rgba(200,168,75,0.12)' : 'var(--card)',
        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        userSelect: 'none',
      }}>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {/* Speaker icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink:0,
          background: isActive ? 'rgba(200,168,75,0.2)' : 'rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', justifyContent:'center'
        }}>
          {isCasting
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--accent)">
                <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2C12 14.36 7.05 10 1 10z"/>
              </svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
                <path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 20c-.83 0-1.5-.67-1.5-1.5S11.17 19 12 19s1.5.67 1.5 1.5S12.83 22 12 22zm5-4H7V4h10v14z"/>
              </svg>
          }
        </div>
        {/* Name + state */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontSize: 13, fontWeight: isActive ? 600 : 400,
            color: isActive ? 'var(--accent)' : 'var(--text)',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'
          }}>
            {speaker.name}
          </div>
          <div style={{ fontSize:11, color: stateColor, marginTop:1 }}>
            {isCasting ? '● Casting 24Six' : stateLabel}
            {speaker.media_title && speaker.state === 'playing' && !isCasting && (
              <span style={{ color:'rgba(255,255,255,0.3)' }}> — {speaker.media_title}</span>
            )}
          </div>
        </div>
        {/* Cast / active badge */}
        {isActive && (
          <div style={{ fontSize:10, background:'var(--accent)', color:'#000', fontWeight:700,
            padding:'2px 7px', borderRadius:10, flexShrink:0 }}>
            ACTIVE
          </div>
        )}
      </div>
      {/* Volume slider — only if speaker is reachable */}
      {speaker.state !== 'off' && speaker.state !== 'unavailable' && (
        <SpeakerVolume
          entityId={speaker.entity_id}
          initialVol={speaker.volume_level ?? 0.5}
          onVolumeChange={onVolume}
        />
      )}
    </div>
  )
}

// The full dock panel
export default function SpeakerDock({ onClose }) {
  const [speakers, setSpeakers] = useState([])
  const [loading,  setLoading]  = useState(true)
  const { track, playing, activeSpeaker, setCastTarget } = usePlayer()
  const base = window.ingressPath || ''

  const load = useCallback(() => {
    fetch(`${base}/api/ha/speakers`)
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (Array.isArray(d?.speakers) ? d.speakers : [])
        setSpeakers(list)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [base])

  useEffect(() => { load() }, [load])

  // Poll speaker states every 8s while dock is open
  useEffect(() => {
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [load])

  const handleSelect = async (speaker) => {
    if (speaker.entity_id === activeSpeaker) return // already active
    if (speaker.entity_id === 'local') {
      setCastTarget(null, 'This Device')
    } else {
      setCastTarget(speaker.entity_id, speaker.name)
      // Cast current track if playing
      if (track) {
        await fetch(`${base}/api/ha/play`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity_id: speaker.entity_id, content_id: track.id, content_type: 'music' })
        }).catch(() => {})
      }
    }
    onClose?.()
  }

  const handleVolume = async (entityId, vol) => {
    if (entityId === 'local') return // handled by main volume bar
    await fetch(`${base}/api/ha/volume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: entityId, volume_level: vol })
    }).catch(() => {})
  }

  // Add "This Device" as first entry
  const allSpeakers = [
    { entity_id: 'local', name: 'This Device', state: playing ? 'playing' : 'paused',
      volume_level: null, media_title: track?.title },
    ...speakers
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)' }} />

      {/* Panel */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--surface)', borderRadius:'20px 20px 0 0',
        padding: '16px 16px 32px', maxHeight: '70vh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ width:36, height:4, background:'var(--border)', borderRadius:2, margin:'0 auto 16px' }} />

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <span style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>Speakers</span>
          <button onClick={load} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent)', fontSize:12, padding:'4px 8px' }}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
            <div style={{ width:24, height:24, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {allSpeakers.map(sp => (
              <SpeakerCard
                key={sp.entity_id}
                speaker={sp}
                isActive={activeSpeaker ? sp.entity_id === activeSpeaker : sp.entity_id === 'local'}
                isCasting={sp.entity_id !== 'local' && sp.entity_id === activeSpeaker}
                onSelect={handleSelect}
                onVolume={handleVolume}
              />
            ))}
            {allSpeakers.length === 1 && (
              <div style={{ padding:24, textAlign:'center', color:'var(--muted)', fontSize:13 }}>
                No HA speakers found.<br/>Make sure Home Assistant is connected.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
