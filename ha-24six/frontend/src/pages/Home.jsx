import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import BannerCarousel from '../components/BannerCarousel'
import SectionRow from '../components/SectionRow'

function norm(arr, type) {
  if (!Array.isArray(arr)) return []
  return arr.map(item => ({
    id:       item.id,
    title:    item.title   || item.name,
    subtitle: item.subtitle|| item.artists?.map(a=>a.name).join(', ') || '',
    img:      item.img     || item.image || item.artwork?.[0]?.img,
    color:    item.color,
    type:     type || item.type || 'collection',
  })).filter(i => i.id)
}

function pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj[k]
    if (Array.isArray(v) && v.length) return v
  }
  return []
}

export default function Home() {
  const nav = useNavigate()
  const [sections, setSections] = useState([])
  const [banners,  setBanners]  = useState([])
  const [recent,   setRecent]   = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      api.home().catch(() => null),
      api.banners().catch(() => []),
      api.recent().catch(() => []),
    ]).then(([home, ban, rec]) => {
      // ── Debug: dump full shape so we can see exactly what the API returns ─
      const d = home || {}
      console.log('[Home] all keys:', Object.keys(d).join(', '))
      Object.entries(d).forEach(([k,v]) => {
        console.log(`[Home]  ${k}:`, Array.isArray(v) ? `array[${v.length}]` + (v[0] ? ' first_keys='+Object.keys(v[0]).join(',') : '') : typeof v)
      })

      // ── Banners ───────────────────────────────────────────────────────────
      const banArr = Array.isArray(ban) ? ban : ban?.data || []
      setBanners(banArr)

      // ── Recently Listened ─────────────────────────────────────────────────
      const recRaw = Array.isArray(rec) ? rec : rec?.content || rec?.data || []
      setRecent(recRaw)

      // ── Build sections from home data ─────────────────────────────────────
      // Based on APK analysis the home endpoint returns these top-level keys.
      // We try many aliases for each in case field names changed.
      const built = []

      const add = (title, items, type, opts = {}) => {
        if (items?.length) built.push({ title, items: norm(items, type), ...opts })
      }

      // Daily mix / personalized
      add('Your Daily Mix',     pick(d, 'dailyMix','daily_mix','mix','yourMix'), 'collection')
      // New releases (main featured row)
      add('Featured New Releases', pick(d, 'newReleases','new_releases','releases','featuredReleases','featured_releases','featured'), 'collection')
      // 24Six Presents / artist curated
      add('24Six Presents',     pick(d, 'presents','by24Six','curated','artistCurated'), 'collection')
      // My playlists
      add('My Playlists',       pick(d, 'myPlaylists','my_playlists','userPlaylists','user_playlists'), 'playlist')
      // Featured / 24Six playlists
      add('24Six Playlists',    pick(d, 'featuredPlaylists','featured_playlists','playlists'), 'playlist')
      // New albums
      add('New Albums',         pick(d, 'newAlbums','new_albums'), 'collection')
      // New singles
      add('New Singles',        pick(d, 'newSingles','new_singles','singles'), 'collection')
      // Stories
      add('New Stories',        pick(d, 'stories','newStories','story'), 'collection')
      // New artists
      add('Discover New Artists', pick(d, 'newArtists','new_artists'), 'artist', { circle: true })
      // Browse artists
      add('Browse Artists',     pick(d, 'artists'), 'artist', { circle: true })
      // Female artists / female collection
      add('Female Artists',     pick(d, 'female','femaleArtists','female_artists'), 'collection')

      // ── Per-category album rows ───────────────────────────────────────────
      // API often returns { categories: [{ id, title, data:[...] }, ...] }
      // or { featured: [{ category:{id,title}, data:[...] }, ...] }
      const catSource = pick(d, 'categories','featured','featured_categories')
      catSource.forEach(c => {
        const catTitle = c.title || c.category?.title || c.name
        const catItems = c.data || c.items || c.collections || c.releases || []
        if (catTitle && Array.isArray(catItems) && catItems.length) {
          built.push({ title: catTitle, items: norm(catItems, 'collection'), catId: c.id || c.category?.id })
        }
      })

      // ── Fallback: render any array key we haven't mapped yet ──────────────
      const mapped = new Set(['dailyMix','daily_mix','mix','yourMix',
        'newReleases','new_releases','releases','featuredReleases','featured_releases','featured',
        'presents','by24Six','curated','artistCurated',
        'myPlaylists','my_playlists','userPlaylists','user_playlists',
        'featuredPlaylists','featured_playlists','playlists',
        'newAlbums','new_albums','newSingles','new_singles','singles',
        'stories','newStories','story','newArtists','new_artists',
        'artists','female','femaleArtists','female_artists',
        'categories','featured_categories','banners','banner','data'])
      Object.entries(d).forEach(([k, v]) => {
        if (!mapped.has(k) && Array.isArray(v) && v.length && v[0]?.id) {
          console.log('[Home] unmapped section:', k, v.length, 'items')
          built.push({ title: k, items: norm(v) })
        }
      })

      setSections(built)
      setLoading(false)
    })
  }, [])

  // Refresh recent every time we come back to home
  useEffect(() => {
    const refresh = () => {
      api.recent().catch(() => []).then(rec => {
        const arr = Array.isArray(rec) ? rec : rec?.content || rec?.data || []
        setRecent(arr)
      })
    }
    // Poll every 60s while on home page (recent updates after plays)
    const t = setInterval(refresh, 60_000)
    return () => clearInterval(t)
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:12 }}>
      <div style={{ width:28, height:28, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <span style={{ color:'var(--muted)', fontSize:13 }}>Loading...</span>
    </div>
  )

  const recentNorm = norm(
    recent.map(r => ({ ...r, type: r.type==='content'?'song':(r.type||'song') })),
    'song'
  )

  // Card sizes matching 24Six app:
  // - Banners: full-width
  // - Most sections: 130px wide cards
  // - Artist circles: 90px
  // - Singles (square artwork only, no subtitle row): 100px
  // - Category rows: 130px

  return (
    <div>
      <div style={{ padding:'18px 16px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:22, fontWeight:700, color:'var(--accent)', letterSpacing:-0.5 }}>24Six</div>
      </div>

      {banners.length > 0 && <BannerCarousel banners={banners} />}

      {sections.map(({ title, items, circle, type, catId }) => {
        if (!items?.length) return null
        const isArtist  = type === 'artist'  || circle
        const isSingle  = title.toLowerCase().includes('single')
        const isStory   = title.toLowerCase().includes('stor')
        const size      = isArtist ? 90 : isSingle || isStory ? 100 : 130

        return (
          <SectionRow
            key={title + (catId||'')}
            title={title}
            items={items}
            cardSize={size}
            circle={!!isArtist}
          />
        )
      })}

      {/* Recently Listened — separate from sections so it refreshes independently */}
      {recentNorm.length > 0 && (
        <SectionRow
          title="Recently Listened"
          items={recentNorm}
          cardSize={100}
        />
      )}

      <div style={{ height:16 }} />
    </div>
  )
}
