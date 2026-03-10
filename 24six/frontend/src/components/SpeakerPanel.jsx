import React, { useEffect, useState, useCallback } from 'react'
import { usePlayerStore, useSpeakerStore, useZoneStore } from '../store'

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ['Output', 'Zones', 'Groups']

export default function SpeakerPanel({ onClose }) {
  const [tab, setTab] = useState('Output')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end" onClick={onClose}>
      <div
        className="m-4 rounded-2xl w-96 max-h-[85vh] flex flex-col fade-in"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Audio Output</h2>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: 'var(--muted)' }}>✕</button>
        </div>

        <div className="flex gap-1 px-5 pb-3 flex-shrink-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: tab === t ? 'var(--accent)' : 'var(--card)',
                color: tab === t ? '#0d0d0f' : 'var(--text-secondary)',
              }}>{t}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {tab === 'Output' && <OutputTab onClose={onClose} />}
          {tab === 'Zones'  && <ZonesTab  onClose={onClose} />}
          {tab === 'Groups' && <GroupsTab />}
        </div>
      </div>
    </div>
  )
}

// ── Output Tab ────────────────────────────────────────────────────────────────
function OutputTab({ onClose }) {
  const { speakers, loading, loadSpeakers } = useSpeakerStore()
  const { entity_id: activeEntity, setEntity, volume, setVolume } = usePlayerStore()
  const [speakerVolumes, setSpeakerVolumes] = useState({})

  useEffect(() => { loadSpeakers() }, [])

  return (
    <>
      <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
        Select where the main player sends audio.
      </p>

      <SpeakerRow name="This Device" subtitle="Browser audio" icon="🖥️"
        active={!activeEntity}
        onClick={() => { setEntity(null); onClose() }}
        volume={volume} onVolume={setVolume} />

      {loading && <p className="text-xs py-3 text-center" style={{ color: 'var(--muted)' }}>Loading…</p>}

      {speakers.map(sp => (
        <SpeakerRow key={sp.entity_id}
          name={sp.name} subtitle={formatSpeakerStatus(sp)} icon="🔊"
          active={activeEntity === sp.entity_id}
          grouped={sp.group_members?.length > 1}
          isLeader={sp.group_members?.length > 1 && sp.group_members[0] === sp.entity_id}
          groupSize={sp.group_members?.length}
          onClick={() => { setEntity(activeEntity === sp.entity_id ? null : sp.entity_id); onClose() }}
          volume={speakerVolumes[sp.entity_id] ?? sp.volume ?? 0.5}
          onVolume={v => {
            setSpeakerVolumes(prev => ({ ...prev, [sp.entity_id]: v }))
            if (activeEntity === sp.entity_id) setVolume(v)
            else fetch('/api/ha/call', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain: 'media_player', service: 'volume_set', entity_id: sp.entity_id, data: { volume_level: v } })
            }).catch(() => {})
          }}
        />
      ))}

      <button className="w-full mt-2 py-2 rounded-xl text-xs" style={{ color: 'var(--muted)', background: 'var(--card)' }}
        onClick={loadSpeakers}>↺ Refresh</button>
    </>
  )
}

// ── Zones Tab ─────────────────────────────────────────────────────────────────
function ZonesTab({ onClose }) {
  const { zones, activeZoneId, setActiveZone, addZone, removeZone, renameZone,
          toggleZone, nextInZone, prevInZone, setZoneVolume } = useZoneStore()
  const { speakers, loadSpeakers } = useSpeakerStore()
  const [showAddZone, setShowAddZone] = useState(false)
  const [editingZone, setEditingZone] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [zoneVolumes, setZoneVolumes] = useState({})

  useEffect(() => { loadSpeakers() }, [])

  const usedEntities = new Set(zones.map(z => z.entity_id).filter(Boolean))
  const availableSpeakers = speakers.filter(s => !usedEntities.has(s.entity_id))

  return (
    <>
      <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
        Zones let different speakers play different songs simultaneously.
        The active zone is what the main player controls.
      </p>

      {zones.map(zone => {
        const isActive = zone.id === activeZoneId
        const vol = zoneVolumes[zone.id] ?? 0.7
        return (
          <div key={zone.id} className="rounded-2xl mb-2 overflow-hidden"
            style={{ border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`, background: isActive ? 'rgba(200,168,75,0.07)' : 'var(--card)' }}>
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              onClick={() => { setActiveZone(zone.id); onClose() }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--border)' }}>
                {zone.entity_id ? '🔊' : '🖥️'}
              </div>
              <div className="flex-1 min-w-0">
                {editingZone === zone.id ? (
                  <input autoFocus value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onBlur={() => { renameZone(zone.id, editLabel || zone.label); setEditingZone(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') { renameZone(zone.id, editLabel || zone.label); setEditingZone(null) } }}
                    className="text-sm font-medium w-full outline-none"
                    style={{ background: 'transparent', color: 'var(--text)', borderBottom: '1px solid var(--accent)' }}
                    onClick={e => e.stopPropagation()} />
                ) : (
                  <p className="text-sm font-medium" style={{ color: isActive ? 'var(--accent)' : 'var(--text)' }}>
                    {zone.label}
                    {isActive && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--accent)' }}>● Active</span>}
                  </p>
                )}
                <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                  {zone.currentSong ? (zone.currentSong.title || zone.currentSong.name) : 'Nothing playing'}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <button className="p-1" style={{ color: 'var(--muted)' }} onClick={() => prevInZone(zone.id)}><PrevMiniIcon /></button>
                <button className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: isActive ? 'var(--accent)' : 'var(--border)', color: isActive ? '#0d0d0f' : 'var(--text)' }}
                  onClick={() => toggleZone(zone.id)}>
                  {zone.isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button className="p-1" style={{ color: 'var(--muted)' }} onClick={() => nextInZone(zone.id)}><NextMiniIcon /></button>
                {zone.id !== 'browser' && <>
                  <button className="p-1 ml-1 text-sm" style={{ color: 'var(--muted)' }}
                    title="Rename" onClick={() => { setEditingZone(zone.id); setEditLabel(zone.label) }}>✎</button>
                  <button className="p-1 text-sm" style={{ color: 'var(--muted)' }}
                    title="Remove zone" onClick={() => removeZone(zone.id)}>✕</button>
                </>}
              </div>
            </div>
            {zone.entity_id && (
              <div className="flex items-center gap-2 px-4 pb-3"
                style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Vol</span>
                <input type="range" className="flex-1" min={0} max={1} step={0.01} value={vol}
                  onChange={e => { const v = Number(e.target.value); setZoneVolumes(p => ({ ...p, [zone.id]: v })); setZoneVolume(zone.id, v) }} />
                <span className="text-xs w-6 text-right" style={{ color: 'var(--muted)' }}>{Math.round(vol * 100)}</span>
              </div>
            )}
          </div>
        )
      })}

      {!showAddZone ? (
        <button className="w-full py-2.5 rounded-xl text-sm font-medium mt-1"
          style={{ border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}
          onClick={() => setShowAddZone(true)}>+ Add Zone</button>
      ) : (
        <div className="rounded-xl mt-1 p-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-2 font-semibold" style={{ color: 'var(--text)' }}>Choose speaker for new zone:</p>
          {availableSpeakers.length === 0
            ? <p className="text-xs" style={{ color: 'var(--muted)' }}>All speakers already have zones.</p>
            : availableSpeakers.map(sp => (
              <button key={sp.entity_id} className="w-full text-left flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-surface transition-colors"
                onClick={() => { addZone(sp.entity_id, sp.name); setShowAddZone(false) }}>
                <span>🔊</span>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{sp.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{sp.state}</p>
                </div>
              </button>
            ))
          }
          <button className="mt-2 text-xs" style={{ color: 'var(--muted)' }} onClick={() => setShowAddZone(false)}>Cancel</button>
        </div>
      )}
    </>
  )
}

// ── Groups Tab ────────────────────────────────────────────────────────────────
function GroupsTab() {
  const { speakers, loading, loadSpeakers } = useSpeakerStore()
  const { setEntity } = usePlayerStore()
  const [groupLeader, setGroupLeader] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [applying, setApplying] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => { loadSpeakers() }, [])

  const showFeedback = (msg, ok = true) => {
    setFeedback({ msg, ok })
    setTimeout(() => setFeedback(null), 3000)
  }

  const applyGroup = async () => {
    if (!groupLeader || !groupMembers.length) return
    setApplying(true)
    try {
      const r = await fetch('/api/ha/group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leader: groupLeader, members: [groupLeader, ...groupMembers] })
      })
      if (!r.ok) throw new Error('Group request failed')
      setEntity(groupLeader)
      const leaderName = speakers.find(s => s.entity_id === groupLeader)?.name || 'speaker'
      showFeedback(`Grouped! Main player routed to ${leaderName}`)
      await loadSpeakers()
      setGroupLeader(null); setGroupMembers([])
    } catch (e) { showFeedback(e.message, false) }
    finally { setApplying(false) }
  }

  const ungroup = async (entity_id) => {
    try {
      await fetch('/api/ha/ungroup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id })
      })
      showFeedback('Ungrouped')
      await loadSpeakers()
    } catch (e) { showFeedback(e.message, false) }
  }

  // Only show each group once (leader perspective)
  const groupLeaders = speakers.filter(sp =>
    sp.group_members?.length > 1 &&
    sp.group_members[0] === sp.entity_id
  )
  const ungroupedSpeakers = speakers.filter(sp =>
    !sp.group_members || sp.group_members.length <= 1
  )

  return (
    <>
      <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
        Grouped speakers sync perfectly via LinkPlay. Play to the leader — members follow.
        After grouping, the main player is automatically routed to the leader.
      </p>

      {groupLeaders.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Active Groups</p>
          {groupLeaders.map(sp => {
            const memberNames = (sp.group_members || []).map(id =>
              speakers.find(s => s.entity_id === id)?.name || id.replace('media_player.', ''))
            return (
              <div key={sp.entity_id} className="rounded-xl p-3 mb-2"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: 'rgba(200,168,75,0.2)', color: 'var(--accent)' }}>Leader</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{sp.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {memberNames.slice(1).map((name, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}>{name}</span>
                      ))}
                    </div>
                  </div>
                  <button className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
                    style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                    onClick={() => ungroup(sp.entity_id)}>Ungroup</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Create Group</p>

      {loading && <p className="text-xs py-2" style={{ color: 'var(--muted)' }}>Loading speakers…</p>}
      {!loading && ungroupedSpeakers.length < 2 && (
        <p className="text-xs py-2" style={{ color: 'var(--muted)' }}>Need at least 2 ungrouped speakers.</p>
      )}

      {!loading && ungroupedSpeakers.length >= 2 && (
        <>
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Select leader, then add members:</p>

          {ungroupedSpeakers.map(sp => (
            <div key={sp.entity_id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl mb-1 transition-colors"
              style={{
                background: groupLeader === sp.entity_id ? 'rgba(200,168,75,0.1)' : 'var(--card)',
                border: `1px solid ${groupLeader === sp.entity_id ? 'var(--accent)' : 'var(--border)'}`,
              }}>
              <input type="radio" name="group-leader" checked={groupLeader === sp.entity_id}
                style={{ accentColor: 'var(--accent)', flexShrink: 0 }}
                onChange={() => { setGroupLeader(sp.entity_id); setGroupMembers(p => p.filter(id => id !== sp.entity_id)) }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{sp.name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{sp.state}</p>
              </div>
              {groupLeader && groupLeader !== sp.entity_id ? (
                <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                  <input type="checkbox" checked={groupMembers.includes(sp.entity_id)}
                    style={{ accentColor: 'var(--accent)' }}
                    onChange={e => setGroupMembers(p => e.target.checked ? [...p, sp.entity_id] : p.filter(id => id !== sp.entity_id))} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Add</span>
                </label>
              ) : groupLeader === sp.entity_id ? (
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(200,168,75,0.2)', color: 'var(--accent)' }}>Leader</span>
              ) : null}
            </div>
          ))}

          {groupLeader && groupMembers.length > 0 && (
            <div className="mt-3 p-3 rounded-xl"
              style={{ background: 'rgba(200,168,75,0.07)', border: '1px solid rgba(200,168,75,0.25)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent)' }}>{speakers.find(s => s.entity_id === groupLeader)?.name}</span>
                {' leads → '}
                {groupMembers.map(id => speakers.find(s => s.entity_id === id)?.name).join(', ')}
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                Main player will route to the leader automatically.
              </p>
              <button className="w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--accent)', color: '#0d0d0f', opacity: applying ? 0.6 : 1 }}
                onClick={applyGroup} disabled={applying}>
                {applying ? 'Grouping…' : `Sync ${1 + groupMembers.length} Speakers`}
              </button>
            </div>
          )}
        </>
      )}

      {feedback && (
        <div className="mt-3 px-4 py-3 rounded-xl text-sm"
          style={{
            background: feedback.ok ? 'rgba(200,168,75,0.1)' : 'rgba(229,115,115,0.1)',
            color: feedback.ok ? 'var(--accent)' : '#e57373',
            border: `1px solid ${feedback.ok ? 'rgba(200,168,75,0.25)' : 'rgba(229,115,115,0.25)'}`,
          }}>{feedback.msg}</div>
      )}

      <button className="w-full mt-3 py-2 rounded-xl text-xs" style={{ color: 'var(--muted)', background: 'var(--card)' }}
        onClick={loadSpeakers}>↺ Refresh</button>
    </>
  )
}

// ── Shared SpeakerRow ─────────────────────────────────────────────────────────
function SpeakerRow({ name, subtitle, icon, active, grouped, isLeader, groupSize, onClick, volume, onVolume }) {
  return (
    <div className="rounded-xl mb-2 overflow-hidden cursor-pointer transition-colors"
      style={{ background: active ? 'rgba(200,168,75,0.1)' : 'var(--card)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}` }}
      onClick={onClick}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--border)' }}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium" style={{ color: active ? 'var(--accent)' : 'var(--text)' }}>{name}</p>
            {grouped && (
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(200,168,75,0.15)', color: 'var(--accent)' }}>
                {isLeader ? `Leader · ${groupSize}` : 'Member'}
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{subtitle}</p>
        </div>
        {active && <CheckIcon />}
      </div>
      {active && (
        <div className="flex items-center gap-2 px-4 pb-3"
          style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}
          onClick={e => e.stopPropagation()}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>🔈</span>
          <input type="range" className="flex-1" min={0} max={1} step={0.01} value={volume}
            onChange={e => onVolume(Number(e.target.value))} />
          <span className="text-xs w-6 text-right" style={{ color: 'var(--muted)' }}>{Math.round(volume * 100)}</span>
        </div>
      )}
    </div>
  )
}

function formatSpeakerStatus(sp) {
  if (sp.group_members?.length > 1) return `${sp.group_members.length} grouped · ${sp.state}`
  return sp.state
}

function CheckIcon() {
  return <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
function PlayIcon() { return <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> }
function PauseIcon() { return <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> }
function PrevMiniIcon() { return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg> }
function NextMiniIcon() { return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg> }
