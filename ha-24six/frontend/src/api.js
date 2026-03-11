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
  search:          (q, type='collection') => fetch(`${b()}/api/search?q=${encodeURIComponent(q)}&type=${type}`).then(r => r.json()),
  imgUrl:          url => url ? `${b()}/api/img?url=${encodeURIComponent(url)}` : null,
  audioUrl:        id => `${b()}/api/audio/${id}`,
}
