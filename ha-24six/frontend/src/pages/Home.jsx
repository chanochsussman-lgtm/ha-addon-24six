import React, { useEffect, useState } from 'react'
import { api } from '../api'
import BannerCarousel from '../components/BannerCarousel'
import SectionRow from '../components/SectionRow'

export default function Home() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.home().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--muted)', fontSize: 13 }}>Loading...</span>
    </div>
  )

  if (!data) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No content found</div>
  )

  const sections = [
    { key: 'releases',      title: 'Featured New Releases' },
    { key: 'trending',      title: 'Trending Now' },
    { key: 'by24Six',       title: '24Six Presents' },
    { key: 'myPlaylists',   title: 'My Playlists',      type: 'playlist' },
    { key: 'playlists',     title: '24Six Playlists',   type: 'playlist' },
    { key: 'newAlbums',     title: 'New Albums' },
    { key: 'newSingles',    title: 'New Singles' },
    { key: 'newStories',    title: 'New Stories' },
    { key: 'newArtists',    title: 'Discover New Artists', circle: true },
    { key: 'recent',        title: 'Recently Listened' },
    { key: 'artists',       title: 'Browse Artists',    circle: true },
    { key: 'femaleArtists', title: 'Female Artists',    circle: true },
  ]

  const categoryRows = Array.isArray(data.categories)
    ? data.categories
        .filter(c => Array.isArray(c.collections) && c.collections.length > 0)
        .map(c => ({ key: `cat_${c.id}`, title: c.title, items: c.collections }))
    : []

  return (
    <div>
      <div style={{ padding: '18px 16px 10px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', letterSpacing: -0.5 }}>24Six</div>
      </div>

      {Array.isArray(data.banners) && data.banners.length > 0 && (
        <BannerCarousel banners={data.banners} />
      )}

      {sections.map(({ key, title, circle, type }) => {
        let items = data[key]
        if (!Array.isArray(items) || items.length === 0) return null
        if (type) items = items.map(i => ({ ...i, type }))
        return (
          <SectionRow
            key={key}
            title={title}
            items={items}
            cardSize={circle ? 95 : key === 'categories' ? 100 : 120}
            circle={circle}
          />
        )
      })}

      {categoryRows.map(({ key, title, items }) => (
        <SectionRow key={key} title={title} items={items} cardSize={120} />
      ))}
    </div>
  )
}
