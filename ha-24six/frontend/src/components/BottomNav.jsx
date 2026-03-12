import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function BottomNav() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const tabs = [
    { path: '/', label: 'Home', icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'var(--muted)'}>
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    )},
    { path: '/search', label: 'Search', icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2.2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    )},
    { path: '/speakers', label: 'Speakers', icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'var(--muted)'}>
        <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/>
      </svg>
    )},
  ]
  return (
    <div style={{ height:'var(--nav-height)', background:'var(--surface)', borderTop:'1px solid var(--border)', display:'flex' }}>
      {tabs.map(t => {
        const active = pathname === t.path
        return (
          <button key={t.path} onClick={() => nav(t.path)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, background:'transparent', border:'none', cursor:'pointer' }}>
            {t.icon(active)}
            <span style={{ fontSize:10, fontWeight:600, letterSpacing:0.5, color: active ? 'var(--accent)' : 'var(--muted)', textTransform:'uppercase' }}>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
