import React, { useEffect, useState } from 'react'
import { api } from '../api'
import BannerCarousel from '../components/BannerCarousel'
import SectionRow from '../components/SectionRow'

export default function Home() {
  const [sections, setSections] = useState([])
  const [banners, setBanners]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.home().catch(() => null),
      api.banners ? api.banners().catch(() => null) : Promise.resolve(null)
    ]).then(([homeData, bannerData]) => {
      // Extract banners
      const bArr = bannerData?.banners || bannerData?.data || (Array.isArray(bannerData) ? bannerData : [])
      setBanners(bArr)

      // Extract sections from home data
      // The /app/music endpoint returns Inertia props
      const props = homeData?.props || homeData
      const raw =
        props?.sections ||
        props?.featured ||
        homeData  // if it's already an array

      if (Array.isArray(raw)) {
        setSections(raw)
      } else if (raw && typeof raw === 'object') {
        // Try to find any array in the response
        const found = Object.values(raw).find(v => Array.isArray(v))
        if (found) setSections(found)
      }
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--muted)', fontSize: 13 }}>Loading...</span>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '18px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', letterSpacing: -0.5 }}>24Six</div>
      </div>

      {/* Banner carousel */}
      {banners.length > 0 && <BannerCarousel banners={banners} />}

      {/* Sections */}
      {sections.map((section, i) => {
        const title = section?.category?.title || section?.title || section?.name || `Section ${i+1}`
        const items = section?.data || section?.items || section?.collections || []
        if (!items.length) return null
        // Artist sections use circles
        const isArtist = title.toLowerCase().includes('artist')
        return (
          <SectionRow
            key={section?.category?.id || section?.id || i}
            title={title}
            items={items}
            cardSize={isArtist ? 100 : 120}
            circle={isArtist}
          />
        )
      })}

      {!loading && sections.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
          No content found. Check server logs.
        </div>
      )}
    </div>
  )
}
