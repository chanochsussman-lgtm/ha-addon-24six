import React from 'react'
import AlbumCard from './AlbumCard'

export default function SectionRow({ title, items = [], cardSize = 120, circle = false, onShowAll }) {
  if (!items?.length) return null
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', marginBottom: 10
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
        {onShowAll && (
          <span
            className="tappable"
            onClick={onShowAll}
            style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}
          >Show all</span>
        )}
      </div>
      <div className="scroll-row" style={{ padding: '2px 16px' }}>
        {items.map((item, i) => (
          <AlbumCard key={item?.id || i} item={item} size={cardSize} circle={circle} />
        ))}
      </div>
    </div>
  )
}
