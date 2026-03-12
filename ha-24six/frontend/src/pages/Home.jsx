import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { extractHome, extractBanners, extractRecent, normItem } from '../extract.js'
import BannerCarousel from '../components/BannerCarousel'
import SectionRow from '../components/SectionRow'

export default function Home() {
  const [sections, setSections] = useState([])
  const [banners,  setBanners]  = useState([])
  const [recent,   setRecent]   = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = () => {
    // Home call only — recent is already inside home response
    api.home().catch(() => null).then(home => {
      try {
        const homeData = home || {}
        console.log('[Home] loaded, keys:', Object.keys(homeData))

        setBanners(extractBanners(homeData.banners || homeData.banner))

        const apiRecent = Array.isArray(homeData.recent) ? homeData.recent : []
        setRecent(apiRecent)

        const { sections } = extractHome(homeData)
        setSections(sections)
      } catch(e) {
        console.error('[Home] render error:', e)
      }
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  // Refresh home every 60s (recent is inside home response)
  useEffect(() => {
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:12 }}>
      <div style={{ width:28, height:28, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <span style={{ color:'var(--muted)', fontSize:13 }}>Loading...</span>
    </div>
  )

  const recentItems = recent
    .map(r => normItem({ ...r, type: r.type === 'content' ? 'song' : (r.type || 'song') }))
    .filter(i => i?.id)

  return (
    <div>
      <div style={{ padding:'18px 16px 10px' }}>
        <div style={{ fontSize:22, fontWeight:700, color:'var(--accent)', letterSpacing:-0.5 }}>24Six</div>
      </div>

      {banners.length > 0 && <BannerCarousel banners={banners} />}

      {sections.map(({ title, items, circle, catId }) => {
        if (!items?.length) return null
        const isArtist = items[0]?.type === 'artist' || circle
        const isSingle = title.toLowerCase().includes('single')
        const isStory  = title.toLowerCase().includes('stor')
        const size     = isArtist ? 90 : (isSingle || isStory) ? 100 : 130
        return (
          <SectionRow
            key={title + (catId || '')}
            title={title}
            items={items}
            cardSize={size}
            circle={!!isArtist}
          />
        )
      })}

      {recentItems.length > 0 && (
        <SectionRow title="Recently Listened" items={recentItems.map(i => ({ ...i, type:'song' }))} cardSize={100} />
      )}

      <div style={{ height:16 }} />
    </div>
  )
}
