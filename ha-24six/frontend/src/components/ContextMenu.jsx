import React, { useEffect, useState } from 'react'
import { usePlayer } from '../store/index.jsx'
import { api } from '../api'

export default function ContextMenu({ song, queue, queueIndex, onClose }) {
  const { playTrack, playNext, addToQueue } = usePlayer()
  const [favDone, setFavDone] = useState(null) // null | 'added' | 'removed' | 'error'
  const imgUrl = api.imgUrl(song?.img)

  useEffect(() => {
    const handler = (e) => {
      // Close on outside click but not inside the sheet
      onClose()
    }
    const t = setTimeout(() => document.addEventListener('pointerdown', handler), 100)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', handler) }
  }, [onClose])

  if (!song) return null

  const actions = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--accent)"><path d="M8 5v14l11-7z"/></svg>
      ),
      label: 'Play now',
      action: () => playTrack(song, queue || [song], queueIndex || 0)
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
      ),
      label: 'Play next',
      action: () => playNext(song)
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      ),
      label: 'Add to queue',
      action: () => addToQueue(song)
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill={favDone === 'added' ? '#e05' : 'var(--text-secondary)'}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      ),
      label: favDone === 'added' ? 'Favorited ✓' : favDone === 'error' ? 'Error — try again' : 'Add to favorites',
      action: async () => {
        try {
          await api.addFavorite(song.id)
          setFavDone('added')
        } catch { setFavDone('error') }
      }
    },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}
    >
      <div
        onPointerDown={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', paddingBottom: 'max(28px, env(safe-area-inset-bottom))', animation: 'slideUp 0.22s ease' }}
      >
        {/* Song info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 46, height: 46, borderRadius: 8, overflow: 'hidden', background: 'var(--card)', flexShrink: 0 }}>
            {imgUrl
              ? <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎵</div>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
            {song.artist && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{song.artist}</div>}
          </div>
        </div>

        {/* Actions */}
        {actions.map(({ icon, label, action }) => (
          <div
            key={label}
            className="tappable"
            onClick={() => { action(); if (label !== 'Add to favorites') onClose() }}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '15px 24px', cursor: 'pointer', fontSize: 15, color: 'var(--text)' }}
          >
            <span style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
            {label}
          </div>
        ))}

        {/* Cancel */}
        <div
          className="tappable"
          onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 24px', marginTop: 4, cursor: 'pointer', fontSize: 15, color: 'var(--muted)', borderTop: '1px solid var(--border)' }}
        >Cancel</div>
      </div>
    </div>
  )
}
