const get = (url) => fetch(url).then(r => r.json())
const post = (url, body) => fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
}).then(r => r.json())
const del = (url) => fetch(url, { method: 'DELETE' }).then(r => r.json())

export const api = {
  home: () => get('/api/browse/home'),
  section: (section, limit = 50, offset = 0) => get(`/api/browse/section/${section}?limit=${limit}&offset=${offset}`),
  search: (q, type = 'all') => get(`/api/search?q=${encodeURIComponent(q)}&type=${type}`),
  artists: (limit = 50, offset = 0) => get(`/api/artists?limit=${limit}&offset=${offset}`),
  artist: (id) => get(`/api/artists/${id}`),
  artistAlbums: (id) => get(`/api/artists/${id}/albums`),
  artistSongs: (id) => get(`/api/artists/${id}/songs`),
  followArtist: (id) => post(`/api/artists/${id}/follow`, {}),
  unfollowArtist: (id) => del(`/api/artists/${id}/follow`),
  album: (id) => get(`/api/albums/${id}`),
  albumSongs: (id) => get(`/api/albums/${id}/songs`),
  playlists: () => get('/api/playlists'),
  playlist: (id) => get(`/api/playlists/${id}`),
  playlistSongs: (id) => get(`/api/playlists/${id}/songs`),
  createPlaylist: (name) => post('/api/playlists', { name }),
  renamePlaylist: (id, name) => post(`/api/playlists/${id}/rename`, { name }),
  deletePlaylist: (id) => del(`/api/playlists/${id}`),
  addToPlaylist: (playlistId, songId) => post(`/api/playlists/${playlistId}/songs`, { songId }),
  removeFromPlaylist: (playlistId, songId) => del(`/api/playlists/${playlistId}/songs/${songId}`),
  librarySongs: () => get('/api/library/songs'),
  libraryAlbums: () => get('/api/library/albums'),
  libraryArtists: () => get('/api/library/artists'),
  addToLibrary: (id) => post(`/api/library/songs/${id}`, {}),
  removeFromLibrary: (id) => del(`/api/library/songs/${id}`),
  favorites: () => get('/api/favorites'),
  addFavorite: (id) => post(`/api/favorites/${id}`, {}),
  removeFavorite: (id) => del(`/api/favorites/${id}`),
  recent: () => get('/api/recent'),
  categories: () => get('/api/categories'),
  category: (id) => get(`/api/categories/${id}`),
  lyrics: (id) => get(`/api/lyrics/${id}`),
  zmanim: (lat, lng, city) => {
    const p = lat ? `lat=${lat}&lng=${lng}` : `city=${encodeURIComponent(city)}`
    return get(`/api/zmanim?${p}`)
  },
  brachos: () => get('/api/brachos'),
  videos: (limit = 50, offset = 0) => get(`/api/videos?limit=${limit}&offset=${offset}`),
  video: (id) => get(`/api/videos/${id}`),
  podcasts: () => get('/api/podcasts'),
  podcast: (id) => get(`/api/podcasts/${id}`),
  podcastEpisodes: (id) => get(`/api/podcasts/${id}/episodes`),
  rewind: () => get('/api/rewind'),
  downloads: () => get('/api/downloads'),
  startDownload: (songId, format) => post('/api/downloads', { songId, format }),
  deleteDownload: (songId) => del(`/api/downloads/${songId}`),
  autoplay: (id) => get(`/api/autoplay/${id}`),
  report: (contentId, contentType) => post('/api/report', { contentId, contentType }),
  shareLink: (type, id) => get(`/api/share/${type}/${id}`),
  speakers: () => get('/api/ha/speakers'),
}

export function getArtwork(item, size = 300) {
  if (!item) return null
  const url = item.artwork || item.image || item.cover || item.thumbnail || item.photo
  if (!url) return null
  if (url.includes('{w}') || url.includes('{h}')) return url.replace('{w}', size).replace('{h}', size)
  return url
}

// Returns the primary display title (English by default)
export function getSongTitle(song) {
  return song?.title || song?.name || 'Unknown'
}

// Returns the Hebrew title if available, falls back to primary
export function getHebrewTitle(song) {
  return song?.title_hebrew || getSongTitle(song)
}

export function getArtistName(item) {
  return item?.artist?.name || item?.artistName || item?.artist || ''
}

export function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
