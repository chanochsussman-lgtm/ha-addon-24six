/**
 * extract.js — shared raw API response extraction utilities
 *
 * The 24Six API shape changes. Every function here:
 *   1. Logs the full raw response to console so you can see what changed
 *   2. Walks all known and unknown keys to find useful data
 *   3. Never crashes — always returns a safe default
 */

function log(label, apiResp) {
  if (!apiResp) { console.log(`[${label}] null response`); return }
  console.log(`[${label}] keys:`, Object.keys(apiResp))
  // Log each key's shape
  Object.entries(apiResp).forEach(([k, v]) => {
    if (Array.isArray(v))
      console.log(`[${label}]  .${k} = array[${v.length}]`, v[0] ? Object.keys(v[0]) : '')
    else if (v && typeof v === 'object')
      console.log(`[${label}]  .${k} = object`, Object.keys(v))
    else
      console.log(`[${label}]  .${k} =`, v)
  })
}

// Find any array of items with .id in an object, walking one level deep
export function findArray(apiResp, preferKeys = []) {
  if (!apiResp) return []
  if (Array.isArray(apiResp)) return apiResp
  // Try preferred keys first
  for (const k of preferKeys) {
    if (Array.isArray(apiResp[k]) && apiResp[k].length > 0) return apiResp[k]
  }
  // Then all known content keys
  for (const k of ['content','songs','items','data','results','list','tracks','collections','albums','playlists']) {
    if (Array.isArray(apiResp[k]) && apiResp[k].length > 0) return apiResp[k]
  }
  // One envelope level deeper
  if (apiResp.data && typeof apiResp.data === 'object' && !Array.isArray(apiResp.data)) {
    return findArray(apiResp.data, preferKeys)
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

export function extractHome(apiResp) {
  log('Home', apiResp)
  if (!apiResp) return { sections: [] }

  const sections = []

  // Skip keys that aren't content sections
  const skip = new Set([
    'banners','banner','recent','featured','femaleArtists',
    'categories','featured_categories',
    'data','meta','pagination','csrf_token',
  ])

  // Categories: flat array of {id,title,color} — add as a single "Categories" card row
  const catSource = apiResp.categories || apiResp.featured_categories || []
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
  Object.entries(apiResp).forEach(([k, v]) => {
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

export function extractBanners(apiResp) {
  log('Banners', apiResp)
  if (!apiResp) return []
  if (Array.isArray(apiResp)) return apiResp
  if (Array.isArray(apiResp.data))    return apiResp.data
  if (Array.isArray(apiResp.banners)) return apiResp.banners
  if (Array.isArray(apiResp.items))   return apiResp.items
  return []
}

export function extractRecent(apiResp) {
  log('Recent', apiResp)
  if (!apiResp) return []
  // Server returns { local:[], api:<raw> }
  // OR could be a plain array if coming from home.recent
  if (Array.isArray(apiResp)) return apiResp
  const local = Array.isArray(apiResp.local) ? apiResp.local : []
  const api   = apiResp.api
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

export function extractCollection(apiResp) {
  log('Collection', apiResp)
  if (!apiResp) return { meta: {}, songs: [], albums: [], featuredOn: [] }

  // Confirmed shape: { collection:{id,title,img,color,contents:[songs]}, albums:[], featured_on:[], artist:{} }
  const meta      = apiResp.collection || (apiResp.id ? apiResp : {})
  const songs     = Array.isArray(meta.contents)   ? meta.contents
                  : findArray(meta, ['songs','content','items','tracks'])
  const albums    = Array.isArray(apiResp.albums)         ? apiResp.albums     : []
  const featuredOn = Array.isArray(apiResp.featured_on)   ? apiResp.featured_on : []
  // artist info — prefer raw.artist object, fall back to meta.artists[0]
  const artistObj = apiResp.artist || meta.artists?.[0] || null

  return { meta, songs: Array.isArray(songs) ? songs : [], albums, featuredOn, artistObj }
}

export function extractArtist(apiResp) {
  log('Artist', apiResp)
  if (!apiResp) return { artist: {}, songs: [], albums: [], featuredOn: [], similar: [] }

  // artist object: nested raw.artist OR fields are at root level (both present in API)
  const artist = (apiResp.artist && typeof apiResp.artist === 'object' && !Array.isArray(apiResp.artist))
    ? { ...apiResp.artist, bio: apiResp.bio || apiResp.artist.bio, img: apiResp.img || apiResp.artist.img, color: apiResp.color || apiResp.artist.color }
    : (apiResp.id && apiResp.name ? apiResp : {})

  // top_songs items have artist_id + title but may lack img — use artist img as fallback
  const songs     = Array.isArray(apiResp.top_songs)    ? apiResp.top_songs    : findArray(apiResp, ['songs','content'])
  // albums: artist's own releases
  const albums    = Array.isArray(apiResp.albums)        ? apiResp.albums       : findArray(apiResp, ['latest_albums','collections'])
  // featured_on: albums where this artist is a guest
  const featuredOn = Array.isArray(apiResp.featured_on)  ? apiResp.featured_on  : []
  // similar artists
  const similar   = Array.isArray(apiResp.similar)       ? apiResp.similar      : []

  return { artist, songs, albums, featuredOn, similar }
}

export function extractPlaylist(apiResp) {
  log('Playlist', apiResp)
  if (!apiResp) return { meta: {}, songs: [] }
  // Confirmed shape: { playlist: { id, title, img, color, contents:[...songs] } }
  const meta  = apiResp.playlist || (apiResp.id ? apiResp : {})
  const songs = Array.isArray(meta.contents) ? meta.contents
              : findArray(meta, ['content','songs','items','tracks'])
              || findArray(apiResp,   ['content','songs','items','tracks','playlist_content'])
  return { meta, songs: Array.isArray(songs) ? songs : [] }
}

export function extractSearch(apiResp) {
  log('Search', apiResp)
  if (!apiResp) return {}
  // Returns object with section arrays; frontend maps them
  return apiResp
}

export function extractQuickSearch(apiResp) {
  log('QuickSearch', apiResp)
  if (!apiResp) return []
  if (Array.isArray(apiResp)) return apiResp
  // Merge all section arrays into flat list
  const out = []
  for (const k of ['songs','content','tracks','artists','albums','collections','playlists','results','data','items']) {
    if (Array.isArray(apiResp[k])) apiResp[k].slice(0, 4).forEach(x => out.push({ ...x, _section: k }))
  }
  return out.length ? out : []
}
