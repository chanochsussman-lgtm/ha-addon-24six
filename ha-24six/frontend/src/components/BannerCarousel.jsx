import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

function getBannerRoute(b) {
  if (!b) return null
  // Every possible field combo the API might use
  const col = b.collection_id ?? b.collectionId ?? b.album_id ?? b.albumId
  const art = b.artist_id     ?? b.artistId
  const pla = b.playlist_id   ?? b.playlistId

  if (col) return `/collection/${col}`
  if (art) return `/artist/${art}`
  if (pla) return `/playlist/${pla}`

  // type + id  e.g. { type:'collection', id:5 }  or  { link_type:'artist', link_id:3 }
  const type = b.type || b.link_type || b.target_type || b.content_type
  const tid  = b.target_id ?? b.link_id

  if (type && tid) {
    if (type==='collection'||type==='album') return `/collection/${tid}`
    if (type==='artist')                     return `/artist/${tid}`
    if (type==='playlist')                   return `/playlist/${tid}`
  }

  // If the banner itself has a numeric id and a type field
  if (type && b.id) {
    if (type==='collection'||type==='album') return `/collection/${b.id}`
    if (type==='artist')                     return `/artist/${b.id}`
    if (type==='playlist')                   return `/playlist/${b.id}`
  }

  // URL/deep-link field
  const url = b.link || b.url || b.target_url || b.deep_link || b.action_url
  if (url) {
    const m = url.match(/\/(collection|album|artist|playlist)s?\/(\d+)/i)
    if (m) {
      const map = { album:'collection', collection:'collection', artist:'artist', playlist:'playlist' }
      return `/${map[m[1].toLowerCase()]||m[1]}/${m[2]}`
    }
  }
  return null
}

export default function BannerCarousel({ banners = [] }) {
  const [idx,    setIdx]    = useState(0)
  const [fade,   setFade]   = useState(false)
  const nav                 = useNavigate()
  const timer               = useRef(null)
  const valid               = banners.filter(Boolean)

  useEffect(() => {
    if (valid.length < 2) return
    timer.current = setInterval(() => {
      setFade(true)
      setTimeout(() => { setIdx(i => (i+1) % valid.length); setFade(false) }, 180)
    }, 4500)
    return () => clearInterval(timer.current)
  }, [valid.length])

  if (!valid.length) return null

  const b      = valid[idx]
  const imgSrc = b.img || b.image || b.banner_img || b.banner_image || b.thumbnail || b.cover || b.artwork
  const imgUrl = imgSrc ? api.imgUrl(imgSrc) : null
  const route  = getBannerRoute(b)

  // Debug — shows in browser console until we confirm shapes work
  console.log(`[banner ${idx}] keys=${Object.keys(b).join(',')} route=${route} img=${imgSrc?.slice(0,60)}`)

  return (
    <div style={{ padding:'0 16px', marginBottom:20 }}>
      <div
        onClick={route ? () => nav(route) : undefined}
        style={{ height:180, borderRadius:14, overflow:'hidden', position:'relative', background:'var(--card)', cursor:route?'pointer':'default', boxShadow:'0 4px 24px rgba(0,0,0,0.4)' }}>

        {imgUrl && (
          <img src={imgUrl} style={{ width:'100%', height:'100%', objectFit:'cover', opacity:fade?0:1, transition:'opacity 0.18s' }} />
        )}

        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)' }} />

        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px 14px' }}>
          {b.title && <div style={{ fontSize:16, fontWeight:700, color:'#fff', textShadow:'0 1px 6px rgba(0,0,0,0.8)', lineHeight:1.3, marginBottom: route ? 6 : 0 }}>{b.title}</div>}
          {route && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(200,168,75,0.3)', border:'1px solid rgba(200,168,75,0.5)', borderRadius:6, padding:'3px 10px' }}>
              <span style={{ fontSize:10, fontWeight:700, color:'var(--accent)', letterSpacing:0.6 }}>LISTEN NOW</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--accent)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </div>
          )}
        </div>

        {valid.length > 1 && (
          <div style={{ position:'absolute', top:10, right:12, display:'flex', gap:4 }}>
            {valid.map((_, i) => (
              <div key={i}
                onClick={e => { e.stopPropagation(); clearInterval(timer.current); setIdx(i) }}
                style={{ width:i===idx?18:6, height:6, borderRadius:3, background:i===idx?'var(--accent)':'rgba(255,255,255,0.4)', transition:'all 0.3s', cursor:'pointer' }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
