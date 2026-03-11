import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function BannerCarousel({ banners = [] }) {
  const [idx, setIdx] = useState(0)
  const nav = useNavigate()
  const timer = useRef(null)

  useEffect(() => {
    if (banners.length < 2) return
    timer.current = setInterval(() => setIdx(i => (i + 1) % banners.length), 4000)
    return () => clearInterval(timer.current)
  }, [banners.length])

  if (!banners.length) return null
  const b = banners[idx]
  const imgUrl = api.imgUrl(b?.img || b?.image)

  const go = () => {
    if (b?.collection_id) nav(`/collection/${b.collection_id}`)
    else if (b?.artist_id) nav(`/artist/${b.artist_id}`)
  }

  return (
    <div style={{ padding: '0 16px', marginBottom: 20 }}>
      <div
        className="tappable"
        onClick={go}
        style={{
          height: 180, borderRadius: 14, overflow: 'hidden',
          position: 'relative', background: 'var(--card)'
        }}
      >
        {imgUrl && (
          <img src={imgUrl} style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transition: 'opacity 0.4s'
          }} />
        )}
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)'
        }} />
        {b?.title && (
          <div style={{
            position: 'absolute', bottom: 14, left: 14, right: 14,
            fontSize: 16, fontWeight: 700, color: '#fff',
            textShadow: '0 1px 4px rgba(0,0,0,0.6)'
          }}>{b.title}</div>
        )}
        {/* Dots */}
        {banners.length > 1 && (
          <div style={{
            position: 'absolute', bottom: 10, right: 14,
            display: 'flex', gap: 4
          }}>
            {banners.map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setIdx(i) }} style={{
                width: i === idx ? 16 : 6, height: 6,
                borderRadius: 3, background: i === idx ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.3s', cursor: 'pointer'
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
