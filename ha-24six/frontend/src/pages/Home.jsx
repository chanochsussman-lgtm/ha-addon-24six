import React, { useEffect, useState } from 'react'
import { api } from '../api'
import BannerCarousel from '../components/BannerCarousel'
import SectionRow from '../components/SectionRow'

// Normalize items to a common shape
function normalizeItems(arr, defaultType = 'collection') {
  if (!Array.isArray(arr)) return []
  return arr.map(item => ({
    id: item.id,
    title: item.title || item.name,
    subtitle: item.subtitle || item.artists?.map(a => a.name).join(', ') || '',
    img: item.img || item.image || item.artwork?.[0]?.img,
    type: item.type || defaultType,
    color: item.color,
    artists: item.artists,
  })).filter(i => i.id)
}

// Try many possible keys for each section
function extractSection(data, keys) {
  for (const key of keys) {
    const val = data[key]
    if (Array.isArray(val) && val.length > 0) return val
  }
  return []
}

export default function Home() {
  const [homeData, setHomeData] = useState(null)
  const [banners, setBanners]   = useState([])
  const [recent, setRecent]     = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.home().catch(() => null),
      api.banners().catch(() => []),
      api.recent().catch(() => []),
    ]).then(([home, ban, rec]) => {
      console.log('[Home] top-level keys:', Object.keys(home || {}))
      console.log('[Home] sample values:', Object.entries(home||{}).map(([k,v])=>`${k}:${Array.isArray(v)?`arr[${v.length}]`:typeof v}`).join(', '))
      console.log('[Recent] type:', typeof rec, Array.isArray(rec) ? `arr[${rec.length}]` : Object.keys(rec||{}))
      setHomeData(home)
      // banners can be top-level or nested
      const banArr = Array.isArray(ban) ? ban : (ban?.banners || ban?.data || [])
      setBanners(banArr)
      const recArr = Array.isArray(rec) ? rec : (rec?.content || rec?.contents || rec?.data || [])
      setRecent(recArr)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--muted)', fontSize: 13 }}>Loading...</span>
    </div>
  )

  const d = homeData || {}

  // Map sections - try many possible key names from the API
  const sections = [
    {
      title: 'Featured New Releases',
      items: normalizeItems(extractSection(d, ['releases', 'newReleases', 'featured', 'featured_releases', 'new_releases', 'featuredReleases'])),
    },
    {
      title: 'Trending Now',
      items: normalizeItems(extractSection(d, ['trending', 'trending_now', 'trendingNow', 'popular'])),
    },
    {
      title: '24Six Presents',
      items: normalizeItems(extractSection(d, ['by24Six', 'presents', '24sixPresents', 'curated'])),
    },
    {
      title: 'My Playlists',
      items: normalizeItems(extractSection(d, ['myPlaylists', 'my_playlists', 'userPlaylists']), 'playlist'),
      type: 'playlist',
    },
    {
      title: '24Six Playlists',
      items: normalizeItems(extractSection(d, ['playlists', 'featuredPlaylists', 'featured_playlists']), 'playlist'),
      type: 'playlist',
    },
    {
      title: 'New Albums',
      items: normalizeItems(extractSection(d, ['newAlbums', 'new_albums', 'albums'])),
    },
    {
      title: 'New Singles',
      items: normalizeItems(extractSection(d, ['newSingles', 'new_singles', 'singles'])),
    },
    {
      title: 'New Stories',
      items: normalizeItems(extractSection(d, ['stories', 'newStories', 'new_stories'])),
    },
    {
      title: 'Discover New Artists',
      items: normalizeItems(extractSection(d, ['newArtists', 'new_artists', 'featuredArtists']), 'artist'),
      circle: true,
      type: 'artist',
    },
    {
      title: 'Recently Listened',
      items: normalizeItems(recent.map(r => ({ ...r, type: r.type === 'content' ? 'song' : (r.type || 'song') })), 'song'),
    },
    {
      title: 'Browse Artists',
      items: normalizeItems(extractSection(d, ['artists']), 'artist'),
      circle: true,
      type: 'artist',
    },
    {
      title: 'Female Artists',
      items: normalizeItems(extractSection(d, ['femaleArtists', 'female', 'female_artists']), 'collection'),
    },
  ]

  // Category rows
  const cats = extractSection(d, ['categories', 'featured', 'featured_categories'])
  const categoryRows = Array.isArray(cats)
    ? cats
        .filter(c => Array.isArray(c.collections || c.data || c.items) && (c.collections || c.data || c.items).length > 0)
        .map(c => ({
          key: `cat_${c.id || c.category?.id}`,
          title: c.title || c.category?.title,
          items: normalizeItems(c.collections || c.data || c.items || []),
        }))
    : []

  // Fallback: if homeData has an array of unknown sections, try to render them
  const knownKeys = new Set(['releases','newReleases','featured','trending','trendingNow','by24Six','presents','myPlaylists','playlists','featuredPlaylists','newAlbums','newSingles','stories','newArtists','artists','femaleArtists','categories','banners','banner'])
  const unknownSections = Object.entries(d)
    .filter(([k, v]) => !knownKeys.has(k) && Array.isArray(v) && v.length > 0 && v[0]?.id)
    .map(([k, v]) => ({ title: k, items: normalizeItems(v) }))

  return (
    <div>
      <div style={{ padding: '18px 16px 10px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', letterSpacing: -0.5 }}>24Six</div>
      </div>

      {banners.length > 0 && <BannerCarousel banners={banners} />}

      {sections.map(({ title, items, circle, type }) => {
        if (!items?.length) return null
        const mapped = type ? items.map(i => ({ ...i, type })) : items
        return (
          <SectionRow
            key={title}
            title={title}
            items={mapped}
            cardSize={circle ? 95 : 120}
            circle={!!circle}
          />
        )
      })}

      {categoryRows.map(({ key, title, items }) => (
        <SectionRow key={key} title={title} items={items} cardSize={120} />
      ))}

      {unknownSections.map(({ title, items }) => (
        <SectionRow key={title} title={title} items={items} cardSize={120} />
      ))}
    </div>
  )
}
