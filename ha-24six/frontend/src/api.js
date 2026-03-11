const b = () => window.ingressPath || ''

export const api = {
  status:          () => fetch(`${b()}/api/setup/status`).then(r => r.json()),
  login:           () => fetch(`${b()}/api/setup/login`, { method: 'POST' }).then(r => r.json()),
  reset:           () => fetch(`${b()}/api/setup/reset`, { method: 'POST' }).then(r => r.json()),
  home:            () => fetch(`${b()}/api/home`).then(r => r.json()),
  banners:         () => fetch(`${b()}/api/banners`).then(r => r.json()),
  collection:      id => fetch(`${b()}/api/collections/${id}`).then(r => r.json()),
  collectionSongs: id => fetch(`${b()}/api/collections/${id}/songs`).then(r => r.json()),
  artist:          id => fetch(`${b()}/api/artists/${id}`).then(r => r.json()),
  playlist:        id => fetch(`${b()}/api/playlists/${id}`).then(r => r.json()),
  category:        id => fetch(`${b()}/api/categories/${id}`).then(r => r.json()),
  recent:          () => fetch(`${b()}/api/browse/recent`).then(r => r.json()),
  searchQuick:     q  => fetch(`${b()}/api/search/quick?q=${encodeURIComponent(q)}`).then(r => r.json()),
  search:          q  => fetch(`${b()}/api/search?q=${encodeURIComponent(q)}`).then(r => r.json()),
  favorites:       () => fetch(`${b()}/api/library/favorites`).then(r => r.json()),
  addFavorite:     id => fetch(`${b()}/api/library/favorites/${id}`, { method: 'POST' }).then(r => r.json()),
  removeFavorite:  id => fetch(`${b()}/api/library/favorites/${id}`, { method: 'DELETE' }).then(r => r.json()),
  imgUrl:          url => url ? `${b()}/api/img?url=${encodeURIComponent(url)}` : null,
  audioUrl:        id => `${b()}/api/audio/${id}`,
}
