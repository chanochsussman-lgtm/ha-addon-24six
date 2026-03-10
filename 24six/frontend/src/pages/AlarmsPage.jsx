import React, { useState, useEffect } from 'react'

export default function AlarmsPage() {
  const [alarms, setAlarms] = useState([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', time: '07:00', days: [], songId: null, songTitle: '' })
  const [songSearch, setSongSearch] = useState('')
  const [songResults, setSongResults] = useState([])

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  useEffect(() => {
    fetch('/api/alarms').then(r => r.json())
      .then(d => setAlarms(d.alarms || d || []))
      .catch(() => {})
  }, [])

  const toggleDay = (d) => {
    setForm(f => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d]
    }))
  }

  const handleSongSearch = async (q) => {
    setSongSearch(q)
    if (q.length < 2) { setSongResults([]); return }
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=songs`)
    const d = await r.json()
    setSongResults(d.songs || d.data || d.results || [])
  }

  const handleSave = async () => {
    const r = await fetch('/api/alarms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const alarm = await r.json()
    setAlarms(a => [...a, alarm])
    setCreating(false)
    setForm({ name: '', time: '07:00', days: [], songId: null, songTitle: '' })
  }

  const toggleAlarm = async (alarm) => {
    const updated = { ...alarm, enabled: !alarm.enabled }
    await fetch(`/api/alarms/${alarm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    })
    setAlarms(a => a.map(x => x.id === alarm.id ? updated : x))
  }

  const deleteAlarm = async (id) => {
    await fetch(`/api/alarms/${id}`, { method: 'DELETE' })
    setAlarms(a => a.filter(x => x.id !== id))
  }

  return (
    <div className="pt-8 pb-6 fade-in">
      <div className="flex items-center justify-between px-6 mb-6">
        <h1 className="font-display text-3xl" style={{ color: 'var(--text)' }}>Alarms</h1>
        <button
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'var(--accent)', color: '#0d0d0f' }}
          onClick={() => setCreating(true)}
        >+ New Alarm</button>
      </div>

      {/* Alarm list */}
      {alarms.length === 0 && !creating && (
        <div className="px-6 text-center py-16">
          <p className="text-4xl mb-3">⏰</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No alarms set. Create one to wake up to your favorite song.</p>
        </div>
      )}

      <div className="px-6 flex flex-col gap-3 mb-6">
        {alarms.map(alarm => (
          <div key={alarm.id} className="flex items-center gap-4 px-4 py-4 rounded-2xl"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex-1">
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-3xl font-light tabular-nums" style={{ color: alarm.enabled ? 'var(--text)' : 'var(--muted)' }}>
                  {alarm.time}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{alarm.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {DAYS.map(d => (
                    <span key={d} className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: alarm.days?.includes(d) ? 'rgba(200,168,75,0.2)' : 'var(--surface)',
                        color: alarm.days?.includes(d) ? 'var(--accent)' : 'var(--muted)'
                      }}>{d}</span>
                  ))}
                </div>
              </div>
              {alarm.songTitle && (
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>🎵 {alarm.songTitle}</p>
              )}
            </div>
            {/* Toggle */}
            <button
              onClick={() => toggleAlarm(alarm)}
              className="w-12 h-6 rounded-full relative transition-colors flex-shrink-0"
              style={{ background: alarm.enabled ? 'var(--accent)' : 'var(--border)' }}
            >
              <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: alarm.enabled ? '26px' : '4px' }} />
            </button>
            <button onClick={() => deleteAlarm(alarm.id)} className="text-sm" style={{ color: 'var(--muted)' }}>✕</button>
          </div>
        ))}
      </div>

      {/* Create form */}
      {creating && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setCreating(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl px-6 pt-6 pb-10"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-lg mb-4" style={{ color: 'var(--text)' }}>New Alarm</h2>

            {/* Time */}
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-2xl font-light text-center outline-none mb-4"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />

            {/* Name */}
            <input placeholder="Alarm name (optional)"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-4"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />

            {/* Days */}
            <div className="flex gap-2 mb-4">
              {DAYS.map(d => (
                <button key={d} onClick={() => toggleDay(d)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium"
                  style={{
                    background: form.days.includes(d) ? 'var(--accent)' : 'var(--card)',
                    color: form.days.includes(d) ? '#0d0d0f' : 'var(--muted)',
                    border: '1px solid var(--border)'
                  }}>{d}</button>
              ))}
            </div>

            {/* Song search */}
            <input placeholder="Search for wake-up song…"
              value={songSearch} onChange={e => handleSongSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-2"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            {songResults.slice(0, 4).map(song => (
              <button key={song.id}
                className="w-full text-left px-4 py-2 rounded-lg text-sm mb-1 transition-colors"
                style={{
                  background: form.songId === song.id ? 'rgba(200,168,75,0.15)' : 'var(--card)',
                  color: form.songId === song.id ? 'var(--accent)' : 'var(--text)'
                }}
                onClick={() => setForm(f => ({ ...f, songId: song.id, songTitle: song.title || song.name }))}>
                🎵 {song.title || song.name}
              </button>
            ))}
            {form.songTitle && <p className="text-xs mt-1 mb-3" style={{ color: 'var(--accent)' }}>✓ {form.songTitle}</p>}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setCreating(false)}
                className="flex-1 py-3 rounded-xl text-sm"
                style={{ background: 'var(--card)', color: 'var(--text)' }}>Cancel</button>
              <button onClick={handleSave}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'var(--accent)', color: '#0d0d0f' }}>Save Alarm</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
