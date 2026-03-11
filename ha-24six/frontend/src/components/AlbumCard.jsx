import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { usePlayer } from '../store/index.jsx'
import ContextMenu from './ContextMenu'

export default function AlbumCard({ item, size = 120, circle = false }) {
  const nav = useNavigate()
  const { playTrack } = usePlayer()
  const [menu, setMenu] = useState(false)
  const holdTimer = useRef(null)
  const moved = useRef(false)

  if (!item) return null
  const imgUrl = api.imgUrl(item.img)
  const type = item.type || 'collection'

  const isSong = type === 'song' || type === 'content'

  const toTrack = (s) => ({
    id: s.id,
    title: s.title || s.name,
    artist: s.artists?.map(a => a.name).join(', ') || s.subtitle || '',
    img: s.img
  })

  const go = () => {
    if (isSong) {
      playTrack(toTrack(item), [toTrack(item)], 0)
    } else if (type === 'artist') {
      nav(`/artist/${item.id}`)
    } else if (type === 'playlist') {
      nav(`/playlist/${item.id}`)
    } else {
      nav(`/collection/${item.id}`)
    }
  }

  const onPointerDown = () => {
    moved.current = false
    holdTimer.current = setTimeout(() => {
      if (!moved.current) setMenu(true)
    }, 500)
  }

  const onPointerMove = () => { moved.current = true }

  const onPointerUp = () => {
    clearTimeout(holdTimer.current)
  }

  const songForMenu = isSong ? toTrack(item) : null

  return (
    <>
      <div
        className="tappable"
        onClick={go}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ width: size, flexShrink: 0, userSelect: 'none' }}
      >
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

      {menu && songForMenu && (
        <ContextMenu
          song={songForMenu}
          queue={[songForMenu]}
          queueIndex={0}
          onClose={() => setMenu(false)}
        />
      )}
    </>
  )
}
