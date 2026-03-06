import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store'
import { useNavigate } from 'react-router-dom'

const SETTINGS_KEY = 'twentyfour_six_settings'

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
  } catch { return {} }
}

// We persist settings to the backend user preferences endpoint
async function saveSettingRemote(key, value) {
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
  } catch {}
}

export default function SettingsPage() {
  const { profile, logout } = useAuthStore()
  const navigate = useNavigate()
  const [settings, setSettings] = useState(loadSettings)
  const [saved, setSaved] = useState(false)

  const set = (key, value) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch {}
    saveSettingRemote(key, value)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const s = settings

  return (
    <div className="pt-8 pb-6 fade-in">
      <div className="px-6 mb-6 flex items-center gap-3">
        <h1 className="font-display text-3xl flex-1" style={{ color: 'var(--text)' }}>Settings</h1>
        {saved && <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(200,168,75,0.15)', color: 'var(--accent)' }}>Saved ✓</span>}
      </div>

      {/* Profile info */}
      <Section title="Account">
        <InfoRow label="Logged in as" value={profile?.email || profile?.name || '—'} />
        <InfoRow label="Profile" value={profile?.profileName || profile?.name || '—'} />
        <ActionRow label="Log Out" destructive onClick={async () => { await logout(); navigate('/login') }} />
      </Section>

      {/* Playback */}
      <Section title="Playback">
        <ToggleRow
          label="Autoplay"
          desc="Continue playing similar songs when queue ends"
          value={s.autoplay !== false}
          onChange={v => set('autoplay', v)}
        />
        <ToggleRow
          label="Autoplay Podcasts"
          desc="Automatically play next episode"
          value={s.autoplayPodcasts !== false}
          onChange={v => set('autoplayPodcasts', v)}
        />
        <ToggleRow
          label="Autoplay Videos"
          desc="Automatically play next video"
          value={s.autoplayVideo !== false}
          onChange={v => set('autoplayVideo', v)}
        />
        <SelectRow
          label="Default Audio Quality"
          value={s.audioQuality || 'aac'}
          options={[
            { value: 'aac', label: 'AAC (Standard)' },
            { value: 'mp3', label: 'MP3' },
            { value: 'flac', label: 'FLAC (High Quality)' },
          ]}
          onChange={v => set('audioQuality', v)}
        />
        <SelectRow
          label="Podcast Speed"
          value={s.podcastSpeed || '1'}
          options={[
            { value: '0.75', label: '0.75×' },
            { value: '1', label: '1× (Normal)' },
            { value: '1.25', label: '1.25×' },
            { value: '1.5', label: '1.5×' },
            { value: '1.75', label: '1.75×' },
            { value: '2', label: '2×' },
          ]}
          onChange={v => set('podcastSpeed', v)}
        />
      </Section>

      {/* Display */}
      <Section title="Display">
        <ToggleRow
          label="Force Hebrew Titles"
          desc="Show Hebrew titles for songs when available"
          value={s.forceHebrew === true}
          onChange={v => set('forceHebrew', v)}
        />
        <SelectRow
          label="Theme"
          value={s.theme || 'dark'}
          options={[
            { value: 'dark', label: 'Dark (Default)' },
            { value: 'oled', label: 'OLED Black' },
            { value: 'auto', label: 'Follow System' },
          ]}
          onChange={v => set('theme', v)}
        />
      </Section>

      {/* Zmanim / Jewish */}
      <Section title="Zmanim">
        <SelectRow
          label="Minutes After Shkiya"
          desc="Used for Shabbat candle lighting calculation"
          value={String(s.zmanMinutesAfterShkiya ?? 18)}
          options={[
            { value: '10', label: '10 minutes' },
            { value: '15', label: '15 minutes' },
            { value: '18', label: '18 minutes (default)' },
            { value: '20', label: '20 minutes' },
            { value: '25', label: '25 minutes' },
            { value: '30', label: '30 minutes' },
            { value: '40', label: '40 minutes (Yerushalmim)' },
          ]}
          onChange={v => set('zmanMinutesAfterShkiya', Number(v))}
        />
        <SelectRow
          label="Temperature Units"
          value={s.tempUnit || 'fahrenheit'}
          options={[
            { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
            { value: 'celsius', label: 'Celsius (°C)' },
          ]}
          onChange={v => set('tempUnit', v)}
        />
        <SelectRow
          label="Distance Units"
          value={s.distUnit || 'miles'}
          options={[
            { value: 'miles', label: 'Miles' },
            { value: 'km', label: 'Kilometers' },
          ]}
          onChange={v => set('distUnit', v)}
        />
      </Section>

      {/* Downloads */}
      <Section title="Downloads">
        <SelectRow
          label="Download Quality"
          value={s.downloadQuality || 'aac'}
          options={[
            { value: 'aac', label: 'AAC (Standard, ~1MB/min)' },
            { value: 'mp3', label: 'MP3' },
            { value: 'flac', label: 'FLAC (Large files)' },
          ]}
          onChange={v => set('downloadQuality', v)}
        />
        <SelectRow
          label="Max Offline Days"
          desc="Re-authentication required after this many days offline"
          value={String(s.maxOfflineDays ?? 30)}
          options={[
            { value: '7', label: '7 days' },
            { value: '14', label: '14 days' },
            { value: '30', label: '30 days' },
            { value: '60', label: '60 days' },
          ]}
          onChange={v => set('maxOfflineDays', Number(v))}
        />
        <ActionRow label="Clear All Downloads" destructive onClick={async () => {
          if (!window.confirm('Delete all downloaded songs?')) return
          await fetch('/api/downloads/all', { method: 'DELETE' })
        }} />
        <ActionRow label="Clear Cache" onClick={async () => {
          await fetch('/api/cache', { method: 'DELETE' })
          setSaved(true); setTimeout(() => setSaved(false), 1500)
        }} />
      </Section>

      {/* About */}
      <Section title="About">
        <InfoRow label="App Version" value="1.0.0 (HA Add-on)" />
        <InfoRow label="Add-on" value="24Six for Home Assistant" />
        <ActionRow label="Check for Updates" onClick={() => window.open('https://github.com', '_blank')} />
      </Section>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-wider px-6 mb-2" style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}>
        {title}
      </p>
      <div className="mx-6 rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ children, border = true }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: border ? '1px solid var(--border)' : 'none' }}>
      {children}
    </div>
  )
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <Row>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</p>
        {desc && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{desc}</p>}
      </div>
      <button
        className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200"
        style={{ background: value ? 'var(--accent)' : 'var(--border)' }}
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
      >
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: value ? 'translateX(22px)' : 'translateX(2px)' }} />
      </button>
    </Row>
  )
}

function SelectRow({ label, desc, value, options, onChange }) {
  return (
    <Row>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</p>
        {desc && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{desc}</p>}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-xs font-medium rounded-lg px-2 py-1.5 outline-none flex-shrink-0"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', maxWidth: 160 }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Row>
  )
}

function InfoRow({ label, value }) {
  return (
    <Row>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-sm ml-auto" style={{ color: 'var(--text)' }}>{value}</p>
    </Row>
  )
}

function ActionRow({ label, onClick, destructive }) {
  return (
    <Row border={false}>
      <button
        className="text-sm font-medium w-full text-left"
        style={{ color: destructive ? '#e57373' : 'var(--accent)' }}
        onClick={onClick}
      >
        {label}
      </button>
    </Row>
  )
}
