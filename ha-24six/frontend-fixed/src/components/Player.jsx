import React from 'react'
import { usePlayer } from '../store/index.jsx'
import { api } from '../api'

export default function Player() {
  const { track, playing, progress, duration, loading, togglePlay, seek, playNext, playPrev } = usePlayer()

  const pct = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
      {/* Progress bar - always visible, tappable */}
      <div
        style={{ height: 3, background: 'var(--border)', cursor: 'pointer' }}
        onClick={e => {
          if (!duration) return
          const r = e.currentTarget.getBoundingClientRect()
          seek(((e.clientX - r.left) / r.width) * duration)
        }}
      >
        <div style={{
          height: '100%', background: 'var(--accent)',
          width: `${pct}%`, transition: 'width 0.5s linear'
        }} />
      </div>

      <div style={{
        height: 'calc(var(--player-height) - 3px)',
        display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px'
      }}>
        {/* Artwork */}
        <div style={{
          width: 40, height: 40, borderRadius: 6, flexShrink: 0,
          background: 'var(--card)', overflow: 'hidden'
        }}>
          {track?.img
            ? <img src={api.imgUrl(track.img)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎵</div>
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: track ? 'var(--text)' : 'var(--muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>{track?.title || 'No track playing'}</div>
          {track?.artist && (
            <div style={{
              fontSize: 11, color: 'var(--text-secondary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>{track.artist}</div>
          )}
        </div>

        {/* Controls */}
        {track && <>
          <button onClick={playPrev} style={{ background: 'transparent', padding: 6 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-secondary)">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
            </svg>
          </button>

          <button onClick={togglePlay} style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {loading
              ? <div style={{ width: 13, height: 13, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : playing
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#000"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="#000" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg>
            }
          </button>

          <button onClick={playNext} style={{ background: 'transparent', padding: 6 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-secondary)">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </>}
      </div>
    </div>
  )
}
