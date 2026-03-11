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
  // Support many possible image field names
  const imgSrc = b?.img || b?.image || b?.banner_img || b?.banner_image
  const imgUrl = api.imgUrl(imgSrc)

  const go = () => {
    // Support many possible link field names
    const colId = b?.collection_id || b?.collectionId || b?.album_id || b?.albumId
    const artId = b?.artist_id || b?.artistId
    const playId = b?.playlist_id || b?.playlistId
    const linkUrl = b?.link || b?.url

    if (colId) nav(`/collection/${colId}`)
    else if (artId) nav(`/artist/${artId}`)
    else if (playId) nav(`/playlist/${playId}`)
    else if (linkUrl) {
      // Try to parse internal route from URL
      const match = linkUrl.match(/\/(collection|artist|playlist)\/(\d+)/)
      if (match) nav(`/${match[1]}/${match[2]}`)
    }
  }

  const hasLink = !!(b?.collection_id || b?.collectionId || b?.album_id || b?.albumId ||
    b?.artist_id || b?.artistId || b?.playlist_id || b?.playlistId || b?.link || b?.url)

  return (
    <div style={{ padding: '0 16px', marginBottom: 20 }}>
      <div
        className={hasLink ? 'tappable' : ''}
        onClick={hasLink ? go : undefined}
        style={{
          height: 180, borderRadius: 14, overflow: 'hidden',
          position: 'relative', background: 'var(--card)',
          cursor: hasLink ? 'pointer' : 'default'
        }}
      >
        {imgUrl && (
          <img
            src={imgUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.4s' }}
          />
        )}
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
        {banners.length > 1 && (
          <div style={{ position: 'absolute', bottom: 10, right: 14, display: 'flex', gap: 4 }}>
            {banners.map((_, i) => (
              <div
                key={i}
                onClick={e => { e.stopPropagation(); setIdx(i) }}
                style={{
                  width: i === idx ? 16 : 6, height: 6,
                  borderRadius: 3,
                  background: i === idx ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.3s', cursor: 'pointer'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
