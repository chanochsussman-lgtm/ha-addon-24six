import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { usePlayer } from '../store/index.jsx'
import ContextMenu from './ContextMenu'

export default function AlbumCard({ item, size = 120, circle = false, rowQueue = null, rowQueueIdx = 0 }) {
  const nav = useNavigate()
  const { playTrack } = usePlayer()
  const [menu, setMenu] = useState(false)
  const holdTimer = useRef(null)
  const moved = useRef(false)

  if (!item) return null
  const imgUrl = (type === 'category') ? null : api.imgUrl(item.img)
  const type   = item.type || 'collection'
  const isSong = type === 'song' || type === 'content'

  const toTrack = (s) => ({
    id:     s.id,
    title:  s.title || s.name || '',
    artist: s.artists?.map(a => a.name).join(', ') || s.subtitle || '',
    img:    s.img || null,
  })

  const go = () => {
    if (isSong) {
      const q   = rowQueue?.length ? rowQueue : [toTrack(item)]
      const idx = rowQueue?.length ? rowQueueIdx : 0
      playTrack(q[idx], q, idx)
    } else if (type === 'artist')   nav(`/artist/${item.id}`)
    else if (type === 'playlist')   nav(`/playlist/${item.id}`)
    else if (type === 'category')   nav(`/category/${item.id}`)
    else                            nav(`/collection/${item.id}`)
  }

  const onPointerDown = (e) => {
    if (e.button === 2) return
    moved.current = false
    holdTimer.current = setTimeout(() => {
      if (!moved.current && isSong) setMenu(true)
    }, 500)
  }
  const onPointerMove   = () => { moved.current = true; clearTimeout(holdTimer.current) }
  const onPointerUp     = () => clearTimeout(holdTimer.current)
  const onContextMenu   = (e) => { e.preventDefault(); clearTimeout(holdTimer.current); if (isSong) setMenu(true) }

  return (
    <>
      <div className="tappable" onClick={go}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onContextMenu={onContextMenu}
        style={{ width:size, flexShrink:0, userSelect:'none' }}>
        <div style={{ width:size, height:size, borderRadius:circle?'50%':10, overflow:'hidden', background:'var(--card)', marginBottom:6 }}>
          {type === 'category'
            ? <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background: item.color || 'var(--card)', padding:6 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#fff', textAlign:'center', lineHeight:1.3 }}>{item.title}</span>
              </div>
            : imgUrl
              ? <img src={imgUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, color:'var(--muted)' }}>🎵</div>
          }
        </div>
        <div style={{ fontSize:11, fontWeight:500, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {item.title || item.name}
        </div>
        {item.subtitle && (
          <div style={{ fontSize:10, color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:1 }}>
            {item.subtitle}
          </div>
        )}
      </div>

      {menu && (
        <ContextMenu
          song={toTrack(item)}
          queue={rowQueue || [toTrack(item)]}
          queueIndex={rowQueueIdx}
          onClose={() => setMenu(false)}
        />
      )}
    </>
  )
}
