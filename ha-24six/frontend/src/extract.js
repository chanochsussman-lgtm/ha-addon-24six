/**
 * extract.js — shared raw API response extraction utilities
 *
 * The 24Six API shape changes. Every function here:
 *   1. Logs the full raw response to console so you can see what changed
 *   2. Walks all known and unknown keys to find useful data
 *   3. Never crashes — always returns a safe default
 */

function log(label, d) {
  if (!d) { console.log(`[${label}] null response`); return }
  console.log(`[${label}] keys:`, Object.keys(d))
  // Log each key's shape
  Object.entries(d).forEach(([k, v]) => {
    if (Array.isArray(v))
      console.log(`[${label}]  .${k} = array[${v.length}]`, v[0] ? Object.keys(v[0]) : '')
    else if (v && typeof v === 'object')
      console.log(`[${label}]  .${k} = object`, Object.keys(v))
    else
      console.log(`[${label}]  .${k} =`, v)
  })
}

// Find any array of items with .id in an object, walking one level deep
export function findArray(d, preferKeys = []) {
  if (!d) return []
  if (Array.isArray(d)) return d
  // Try preferred keys first
  for (const k of preferKeys) {
    if (Array.isArray(d[k]) && d[k].length > 0) return d[k]
  }
  // Then all known content keys
  for (const k of ['content','songs','items','data','results','list','tracks','collections','albums','playlists']) {
    if (Array.isArray(d[k]) && d[k].length > 0) return d[k]
  }
  // One envelope level deeper
  if (d.data && typeof d.data === 'object' && !Array.isArray(d.data)) {
    return findArray(d.data, preferKeys)
  }
  return []
}

// Normalize any item into a display-safe card object
export function normItem(item, fallbackType) {
  if (!item) return null
  return {
    id:       item.id,
    title:    item.title    || item.name        || '',
    subtitle: item.subtitle || item.artists?.map(a => a.name).join(', ') || item.author || '',
    img:      item.img      || item.image       || item.artwork?.[0]?.img || item.thumbnail || null,
    color:    item.color    || null,
    type:     item.type     || fallbackType      || 'collection',
    // preserve original fields for navigation
    artistId:     item.artist_id    || item.artistId    || null,
    collectionId: item.collection_id|| item.collectionId|| null,
    length:       item.length       || item.duration    || 0,
    artists:      item.artists      || [],
  }
}

// Normalize a song into a player track object
export function normTrack(item, fallbackImg, fallbackArtist) {
  if (!item) return null
  return {
    id:     item.id,
    title:  item.title  || item.name  || '',
    artist: item.artists?.map(a => a.name).join(', ') || item.subtitle || fallbackArtist || '',
    img:    item.img    || fallbackImg || null,
    artistId:     item.artist_id    || item.artistId    || null,
    collectionId: item.collection_id|| item.collectionId|| null,
  }
}

// ── Per-page extractors ──────────────────────────────────────────────────────

export function extractHome(d) {
  log('Home', d)
  if (!d) return { sections: [], banners: [] }

  const sections = []

  const add = (title, items, type, opts = {}) => {
    if (!Array.isArray(items) || !items.length) return
    sections.push({ title, items: items.map(i => normItem(i, type)).filter(Boolean), ...opts })
  }

  // Named sections — try every alias we know of
  const p = (d, ...keys) => { for (const k of keys) { if (Array.isArray(d[k]) && d[k].length) return d[k] } return null }

  add('Your Daily Mix',        p(d,'dailyMix','daily_mix','mix','yourMix'),                            'collection')
  add('Featured New Releases', p(d,'newReleases','new_releases','releases','featuredReleases','featured_releases'), 'collection')
  add('24Six Presents',        p(d,'presents','by24Six','curated','artistCurated'),                    'collection')
  add('My Playlists',          p(d,'myPlaylists','my_playlists','userPlaylists','user_playlists'),      'playlist')
  add('24Six Playlists',       p(d,'featuredPlaylists','featured_playlists','playlists'),               'playlist')
  add('New Albums',            p(d,'newAlbums','new_albums'),                                           'collection')
  add('New Singles',           p(d,'newSingles','new_singles','singles'),                               'collection')
  add('New Stories',           p(d,'stories','newStories','story'),                                     'collection')
  add('Discover New Artists',  p(d,'newArtists','new_artists'),                                         'artist', { circle: true })
  add('Browse Artists',        p(d,'artists'),                                                          'artist', { circle: true })
  add('Female Artists',        p(d,'female','femaleArtists','female_artists'),                          'collection')

  // Category rows — { categories: [{id,title,data:[]}] } or { featured: [{category:{},data:[]}] }
  const catSource = p(d,'categories','featured','featured_categories') || []
  catSource.forEach(c => {
    const title = c.title || c.category?.title || c.name || c.category?.name
    const items = c.data  || c.items || c.collections || c.releases || []
    if (title && Array.isArray(items) && items.length)
      sections.push({ title, items: items.map(i => normItem(i,'collection')).filter(Boolean), catId: c.id || c.category?.id })
  })

  // Fallback: render any unmapped array key that has items with .id
  const mapped = new Set(['dailyMix','daily_mix','mix','yourMix','newReleases','new_releases',
    'releases','featuredReleases','featured_releases','featured','presents','by24Six','curated',
    'artistCurated','myPlaylists','my_playlists','userPlaylists','user_playlists','featuredPlaylists',
    'featured_playlists','playlists','newAlbums','new_albums','newSingles','new_singles','singles',
    'stories','newStories','story','newArtists','new_artists','artists','female','femaleArtists',
    'female_artists','categories','featured_categories','banners','banner','data','meta','pagination',
    'csrf_token'])
  Object.entries(d).forEach(([k, v]) => {
    if (!mapped.has(k) && Array.isArray(v) && v.length && v[0]?.id) {
      console.log('[Home] unmapped key → adding section:', k, v.length, 'items, sample keys:', Object.keys(v[0]))
      sections.push({ title: k, items: v.map(i => normItem(i)).filter(Boolean) })
    }
  })

  return { sections }
}

export function extractBanners(d) {
  log('Banners', d)
  if (!d) return []
  if (Array.isArray(d)) return d
  if (Array.isArray(d.data))    return d.data
  if (Array.isArray(d.banners)) return d.banners
  if (Array.isArray(d.items))   return d.items
  return []
}

export function extractRecent(d) {
  log('Recent', d)
  if (!d) return []
  // Server returns { local:[], api:<raw> }
  const local = Array.isArray(d.local) ? d.local : []
  const api   = d.api
  let apiItems = []
  if (api) {
    if (Array.isArray(api))              apiItems = api
    else if (Array.isArray(api.content)) apiItems = api.content
    else if (Array.isArray(api.data))    apiItems = api.data
    else if (Array.isArray(api.items))   apiItems = api.items
  }
  const localIds = new Set(local.map(i => i.id))
  return [...local, ...apiItems.filter(i => i.id && !localIds.has(i.id))].slice(0, 30)
}

export function extractCollection(d) {
  log('Collection', d)
  if (!d) return { meta: {}, songs: [] }
  // Possible shapes: { collection:{...contents:[]} } or flat with contents/songs/data
  const meta  = d.collection || (d.id ? d : d.data || {})
  const songs = findArray(meta, ['contents','songs','content','items','tracks'])
              || findArray(d,   ['contents','songs','content','items','tracks'])
  return { meta, songs: Array.isArray(songs) ? songs : [] }
}

export function extractArtist(d) {
  log('Artist', d)
  if (!d) return { artist: {}, songs: [], albums: [], similar: [] }
  const artist   = (d.artist && typeof d.artist === 'object' && !Array.isArray(d.artist))
                 ? d.artist
                 : (d.id && d.name ? d : {})
  const songs    = findArray(d, ['top_songs','content','songs'])
  const albums   = findArray(d, ['latest_albums','collections','albums','featured_on'])
  const similar  = Array.isArray(d.similar) ? d.similar : []
  return { artist, songs, albums, similar }
}

export function extractPlaylist(d) {
  log('Playlist', d)
  if (!d) return { meta: {}, songs: [] }
  const meta = d.playlist || (d.title || d.name ? d : d.data || {})
  const songs = findArray(d,    ['content','songs','items','tracks','playlist_content'])
             || findArray(meta, ['content','songs','items','tracks'])
  return { meta, songs: Array.isArray(songs) ? songs : [] }
}

export function extractSearch(d) {
  log('Search', d)
  if (!d) return {}
  // Returns object with section arrays; frontend maps them
  return d
}

export function extractQuickSearch(d) {
  log('QuickSearch', d)
  if (!d) return []
  if (Array.isArray(d)) return d
  // Merge all section arrays into flat list
  const out = []
  for (const k of ['songs','content','tracks','artists','albums','collections','playlists','results','data','items']) {
    if (Array.isArray(d[k])) d[k].slice(0, 4).forEach(x => out.push({ ...x, _section: k }))
  }
  return out.length ? out : []
}
