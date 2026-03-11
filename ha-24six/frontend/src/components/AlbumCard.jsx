import React from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function AlbumCard({ item, size = 120, circle = false }) {
  const nav = useNavigate()
  if (!item) return null
  const imgUrl = api.imgUrl(item.img)
  const type = item.type || 'collection'

  const go = () => {
    if (type === 'artist') nav(`/artist/${item.id}`)
    else if (type === 'playlist') nav(`/playlist/${item.id}`)
    else nav(`/collection/${item.id}`)
  }

  return (
    <div className="tappable" onClick={go} style={{ width: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size,
        borderRadius: circle ? '50%' : 10,
        overflow: 'hidden', background: 'var(--card)', marginBottom: 6
      }}>
        {imgUrl
          ? <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'var(--muted)' }}>🎵</div>
        }
      </div>
      <div style={{
        fontSize: 11, fontWeight: 500, color: 'var(--text)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }}>{item.title || item.name}</div>
      {item.subtitle && (
        <div style={{
          fontSize: 10, color: 'var(--text-secondary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1
        }}>{item.subtitle}</div>
      )}
    </div>
  )
}
