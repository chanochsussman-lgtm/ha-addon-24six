import React from 'react'
import AlbumCard from './AlbumCard'

export default function SectionRow({ title, items = [], cardSize = 120, circle = false, onShowAll }) {
  if (!items?.length) return null

  // Build a flat song queue from all song-type items in this row
  // so tapping any song plays it with the whole row as context
  const songItems = items.filter(i => i?.type === 'song' || i?.type === 'content')
  const rowQueue  = songItems.map(s => ({
    id:     s.id,
    title:  s.title || s.name || '',
    artist: s.artists?.map(a => a.name).join(', ') || s.subtitle || '',
    img:    s.img || null,
  }))

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', marginBottom:10 }}>
        <span style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{title}</span>
        {onShowAll && (
          <span className="tappable" onClick={onShowAll}
            style={{ fontSize:12, color:'var(--accent)', fontWeight:500 }}>Show all</span>
        )}
      </div>
      <div className="scroll-row" style={{ padding:'2px 16px' }}>
        {items.map((item, i) => {
          const isSong = item?.type === 'song' || item?.type === 'content'
          const queueIdx = isSong ? rowQueue.findIndex(q => q.id === item?.id) : 0
          return (
            <AlbumCard
              key={item?.id || i}
              item={item}
              size={cardSize}
              circle={circle}
              rowQueue={isSong ? rowQueue : null}
              rowQueueIdx={isSong ? queueIdx : 0}
            />
          )
        })}
      </div>
    </div>
  )
}
