import React, { useState, useEffect, useRef, useCallback } from 'react'
import { usePlayer } from '../store/index.jsx'

const b = () => window.ingressPath || ''

function detectFormat(speaker) {
  const id   = (speaker.entity_id || '').toLowerCase()
  const plat = (speaker.platform  || '').toLowerCase()
  if (id.includes('wiim')  || plat.includes('linkplay'))  return { label:'WiiM',        color:'#4fc3f7' }
  if (id.includes('sonos') || plat.includes('sonos'))     return { label:'Sonos',        color:'#00e5ff' }
  if (id.includes('google')|| id.includes('chromecast')  || plat.includes('cast')) return { label:'Chromecast', color:'#34a853' }
  if (id.includes('alexa') || id.includes('echo'))        return { label:'Alexa',        color:'#00b0ca' }
  if (id.includes('airplay')|| plat.includes('airplay'))  return { label:'AirPlay',      color:'#a78bfa' }
  if (plat.includes('dlna') || plat.includes('upnp'))     return { label:'DLNA',         color:'#fbbf24' }
  if (id.includes('spotify')|| plat.includes('spotify'))  return { label:'Spotify',      color:'#1db954' }
  return { label: plat || 'HA Player', color:'#9a9ba6' }
}

// ── Drag-safe volume slider ──────────────────────────────────────────────────
// Uses pointer capture so dragging outside the element still works,
// and doesn't fight with the scroll container.
function VolumeSlider({ value, onChange, onCommit, label, disabled }) {
  const trackRef  = useRef(null)
  const dragging  = useRef(false)
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)

  const getVal = (e) => {
    const r = trackRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
  }

  const onPointerDown = (e) => {
    if (disabled) return
    e.stopPropagation()
    dragging.current = true
    trackRef.current.setPointerCapture(e.pointerId)
    const v = getVal(e); onChange(v)
  }
  const onPointerMove = (e) => {
    if (!dragging.current) return
    e.stopPropagation()
    onChange(getVal(e))
  }
  const onPointerUp = (e) => {
    if (!dragging.current) return
    e.stopPropagation()
    dragging.current = false
    const v = getVal(e); onChange(v); onCommit(v)
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'2px 0', userSelect:'none' }}>
      {label && <span style={{ fontSize:11, color:'var(--muted)', flexShrink:0, width:72, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--muted)" style={{ flexShrink:0 }}><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
      {/* Track */}
      <div ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ flex:1, height:20, display:'flex', alignItems:'center', cursor: disabled?'default':'pointer', touchAction:'none' }}>
        <div style={{ width:'100%', height:4, background:'rgba(255,255,255,0.12)', borderRadius:2, position:'relative' }}>
          <div style={{ height:'100%', background: disabled?'var(--border)':'var(--accent)', borderRadius:2, width:`${pct}%`, pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:'50%', left:`${pct}%`, transform:'translate(-50%,-50%)', width:14, height:14, borderRadius:'50%', background: disabled?'var(--muted)':'var(--accent)', boxShadow: disabled?'none':'0 0 6px rgba(200,168,75,0.7)', pointerEvents:'none' }} />
        </div>
      </div>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--muted)" style={{ flexShrink:0 }}><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
      <span style={{ fontSize:11, color: disabled?'var(--muted)':'var(--accent)', width:32, textAlign:'right', fontWeight:600, flexShrink:0 }}>{pct}%</span>
    </div>
  )
}

export default function CastModal({ track, onClose }) {
  const { volume, activeSpeaker, applyVolume, setCastTarget } = usePlayer()

  const [tab,         setTab]         = useState('speakers')
  const [speakers,    setSpeakers]    = useState([])
  const [prefs,       setPrefs]       = useState({})
  const [presets,     setPresets]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [casting,     setCasting]     = useState(null)
  const [results,     setResults]     = useState({})
  const [speakerVols, setSpeakerVols] = useState({})
  const volTimers = useRef({})

  useEffect(() => {
    Promise.all([
      fetch(`${b()}/api/ha/speakers`).then(r=>r.json()).catch(()=>[]),
      fetch(`${b()}/api/ha/speaker-prefs`).then(r=>r.json()).catch(()=>({})),
      fetch(`${b()}/api/ha/presets`).then(r=>r.json()).catch(()=>[]),
    ]).then(([sp, pr, ps]) => {
      const spArr = Array.isArray(sp) ? sp : []
      spArr.sort((a,z) => {
        const r = s => s==='playing'?0:s==='idle'||s==='paused'?1:s==='off'?2:3
        return r(a.state)-r(z.state)
      })
      setSpeakers(spArr)
      setPrefs(pr||{})
      setPresets(Array.isArray(ps)?ps:[])
      const vols={}; spArr.forEach(s => { if(s.volume!=null) vols[s.entity_id]=s.volume })
      setSpeakerVols(vols)
      setLoading(false)
    })
  }, [])

  // When store volume changes and this speaker is active, sync its slider
  useEffect(() => {
    if (activeSpeaker && activeSpeaker !== 'local') {
      setSpeakerVols(v => ({ ...v, [activeSpeaker]: volume }))
    }
  }, [volume, activeSpeaker])

  const setHAVolume = useCallback((entity_id, vol) => {
    setSpeakerVols(v => ({ ...v, [entity_id]: vol }))
    clearTimeout(volTimers.current[entity_id])
    volTimers.current[entity_id] = setTimeout(() => {
      fetch(`${b()}/api/ha/volume`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ entity_id, volume: vol })
      }).catch(()=>{})
    }, 80)
  }, [])

  const castTo = async (entity_id, speakerName) => {
    setCasting(entity_id)
    try {
      const r = await fetch(`${b()}/api/ha/play`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ entity_id, track_id:track.id, track_title:track.title })
      })
      const d = await r.json()
      if (d.ok) {
        setResults(prev => ({ ...prev, [entity_id]:'ok' }))
        setCastTarget(entity_id, speakerName)
        setHAVolume(entity_id, volume)
      } else {
        setResults(prev => ({ ...prev, [entity_id]: d.error||'error' }))
      }
    } catch { setResults(prev => ({ ...prev, [entity_id]:'error' })) }
    setCasting(null)
  }

  const castPreset = async (preset) => {
    setCasting(preset.id)
    try {
      const r = await fetch(`${b()}/api/ha/presets/${preset.id}/play`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ track_id:track.id, track_title:track.title })
      })
      const d = await r.json()
      if (d.ok) {
        setResults(prev => ({ ...prev, [preset.id]:'ok' }))
        const firstId = preset.entity_ids[0]
        const firstName = speakers.find(s=>s.entity_id===firstId)?.name || preset.name
        setCastTarget(firstId, `${preset.name} (group)`)
        setHAVolume(firstId, volume)
      } else {
        setResults(prev => ({ ...prev, [preset.id]:'error' }))
      }
    } catch { setResults(prev => ({ ...prev, [preset.id]:'error' })) }
    setCasting(null)
  }

  const setPresetVolume = useCallback((preset, vol) => {
    clearTimeout(volTimers.current[preset.id])
    volTimers.current[preset.id] = setTimeout(() => {
      fetch(`${b()}/api/ha/presets/${preset.id}/volume`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ volume: vol })
      }).catch(()=>{})
      preset.entity_ids.forEach(id => setSpeakerVols(v => ({ ...v, [id]: vol })))
    }, 80)
  }, [])

  // Only show speakers that are NOT hidden in prefs and not unavailable
  const visible = speakers.filter(s =>
    !prefs[s.entity_id]?.hidden &&
    s.state !== 'unavailable'
  )

  const Badge = ({ fmt }) => (
    <span style={{ fontSize:9, fontWeight:700, color:fmt.color, background:`${fmt.color}22`, padding:'2px 6px', borderRadius:4, letterSpacing:0.4, flexShrink:0 }}>{fmt.label}</span>
  )

  const CastBtn = ({ id, onCast }) => {
    const isCasting = casting===id
    const result    = results[id]
    const isActive  = activeSpeaker===id
    return (
      <button
        onClick={e => { e.stopPropagation(); if(!isCasting) onCast() }}
        style={{ flexShrink:0, width:36, height:36, borderRadius:8,
          border: isActive?'2px solid var(--accent)':'1px solid var(--border)',
          cursor: isCasting?'wait':'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          background: result==='ok'||isActive ? 'rgba(200,168,75,0.15)' : result==='error' ? 'rgba(220,50,50,0.15)' : 'var(--card)' }}>
        {isCasting
          ? <div style={{ width:14, height:14, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
          : result==='error'
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="#f66"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill={result==='ok'||isActive?'var(--accent)':'var(--muted)'}>
                <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/>
              </svg>
        }
      </button>
    )
  }

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'flex-end' }}
      onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'var(--surface)', borderRadius:'20px 20px 0 0', width:'100%', maxHeight:'85vh',
          display:'flex', flexDirection:'column', animation:'slideUp 0.22s ease',
          /* Prevent the container itself from scrolling under pointer events */
          overflow:'hidden' }}>

        {/* ── Fixed header ── */}
        <div style={{ flexShrink:0, padding:'16px 20px 0', borderBottom:'1px solid var(--border)' }}>
          {/* Title row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Play On</div>
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{track?.title}</div>
            </div>
            <button onClick={onClose}
              style={{ background:'rgba(255,255,255,0.1)', borderRadius:'50%', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>

          {/* Active speaker + volume */}
          <div style={{ background:'var(--card)', borderRadius:10, padding:'10px 14px', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', display:'flex', alignItems:'center', gap:6 }}>
                🔊 {activeSpeaker==='local' ? 'This Device' : speakers.find(s=>s.entity_id===activeSpeaker)?.name || activeSpeaker}
                <span style={{ fontSize:10, color:'var(--accent)', fontWeight:700 }}>● ACTIVE</span>
              </div>
              <span style={{ fontSize:10, color:'var(--muted)' }}>drag to adjust</span>
            </div>
            <VolumeSlider
              value={activeSpeaker==='local' ? volume : (speakerVols[activeSpeaker]??volume)}
              onChange={v => {
                if (activeSpeaker==='local') applyVolume(v)
                else { setSpeakerVols(sv=>({...sv,[activeSpeaker]:v})); applyVolume(v) }
              }}
              onCommit={v => {
                applyVolume(v)
                if (activeSpeaker!=='local') setHAVolume(activeSpeaker, v)
              }}
            />
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:0, marginBottom:-1 }}>
            {['speakers','groups'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex:1, padding:'10px 0', border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                  background:'transparent',
                  color: tab===t ? 'var(--accent)' : 'var(--muted)',
                  borderBottom: tab===t ? '2px solid var(--accent)' : '2px solid transparent' }}>
                {t==='speakers' ? `Speakers (${visible.length})` : `Groups (${presets.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable list — touch-action:pan-y so scroll works but slider drags work too ── */}
        <div style={{ flex:1, overflowY:'auto', touchAction:'pan-y' }}>
          {loading && <div style={{ padding:32, textAlign:'center', color:'var(--muted)' }}>Loading...</div>}

          {/* LOCAL */}
          {!loading && tab==='speakers' && (
            <div style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px 6px' }}>
                <div style={{ width:36, height:36, borderRadius:8, background:'var(--card)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="#a78bfa"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>This Device</div>
                  <div style={{ display:'flex', gap:6, marginTop:2, alignItems:'center' }}>
                    <Badge fmt={{ label:'Local', color:'#a78bfa' }} />
                    {activeSpeaker==='local' && <span style={{ fontSize:10, color:'var(--accent)', fontWeight:700 }}>● ACTIVE</span>}
                  </div>
                </div>
                <button onClick={() => setCastTarget('local','This Device')}
                  style={{ flexShrink:0, width:36, height:36, borderRadius:8,
                    border: activeSpeaker==='local'?'2px solid var(--accent)':'1px solid var(--border)',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                    background: activeSpeaker==='local'?'rgba(200,168,75,0.15)':'var(--card)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill={activeSpeaker==='local'?'var(--accent)':'var(--muted)'}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                </button>
              </div>
              <div style={{ padding:'0 16px 12px' }}>
                <VolumeSlider value={volume}
                  onChange={applyVolume}
                  onCommit={applyVolume} />
              </div>
            </div>
          )}

          {/* SPEAKERS */}
          {!loading && tab==='speakers' && visible.map((s) => {
            const fmt   = detectFormat(s)
            const isAct = activeSpeaker===s.entity_id
            const vol   = isAct ? volume : (speakerVols[s.entity_id]??0.5)
            return (
              <div key={s.entity_id}
                style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', background: isAct?'rgba(200,168,75,0.04)':'transparent' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px 6px' }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:'var(--card)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill={fmt.color}>
                      <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/>
                    </svg>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:160 }}>{s.name}</span>
                      {isAct && <span style={{ fontSize:10, color:'var(--accent)', fontWeight:700, flexShrink:0 }}>● ACTIVE</span>}
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:3, alignItems:'center', flexWrap:'wrap' }}>
                      <Badge fmt={fmt} />
                      <span style={{ fontSize:10, color: s.state==='playing'?'var(--accent)':s.state==='idle'?'#4caf50':'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>{s.state}</span>
                    </div>
                  </div>
                  <CastBtn id={s.entity_id} onCast={() => castTo(s.entity_id, s.name)} />
                </div>
                <div style={{ padding:'0 16px 12px' }}>
                  <VolumeSlider value={vol}
                    onChange={v => {
                      setSpeakerVols(sv=>({...sv,[s.entity_id]:v}))
                      if (isAct) applyVolume(v)
                    }}
                    onCommit={v => {
                      setHAVolume(s.entity_id, v)
                      if (isAct) applyVolume(v)
                    }} />
                </div>
              </div>
            )
          })}

          {/* GROUPS */}
          {!loading && tab==='groups' && presets.length===0 && (
            <div style={{ padding:32, textAlign:'center', color:'var(--muted)', fontSize:13 }}>
              No groups yet — create them in the Speakers tab.
            </div>
          )}

          {!loading && tab==='groups' && presets.map(preset => {
            const groupSpeakers = preset.entity_ids.map(id=>speakers.find(s=>s.entity_id===id)).filter(Boolean)
            const isAct = preset.entity_ids.includes(activeSpeaker)
            const avgVol = groupSpeakers.length
              ? groupSpeakers.reduce((a,s)=>a+(speakerVols[s.entity_id]??0.5),0)/groupSpeakers.length
              : 0.5
            const [gVol, setGVol] = useState(avgVol)

            return (
              <div key={preset.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', background: isAct?'rgba(200,168,75,0.04)':'transparent' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px 6px' }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:'var(--card)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', display:'flex', alignItems:'center', gap:6 }}>
                      {preset.name}
                      {isAct && <span style={{ fontSize:10, color:'var(--accent)', fontWeight:700 }}>● ACTIVE</span>}
                    </div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {groupSpeakers.map(s=>s.name).join(' · ')}
                    </div>
                  </div>
                  <CastBtn id={preset.id} onCast={() => castPreset(preset)} />
                </div>
                {/* Group volume */}
                <div style={{ padding:'0 16px 6px' }}>
                  <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, marginBottom:6 }}>Sync All</div>
                  <VolumeSlider value={isAct ? volume : gVol}
                    onChange={v => {
                      setGVol(v)
                      if (isAct) applyVolume(v)
                      preset.entity_ids.forEach(id => setSpeakerVols(sv=>({...sv,[id]:v})))
                    }}
                    onCommit={v => { setPresetVolume(preset, v); if(isAct) applyVolume(v) }} />
                </div>
                {/* Per-speaker */}
                {groupSpeakers.length > 1 && (
                  <div style={{ padding:'0 16px 12px', borderTop:'1px solid rgba(255,255,255,0.04)', marginTop:4, paddingTop:8 }}>
                    {groupSpeakers.map(s => (
                      <div key={s.entity_id} style={{ marginBottom:4 }}>
                        <VolumeSlider label={s.name}
                          value={activeSpeaker===s.entity_id ? volume : (speakerVols[s.entity_id]??0.5)}
                          onChange={v => { setSpeakerVols(sv=>({...sv,[s.entity_id]:v})); if(activeSpeaker===s.entity_id) applyVolume(v) }}
                          onCommit={v => { setHAVolume(s.entity_id,v); if(activeSpeaker===s.entity_id) applyVolume(v) }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <div style={{ height:32 }} />
        </div>
      </div>
    </div>
  )
}
