import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const b = () => window.ingressPath || ''

// Detect integration from entity_id / platform
function detectFormat(speaker) {
  const id = speaker.entity_id.toLowerCase()
  const plat = (speaker.platform || '').toLowerCase()
  if (id.includes('wiim') || plat.includes('linkplay')) return { label: 'WiiM / LinkPlay', color: '#4fc3f7' }
  if (id.includes('sonos') || plat.includes('sonos'))   return { label: 'Sonos', color: '#00e5ff' }
  if (id.includes('google') || id.includes('chromecast') || plat.includes('cast')) return { label: 'Google Cast', color: '#34a853' }
  if (id.includes('alexa') || id.includes('echo'))       return { label: 'Alexa', color: '#00b0ca' }
  if (id.includes('airplay') || plat.includes('airplay')) return { label: 'AirPlay', color: '#a78bfa' }
  if (plat.includes('dlna') || plat.includes('upnp'))    return { label: 'DLNA/UPnP', color: '#fbbf24' }
  if (id.includes('spotify') || plat.includes('spotify')) return { label: 'Spotify Connect', color: '#1db954' }
  return { label: plat || 'HA Media Player', color: '#9a9ba6' }
}

function Toggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width:42, height:24, borderRadius:12, background: on ? 'var(--accent)' : 'var(--border)', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:3, left: on ? 21 : 3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
    </div>
  )
}

function VolumeSlider({ value, onChange, onCommit }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--muted)"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
      <input type="range" min="0" max="1" step="0.02" value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        onMouseUp={e => onCommit(parseFloat(e.target.value))}
        onTouchEnd={e => onCommit(parseFloat(e.target.value))}
        style={{ flex:1, accentColor:'var(--accent)', height:3 }} />
      <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--muted)"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
      <span style={{ fontSize:11, color:'var(--muted)', width:32, textAlign:'right' }}>{Math.round(value * 100)}%</span>
    </div>
  )
}

export default function SpeakersPage() {
  const nav = useNavigate()
  const [speakers, setSpeakers]   = useState([])
  const [prefs, setPrefs]         = useState({})      // { entity_id: { hidden, volume } }
  const [presets, setPresets]     = useState([])
  const [tab, setTab]             = useState('speakers') // 'speakers' | 'presets'
  const [loading, setLoading]     = useState(true)
  const [volumes, setVolumes]     = useState({})       // live volume state
  // Preset creation
  const [creatingPreset, setCreatingPreset] = useState(false)
  const [presetName, setPresetName]         = useState('')
  const [presetSelected, setPresetSelected] = useState([])
  // Preset editing
  const [editingPreset, setEditingPreset]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [sp, pr, ps] = await Promise.all([
      fetch(`${b()}/api/ha/speakers`).then(r => r.json()).catch(() => []),
      fetch(`${b()}/api/ha/speaker-prefs`).then(r => r.json()).catch(() => ({})),
      fetch(`${b()}/api/ha/presets`).then(r => r.json()).catch(() => []),
    ])
    setSpeakers(Array.isArray(sp) ? sp : [])
    setPrefs(pr || {})
    setPresets(Array.isArray(ps) ? ps : [])
    // Init volumes from speaker state
    const vols = {}
    if (Array.isArray(sp)) sp.forEach(s => { if (s.volume != null) vols[s.entity_id] = s.volume })
    setVolumes(vols)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const savePrefs = async (newPrefs) => {
    setPrefs(newPrefs)
    await fetch(`${b()}/api/ha/speaker-prefs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPrefs)
    }).catch(() => {})
  }

  const toggleHidden = (entity_id) => {
    const cur = prefs[entity_id] || {}
    savePrefs({ ...prefs, [entity_id]: { ...cur, hidden: !cur.hidden } })
  }

  const setVolume = async (entity_id, volume) => {
    setVolumes(v => ({ ...v, [entity_id]: volume }))
    await fetch(`${b()}/api/ha/volume`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id, volume })
    }).catch(() => {})
  }

  const savePreset = async () => {
    if (!presetName.trim() || !presetSelected.length) return
    const res = await fetch(`${b()}/api/ha/presets`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: presetName, entity_ids: presetSelected })
    }).then(r => r.json()).catch(() => null)
    if (res?.id) {
      setPresets(p => [...p, res])
      setCreatingPreset(false); setPresetName(''); setPresetSelected([])
    }
  }

  const deletePreset = async (id) => {
    await fetch(`${b()}/api/ha/presets/${id}`, { method: 'DELETE' }).catch(() => {})
    setPresets(p => p.filter(x => x.id !== id))
  }

  const updatePreset = async (id, data) => {
    await fetch(`${b()}/api/ha/presets/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {})
    setPresets(p => p.map(x => x.id === id ? { ...x, ...data } : x))
    setEditingPreset(null)
  }

  const visibleSpeakers = speakers.filter(s => !prefs[s.entity_id]?.hidden)
  const hiddenCount = speakers.filter(s => prefs[s.entity_id]?.hidden).length

  const Section = ({ title, children }) => (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:1.2, textTransform:'uppercase', padding:'0 16px 8px' }}>{title}</div>
      <div style={{ background:'var(--surface)', borderRadius:12, margin:'0 16px', overflow:'hidden', border:'1px solid var(--border)' }}>{children}</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100%', paddingBottom:32 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 16px 8px' }}>
        <button onClick={() => nav(-1)} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <div style={{ fontSize:20, fontWeight:700, color:'var(--text)' }}>Speakers</div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, padding:'8px 16px 16px' }}>
        {['speakers', 'presets'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'9px 0', borderRadius:10, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: tab===t ? 'var(--accent)' : 'var(--surface)', color: tab===t ? '#000' : 'var(--text)' }}>
            {t === 'speakers' ? `Speakers${hiddenCount ? ` (${hiddenCount} hidden)` : ''}` : `Groups (${presets.length})`}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>Loading...</div>}

      {/* ── SPEAKERS TAB ── */}
      {!loading && tab === 'speakers' && (
        <>
          <Section title={`Active Speakers (${visibleSpeakers.length})`}>
            {visibleSpeakers.length === 0 && <div style={{ padding:20, color:'var(--muted)', fontSize:13 }}>All speakers hidden</div>}
            {visibleSpeakers.map((s, i) => {
              const fmt = detectFormat(s)
              const vol = volumes[s.entity_id] ?? s.volume ?? 0.5
              const stateColor = s.state==='playing'?'var(--accent)': s.state==='idle'||s.state==='paused'?'#4caf50':'var(--muted)'
              return (
                <div key={s.entity_id} style={{ borderBottom: i < visibleSpeakers.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px 8px' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{s.name}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
                        <span style={{ fontSize:10, color: stateColor, fontWeight:600, textTransform:'uppercase' }}>{s.state}</span>
                        <span style={{ fontSize:10, color: fmt.color, background:`${fmt.color}22`, padding:'1px 6px', borderRadius:4, fontWeight:600 }}>{fmt.label}</span>
                      </div>
                    </div>
                    <Toggle on={true} onChange={() => toggleHidden(s.entity_id)} />
                  </div>
                  {s.state !== 'unavailable' && (
                    <div style={{ padding:'0 16px 12px' }}>
                      <VolumeSlider value={vol}
                        onChange={v => setVolumes(vs => ({ ...vs, [s.entity_id]: v }))}
                        onCommit={v => setVolume(s.entity_id, v)} />
                    </div>
                  )}
                </div>
              )
            })}
          </Section>

          {/* Hidden speakers */}
          {speakers.filter(s => prefs[s.entity_id]?.hidden).length > 0 && (
            <Section title="Hidden Speakers">
              {speakers.filter(s => prefs[s.entity_id]?.hidden).map((s, i, arr) => {
                const fmt = detectFormat(s)
                return (
                  <div key={s.entity_id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom: i < arr.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, color:'var(--text-secondary)' }}>{s.name}</div>
                      <span style={{ fontSize:10, color: fmt.color, background:`${fmt.color}22`, padding:'1px 6px', borderRadius:4, fontWeight:600 }}>{fmt.label}</span>
                    </div>
                    <Toggle on={false} onChange={() => toggleHidden(s.entity_id)} />
                  </div>
                )
              })}
            </Section>
          )}
        </>
      )}

      {/* ── PRESETS TAB ── */}
      {!loading && tab === 'presets' && (
        <>
          {/* Existing presets */}
          {presets.map(preset => (
            <div key={preset.id} style={{ margin:'0 16px 12px', background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
              {editingPreset?.id === preset.id ? (
                // Edit mode
                <div style={{ padding:16 }}>
                  <input value={editingPreset.name}
                    onChange={e => setEditingPreset(p => ({ ...p, name: e.target.value }))}
                    style={{ width:'100%', background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:14, marginBottom:12, boxSizing:'border-box' }} />
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Speakers in group</div>
                  {speakers.map(s => (
                    <div key={s.entity_id} className="tappable"
                      onClick={() => setEditingPreset(p => ({ ...p, entity_ids: p.entity_ids.includes(s.entity_id) ? p.entity_ids.filter(x => x !== s.entity_id) : [...p.entity_ids, s.entity_id] }))}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0' }}>
                      <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${editingPreset.entity_ids.includes(s.entity_id) ? 'var(--accent)' : 'var(--border)'}`, background: editingPreset.entity_ids.includes(s.entity_id) ? 'var(--accent)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {editingPreset.entity_ids.includes(s.entity_id) && <svg width="11" height="11" viewBox="0 0 24 24" fill="#000"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                      </div>
                      <span style={{ fontSize:13, color:'var(--text)' }}>{s.name}</span>
                      <span style={{ fontSize:10, color: detectFormat(s).color, marginLeft:'auto' }}>{detectFormat(s).label}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:8, marginTop:12 }}>
                    <button onClick={() => updatePreset(preset.id, { name: editingPreset.name, entity_ids: editingPreset.entity_ids })}
                      style={{ flex:1, background:'var(--accent)', color:'#000', fontWeight:700, fontSize:13, padding:'10px 0', borderRadius:8, border:'none', cursor:'pointer' }}>Save</button>
                    <button onClick={() => setEditingPreset(null)}
                      style={{ flex:1, background:'var(--card)', color:'var(--text)', fontSize:13, padding:'10px 0', borderRadius:8, border:'1px solid var(--border)', cursor:'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{preset.name}</div>
                      <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>
                        {preset.entity_ids.map(id => speakers.find(s => s.entity_id === id)?.name || id).join(' · ')}
                      </div>
                    </div>
                    <button onClick={() => setEditingPreset({ ...preset })}
                      style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', fontSize:12, color:'var(--text)', cursor:'pointer' }}>Edit</button>
                    <button onClick={() => deletePreset(preset.id)}
                      style={{ background:'rgba(220,50,50,0.1)', border:'1px solid rgba(220,50,50,0.3)', borderRadius:8, padding:'6px 10px', fontSize:12, color:'#f66', cursor:'pointer' }}>✕</button>
                  </div>
                  {/* Group volume slider */}
                  <div style={{ padding:'0 16px 14px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6, marginTop:10 }}>Group Volume</div>
                    <VolumeSlider value={0.5}
                      onChange={() => {}}
                      onCommit={async v => {
                        await fetch(`${b()}/api/ha/presets/${preset.id}/volume`, {
                          method:'POST', headers:{'Content-Type':'application/json'},
                          body: JSON.stringify({ volume: v })
                        }).catch(() => {})
                      }} />
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Create new preset */}
          {creatingPreset ? (
            <div style={{ margin:'0 16px', background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', padding:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:12 }}>New Group</div>
              <input value={presetName} onChange={e => setPresetName(e.target.value)}
                placeholder="Group name (e.g. Downstairs)"
                style={{ width:'100%', background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', color:'var(--text)', fontSize:14, marginBottom:14, boxSizing:'border-box', outline:'none' }} />
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Select Speakers</div>
              {speakers.map(s => (
                <div key={s.entity_id} className="tappable"
                  onClick={() => setPresetSelected(sel => sel.includes(s.entity_id) ? sel.filter(x => x !== s.entity_id) : [...sel, s.entity_id])}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${presetSelected.includes(s.entity_id)?'var(--accent)':'var(--border)'}`, background: presetSelected.includes(s.entity_id)?'var(--accent)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                    {presetSelected.includes(s.entity_id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="#000"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color:'var(--text)' }}>{s.name}</div>
                    <span style={{ fontSize:10, color: detectFormat(s).color }}>{detectFormat(s).label}</span>
                  </div>
                  <span style={{ fontSize:11, color: s.state==='idle'?'#4caf50':'var(--muted)' }}>{s.state}</span>
                </div>
              ))}
              <div style={{ display:'flex', gap:8, marginTop:14 }}>
                <button onClick={savePreset} disabled={!presetName.trim() || !presetSelected.length}
                  style={{ flex:1, background: presetName.trim() && presetSelected.length ? 'var(--accent)' : 'var(--border)', color: presetName.trim() && presetSelected.length ? '#000' : 'var(--muted)', fontWeight:700, fontSize:13, padding:'11px 0', borderRadius:8, border:'none', cursor:'pointer' }}>
                  Create Group ({presetSelected.length} speakers)
                </button>
                <button onClick={() => { setCreatingPreset(false); setPresetName(''); setPresetSelected([]) }}
                  style={{ flex:1, background:'var(--card)', color:'var(--text)', fontSize:13, padding:'11px 0', borderRadius:8, border:'1px solid var(--border)', cursor:'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ padding:'8px 16px' }}>
              <button onClick={() => setCreatingPreset(true)}
                style={{ width:'100%', background:'var(--surface)', border:'1px dashed var(--border)', borderRadius:12, padding:'14px 0', fontSize:14, color:'var(--accent)', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--accent)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                New Speaker Group
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
