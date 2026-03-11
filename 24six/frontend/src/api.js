const p = () => window.ingressPath || '';

async function req(path, opts = {}) {
  const r = await fetch(p() + path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export const api = {
  status: () => req('/api/setup/status'),
  getProfiles: (email, password) => req('/api/setup/profiles', { method: 'POST', body: JSON.stringify({ email, password }) }),
  saveProfile: (email, password, profileId) => req('/api/setup/save', { method: 'POST', body: JSON.stringify({ email, password, profileId }) }),
  reset: () => req('/api/setup/reset', { method: 'POST' }),

  home: () => req('/api/browse/home'),
  search: (q) => req(`/api/search?q=${encodeURIComponent(q)}`),

  album: (id) => req(`/api/albums/${id}`),
  albumSongs: (id) => req(`/api/albums/${id}/songs`),
  artist: (id) => req(`/api/artists/${id}`),
  playlist: (id) => req(`/api/playlists/${id}`),
  playlistSongs: (id) => req(`/api/playlists/${id}/songs`),

  favorites: () => req('/api/library/favorites'),
  addFavorite: (id) => req(`/api/library/favorites/${id}`, { method: 'POST' }),
  removeFavorite: (id) => req(`/api/library/favorites/${id}`, { method: 'DELETE' }),

  speakers: () => req('/api/ha/speakers'),
  castToSpeaker: (entity_id, content_id) => req('/api/ha/play', { method: 'POST', body: JSON.stringify({ entity_id, content_id }) }),

  audioUrl: (id) => `${p()}/api/audio/${id}`,
};
