/**
 * extract.js — shared raw API response extraction utilities
 *
 * The 24Six API shape changes. Every function here:
 *   1. Logs the full raw response to console so you can see what changed
 *   2. Walks all known and unknown keys to find useful data
 *   3. Never crashes — always returns a safe default
 */

function log(label, _ld) {
  if (!_ld) { console.log(`[${label}] null response`); return }
  console.log(`[${label}] keys:`, Object.keys(_ld))
  // Log each key's shape
  Object.entries(raw).forEach(([k, v]) => {
    if (Array.isArray(v))
      console.log(`[${label}]  .${k} = array[${v.length}]`, v[0] ? Object.keys(v[0]) : '')
    else if (v && typeof v === 'object')
      console.log(`[${label}]  .${k} = object`, Object.keys(v))
    else
      console.log(`[${label}]  .${k} =`, v)
  })
}

// Find any array of items with .id in an object, walking one level deep
export function findArray(_fa, preferKeys = []) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  // Try preferred keys first
  for (const k of preferKeys) {
    if (Array.isArray(raw[k]) && raw[k].length > 0) return raw[k]
  }
  // Then all known content keys
  for (const k of ['content','songs','items','data','results','list','tracks','collections','albums','playlists']) {
    if (Array.isArray(raw[k]) && raw[k].length > 0) return raw[k]
  }
  // One envelope level deeper
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    return findArray(raw.data, preferKeys)
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

export function extractHome(raw) {
  log('Home', raw)
  if (!raw) return { sections: [] }

  const sections = []

  // Skip keys that aren't content sections
  const skip = new Set([
    'banners','banner','recent','featured','femaleArtists',
    'categories','featured_categories',
    'data','meta','pagination','csrf_token',
  ])

  // Categories: flat array of {id,title,color} — add as a single "Categories" card row
  const catSource = raw.categories || raw.featured_categories || []
  if (catSource.length) {
    const catItems = catSource
      .filter(c => c && c.id)
      .map(c => ({
        id:       c.id,
        title:    c.title || c.name,
        subtitle: null,
        img:      c.img || null,
        color:    c.color || null,
        type:     'category',
      }))
    if (catItems.length)
      sections.push({ title: 'Categories', items: catItems, catId: null })
  }

  // Every other array key — fully dynamic, zero hardcoding
  Object.entries(raw).forEach(([k, v]) => {
    if (skip.has(k) || !Array.isArray(v)) return
    const vv = v.filter(Boolean)  // strip null/undefined slots (e.g. myPlaylists: [,...])
    if (!vv.length || !vv[0]?.id) return
    const sample = vv[0]
    const looksLikeArtist = !!(sample.name && !sample.title && !sample.release_date)
    const keyLooksLikeArtist     = /artist/i.test(k)
    const keyLooksLikeCollection = /album|single|stor|playlist|collection|mix/i.test(k)
    // True songs: have artist_id + duration, no release_date, key doesn't suggest collection
    const looksLikeSong = !!(
      sample.artist_id &&
      (sample.length != null || sample.duration != null) &&
      !sample.release_date &&
      !keyLooksLikeCollection
    )
    const type = (looksLikeArtist || keyLooksLikeArtist) ? 'artist'
               : looksLikeSong ? 'song'
               : 'collection'
    // camelCase → Title Case:  newAlbums → New Albums,  by24Six → By 24 Six
    const title = k.replace(/([A-Z0-9]+)/g, ' $1').replace(/^./, c => c.toUpperCase()).trim()
    console.log('[Home] section:', k, '->', `"${title}"`, type, v.length)
    sections.push({ title, items: vv.map(i => normItem(i, type)).filter(Boolean), circle: looksLikeArtist })
  })

  return { sections }
}

export function extractBanners(raw) {
  log('Banners', raw)
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw.data))    return raw.data
  if (Array.isArray(raw.banners)) return raw.banners
  if (Array.isArray(raw.items))   return raw.items
  return []
}

export function extractRecent(raw) {
  log('Recent', raw)
  if (!raw) return []
  // Server returns { local:[], api:<raw> }
  // OR could be a plain array if coming from home.recent
  if (Array.isArray(raw)) return raw
  const local = Array.isArray(raw.local) ? raw.local : []
  const api   = raw.api
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

export function extractCollection(raw) {
  log('Collection', raw)
  if (!raw) return { meta: {}, songs: [], albums: [], featuredOn: [] }

  // Confirmed shape: { collection:{id,title,img,color,contents:[songs]}, albums:[], featured_on:[], artist:{} }
  const meta      = raw.collection || (raw.id ? raw : {})
  const songs     = Array.isArray(meta.contents)   ? meta.contents
                  : findArray(meta, ['songs','content','items','tracks'])
  const albums    = Array.isArray(raw.albums)         ? raw.albums     : []
  const featuredOn = Array.isArray(raw.featured_on)   ? raw.featured_on : []
  // artist info — prefer raw.artist object, fall back to meta.artists[0]
  const artistObj = raw.artist || meta.artists?.[0] || null

  return { meta, songs: Array.isArray(songs) ? songs : [], albums, featuredOn, artistObj }
}

export function extractArtist(raw) {
  log('Artist', raw)
  if (!raw) return { artist: {}, songs: [], albums: [], featuredOn: [], similar: [] }

  // artist object: nested raw.artist OR fields are at root level (both present in API)
  const artist = (raw.artist && typeof raw.artist === 'object' && !Array.isArray(raw.artist))
    ? { ...raw.artist, bio: raw.bio || raw.artist.bio, img: raw.img || raw.artist.img, color: raw.color || raw.artist.color }
    : (raw.id && raw.name ? raw : {})

  // top_songs items have artist_id + title but may lack img — use artist img as fallback
  const songs     = Array.isArray(raw.top_songs)    ? raw.top_songs    : findArray(raw, ['songs','content'])
  // albums: artist's own releases
  const albums    = Array.isArray(raw.albums)        ? raw.albums       : findArray(raw, ['latest_albums','collections'])
  // featured_on: albums where this artist is a guest
  const featuredOn = Array.isArray(raw.featured_on)  ? raw.featured_on  : []
  // similar artists
  const similar   = Array.isArray(raw.similar)       ? raw.similar      : []

  return { artist, songs, albums, featuredOn, similar }
}

export function extractPlaylist(raw) {
  log('Playlist', raw)
  if (!raw) return { meta: {}, songs: [] }
  // Confirmed shape: { playlist: { id, title, img, color, contents:[...songs] } }
  const meta  = raw.playlist || (raw.id ? raw : {})
  const songs = Array.isArray(meta.contents) ? meta.contents
              : findArray(meta, ['content','songs','items','tracks'])
              || findArray(raw,   ['content','songs','items','tracks','playlist_content'])
  return { meta, songs: Array.isArray(songs) ? songs : [] }
}

export function extractSearch(raw) {
  log('Search', raw)
  if (!raw) return {}
  // Returns object with section arrays; frontend maps them
  return raw
}

export function extractQuickSearch(raw) {
  log('QuickSearch', raw)
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  // Merge all section arrays into flat list
  const out = []
  for (const k of ['songs','content','tracks','artists','albums','collections','playlists','results','data','items']) {
    if (Array.isArray(raw[k])) raw[k].slice(0, 4).forEach(x => out.push({ ...x, _section: k }))
  }
  return out.length ? out : []
}
