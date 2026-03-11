import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function BottomNav() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const tabs = [
    { path: '/', label: 'Home', icon: p => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={p ? 'var(--accent)' : 'var(--muted)'}>
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    )},
    { path: '/search', label: 'Search', icon: p => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={p ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2.2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    )},
  ]
  return (
    <div style={{
      height: 'var(--nav-height)', background: 'var(--surface)',
      borderTop: '1px solid var(--border)', display: 'flex'
    }}>
      {tabs.map(t => {
        const active = pathname === t.path
        return (
          <button key={t.path} onClick={() => nav(t.path)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3,
            background: 'transparent'
          }}>
            {t.icon(active)}
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
              color: active ? 'var(--accent)' : 'var(--muted)',
              textTransform: 'uppercase'
            }}>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
