import React, { useState } from 'react'
import AlbumCard from './AlbumCard'
import { SongGrid } from './SongListRow'

export default function SectionRow({ title, items = [], cardSize = 130, circle = false }) {
  const [expanded, setExpanded] = useState(false)
  if (!items?.length) return null

  // Detect if this section is a list of songs (not albums/artists/playlists)
  const isSongList = items[0]?.type === 'song' || items[0]?.type === 'content'

  // Build queue from all items in this row
  const rowQueue = isSongList ? items.map(s => ({
    id:     s.id,
    title:  s.title || '',
    artist: s.subtitle || s.artists?.map(a => a.name).join(', ') || '',
    img:    s.img || null,
  })) : []

  const PREVIEW = 9  // 3 columns × 3 rows visible by default
  const displayed = isSongList && !expanded ? items.slice(0, PREVIEW) : items

  return (
    <div style={{ marginBottom:28 }}>
      {/* Section header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', marginBottom: isSongList ? 6 : 10 }}>
        <span style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{title}</span>
        {isSongList && items.length > PREVIEW && (
          <span className="tappable" onClick={() => setExpanded(e => !e)}
            style={{ fontSize:12, color:'var(--accent)', fontWeight:500, cursor:'pointer' }}>
            {expanded ? 'Show less' : `View all (${items.length})`}
          </span>
        )}
      </div>

      {isSongList ? (
        // Song list: 3-column grid on wide screens, 1-column on narrow
        <div style={{ padding:'0 8px' }}>
          {/* Wide layout: 3 columns */}
          <div className="song-grid-wide">
            <SongGrid songs={displayed} columns={3} />
          </div>
          {/* Narrow layout: 1 column */}
          <div className="song-grid-narrow">
            <SongGrid songs={displayed} columns={1} />
          </div>
        </div>
      ) : (
        // Card scroll row
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
      )}
    </div>
  )
}
