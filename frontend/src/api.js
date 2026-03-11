const base = () => window.ingressPath || ''

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${base()}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

export const api = {
  status: () => apiFetch('/api/setup/status'),
  login: () => apiFetch('/api/setup/login', { method: 'POST' }),
  reset: () => apiFetch('/api/setup/reset', { method: 'POST' }),

  home: () => apiFetch('/api/home'),
  banners: () => apiFetch('/api/banners'),
  recent: () => apiFetch('/api/browse/recent'),

  collections: (params = '') => apiFetch(`/api/collections${params}`),
  collection: (id) => apiFetch(`/api/collections/${id}`),
  collectionSongs: (id) => apiFetch(`/api/collections/${id}/songs`),

  playlists: (params = '') => apiFetch(`/api/playlists${params}`),
  playlist: (id) => apiFetch(`/api/playlists/${id}`),

  artists: (params = '') => apiFetch(`/api/artists${params}`),
  artist: (id) => apiFetch(`/api/artists/${id}`),

  categories: () => apiFetch('/api/categories'),
  category: (id) => apiFetch(`/api/categories/${id}`),

  stories: () => apiFetch('/api/stories'),

  search: (q, type = 'collection') => apiFetch(`/api/search?q=${encodeURIComponent(q)}&type=${type}`),

  audioUrl: (id) => `${base()}/api/audio/${id}`,
  streamUrl: (id) => `${base()}/api/stream/${id}`,
  imgUrl: (url) => url ? `${base()}/api/img?url=${encodeURIComponent(url)}` : ''
}
