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
  // API uses content_type:"music" for songs — map to type:'song'
  let type = item.type || fallbackType || 'collection'
  if (type === 'music' || item.content_type === 'music') {
    // If it has artist_id it's a song/track, not an album
    if (item.artist_id || item.artistId || fallbackType === 'song') type = 'song'
  }
  return {
    id:       item.id,
    title:    item.title    || item.name        || '',
    subtitle: item.subtitle || item.artists?.map(a => a.name).join(', ') || item.author || '',
    img:      item.img      || item.image       || item.artwork?.[0]?.img || item.thumbnail || null,
    color:    item.color    || null,
    type,
    // preserve original fields for navigation and playback
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
  if (!d) return { sections: [] }

  const sections = []

  // Skip keys that aren't content sections
  const skip = new Set([
    'banners','banner','recent','featured','femaleArtists',
    'categories','featured_categories',
    'data','meta','pagination','csrf_token',
  ])

  // Category rows: [{ category:{id,title}, data:[...] }]
  const catSource = d.categories || d.featured_categories || []
  catSource.forEach(c => {
    const cat   = c.category || c
    const title = cat.title  || cat.name
    const items = c.data     || c.items || []
    if (title && Array.isArray(items) && items.length)
      sections.push({ title, items: items.map(i => normItem(i, 'collection')).filter(Boolean), catId: cat.id })
  })

  // Every other array key — fully dynamic, zero hardcoding
  Object.entries(d).forEach(([k, v]) => {
    if (skip.has(k) || !Array.isArray(v) || !v.length || !v[0]?.id) return
    const sample = v[0]
    const looksLikeArtist = !!(sample.name && !sample.title && !sample.release_date)
    // Key name hints: keys ending in Albums/Singles/Stories/Playlists/Collections are never songs
    // Keys like 'trending', 'releases', 'recent' contain actual songs (have length field)
    const keyLooksLikeCollection = /album|single|stor|playlist|collection|mix|release/i.test(k)
    const keyLooksLikeArtist     = /artist/i.test(k)
    // True songs have a numeric length/duration AND no release_date (albums have release_date)
    const hasDuration  = sample.length != null || sample.duration != null
    const hasRelease   = sample.release_date != null
    const looksLikeSong = !!(sample.artist_id && hasDuration && !hasRelease && !keyLooksLikeCollection)
    const type = looksLikeArtist || keyLooksLikeArtist ? 'artist'
               : looksLikeSong ? 'song'
               : 'collection'
    // camelCase → Title Case:  newAlbums → New Albums,  by24Six → By 24 Six
    const title = k.replace(/([A-Z0-9]+)/g, ' $1').replace(/^./, c => c.toUpperCase()).trim()
    console.log('[Home] section:', k, '->', `"${title}"`, type, v.length)
    sections.push({ title, items: v.map(i => normItem(i, type)).filter(Boolean), circle: looksLikeArtist })
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
  // OR could be a plain array if coming from home.recent
  if (Array.isArray(d)) return d
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
  if (!d) return { meta: {}, songs: [], albums: [], featuredOn: [] }

  // Confirmed shape: { collection:{id,title,img,color,contents:[songs]}, albums:[], featured_on:[], artist:{} }
  const meta      = d.collection || (d.id ? d : {})
  const songs     = Array.isArray(meta.contents)   ? meta.contents
                  : findArray(meta, ['songs','content','items','tracks'])
  const albums    = Array.isArray(d.albums)         ? d.albums     : []
  const featuredOn = Array.isArray(d.featured_on)   ? d.featured_on : []
  // artist info — prefer d.artist object, fall back to meta.artists[0]
  const artistObj = d.artist || meta.artists?.[0] || null

  return { meta, songs: Array.isArray(songs) ? songs : [], albums, featuredOn, artistObj }
}

export function extractArtist(d) {
  log('Artist', d)
  if (!d) return { artist: {}, songs: [], albums: [], featuredOn: [], similar: [] }

  // artist object: nested d.artist OR fields are at root level (both present in API)
  const artist = (d.artist && typeof d.artist === 'object' && !Array.isArray(d.artist))
    ? { ...d.artist, bio: d.bio || d.artist.bio, img: d.img || d.artist.img, color: d.color || d.artist.color }
    : (d.id && d.name ? d : {})

  // top_songs items have artist_id + title but may lack img — use artist img as fallback
  const songs     = Array.isArray(d.top_songs)    ? d.top_songs    : findArray(d, ['songs','content'])
  // albums: artist's own releases
  const albums    = Array.isArray(d.albums)        ? d.albums       : findArray(d, ['latest_albums','collections'])
  // featured_on: albums where this artist is a guest
  const featuredOn = Array.isArray(d.featured_on)  ? d.featured_on  : []
  // similar artists
  const similar   = Array.isArray(d.similar)       ? d.similar      : []

  return { artist, songs, albums, featuredOn, similar }
}

export function extractPlaylist(d) {
  log('Playlist', d)
  if (!d) return { meta: {}, songs: [] }
  // Confirmed shape: { playlist: { id, title, img, color, contents:[...songs] } }
  const meta  = d.playlist || (d.id ? d : {})
  const songs = Array.isArray(meta.contents) ? meta.contents
              : findArray(meta, ['content','songs','items','tracks'])
              || findArray(d,   ['content','songs','items','tracks','playlist_content'])
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
