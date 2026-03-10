import { create } from 'zustand'

// ── Auth Store ──────────────────────────────────────────────────────────────
export const useAuthStore = create((set) => ({
  loggedIn: false,
  profileId: null,
  profileName: null,
  checkAuth: async () => {
    try {
      const r = await fetch('/api/auth/status')
      const d = await r.json()
      set({ loggedIn: d.loggedIn, profileId: d.profileId, profileName: d.profileName })
    } catch { set({ loggedIn: false }) }
  },
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ loggedIn: false, profileId: null, profileName: null })
  },
}))

// ── Player Store ─────────────────────────────────────────────────────────────
export const usePlayerStore = create((set, get) => ({
  currentSong: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  entity_id: null,
  volume: 0.7,
  shuffle: false,
  repeat: 'none',
  progress: 0,
  duration: 0,
  audioEl: null,
  speed: 1,
  quality: 'aac',
  showLyrics: false,
  autoplay: true,
  sleepTimer: null,
  sleepRemaining: null,

  setAudioEl: (el) => set({ audioEl: el }),

  playSong: async (song, queue = null, index = 0) => {
    const { entity_id, speed, quality } = get()
    const newQueue = queue || [song]
    const newIndex = queue ? index : 0

    // Save position of previous song
    const prev = get().currentSong
    if (prev?.id && get().progress > 5) {
      fetch(`/api/player/bookmark/${prev.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: Math.floor(get().progress) })
      }).catch(() => {})
    }

    set({ currentSong: song, queue: newQueue, queueIndex: newIndex, isPlaying: true, progress: 0, duration: 0 })

    if (entity_id) {
      const resp = await fetch('/api/ha/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id, song_id: song.id, format: quality })
      })
      if (!resp.ok) { set({ isPlaying: false }); return }
    } else {
      const { audioEl } = get()
      if (audioEl) {
        try {
          const r = await fetch(`/api/stream/${song.id}?format=${quality}`)
          if (!r.ok) throw new Error('Stream fetch failed')
          const d = await r.json()
          if (d.url) {
            audioEl.src = d.url
            audioEl.playbackRate = speed
            await audioEl.play()
            if (song.savedPosition && song.savedPosition > 5) {
              audioEl.currentTime = song.savedPosition
            }
          } else { set({ isPlaying: false }) }
        } catch { set({ isPlaying: false }) }
      }
    }

    fetch('/api/player/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentSong: song, queue: newQueue, queueIndex: newIndex, isPlaying: true, entity_id })
    }).catch(() => {})

    fetch(`/api/recent/${song.id}`, { method: 'POST' }).catch(() => {})
  },

  playQueue: (songs, startIndex = 0) => {
    get().playSong(songs[startIndex], songs, startIndex)
  },

  togglePlay: () => {
    const { isPlaying, audioEl, entity_id } = get()
    const newState = !isPlaying
    set({ isPlaying: newState })
    if (!entity_id && audioEl) {
      newState ? audioEl.play().catch(() => {}) : audioEl.pause()
    }
    if (entity_id) {
      fetch('/api/ha/call', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'media_player', service: newState ? 'media_play' : 'media_pause', entity_id })
      }).catch(() => {})
    }
  },

  next: () => {
    const { queue, queueIndex, shuffle, repeat, autoplay } = get()
    if (!queue.length) return
    let nextIdx
    if (shuffle) {
      const candidates = queue.map((_, i) => i).filter(i => i !== queueIndex)
      nextIdx = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : queueIndex
    } else {
      nextIdx = queueIndex + 1
      if (nextIdx >= queue.length) {
        if (repeat === 'all') nextIdx = 0
        else if (autoplay) { get()._fetchAutoplay(); return }
        else return
      }
    }
    get().playSong(queue[nextIdx], queue, nextIdx)
  },

  _fetchAutoplay: async () => {
    const { currentSong, queue } = get()
    if (!currentSong) return
    try {
      const r = await fetch(`/api/autoplay/${currentSong.id}`)
      const d = await r.json()
      const newSongs = d.songs || d.data || []
      if (newSongs.length) {
        const extended = [...queue, ...newSongs]
        const nextIdx = queue.length
        set({ queue: extended })
        get().playSong(extended[nextIdx], extended, nextIdx)
      }
    } catch {}
  },

  prev: () => {
    const { queue, queueIndex, progress, audioEl } = get()
    if (progress > 3) {
      if (audioEl) audioEl.currentTime = 0
      set({ progress: 0 }); return
    }
    if (queueIndex <= 0) return
    const prevIdx = queueIndex - 1
    get().playSong(queue[prevIdx], queue, prevIdx)
  },

  rewind10: () => {
    const { audioEl, progress } = get()
    const p = Math.max(0, progress - 10)
    set({ progress: p })
    if (audioEl) audioEl.currentTime = p
  },

  forward10: () => {
    const { audioEl, progress, duration } = get()
    const p = Math.min(duration > 0 ? duration : Infinity, progress + 10)
    set({ progress: p })
    if (audioEl) audioEl.currentTime = p
  },

  // Insert song at the next position in the queue (after currently playing)
  playNext: (songs) => {
    const { queue, queueIndex } = get()
    const toInsert = Array.isArray(songs) ? songs : [songs]
    const insertAt = queueIndex + 1
    const newQueue = [
      ...queue.slice(0, insertAt),
      ...toInsert,
      ...queue.slice(insertAt),
    ]
    set({ queue: newQueue })
  },

  setVolume: (v) => {
    const { audioEl, entity_id } = get()
    set({ volume: v })
    if (!entity_id && audioEl) audioEl.volume = v
    if (entity_id) {
      fetch('/api/ha/call', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'media_player', service: 'volume_set', entity_id, data: { volume_level: v } })
      }).catch(() => {})
    }
  },

  setProgress: (p) => {
    const { audioEl } = get()
    set({ progress: p })
    if (audioEl) audioEl.currentTime = p
  },

  setSpeed: (speed) => {
    const { audioEl } = get()
    set({ speed })
    if (audioEl) audioEl.playbackRate = speed
  },

  setQuality: (quality) => {
    const { currentSong, isPlaying, progress, queue, queueIndex } = get()
    set({ quality })
    if (currentSong && isPlaying) {
      const savedPos = progress
      const { audioEl } = get()
      fetch(`/api/stream/${currentSong.id}?format=${quality}`)
        .then(r => r.json())
        .then(d => {
          if (d.url && audioEl) {
            audioEl.src = d.url
            audioEl.play().then(() => { audioEl.currentTime = savedPos }).catch(() => {})
          }
        }).catch(() => {})
    }
  },

  toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),
  cycleRepeat: () => set(s => ({ repeat: s.repeat === 'none' ? 'all' : s.repeat === 'all' ? 'one' : 'none' })),
  toggleAutoplay: () => set(s => ({ autoplay: !s.autoplay })),
  toggleLyrics: () => set(s => ({ showLyrics: !s.showLyrics })),

  setEntity: (entity_id) => {
    set({ entity_id })
    fetch('/api/player/state', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id })
    }).catch(() => {})
  },

  addToQueue: (songs) => {
    set(s => ({ queue: [...s.queue, ...(Array.isArray(songs) ? songs : [songs])] }))
  },

  setSleepTimer: (minutes) => {
    const { sleepTimer } = get()
    if (sleepTimer?.intervalId) clearInterval(sleepTimer.intervalId)
    if (sleepTimer?.timeoutId) clearTimeout(sleepTimer.timeoutId)
    if (minutes === 0) { set({ sleepTimer: null, sleepRemaining: null }); return }

    const endsAt = Date.now() + minutes * 60 * 1000
    const timeoutId = setTimeout(() => {
      const { audioEl } = get()
      if (audioEl) audioEl.pause()
      set({ isPlaying: false, sleepTimer: null, sleepRemaining: null })
    }, minutes * 60 * 1000)

    const intervalId = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      set({ sleepRemaining: remaining })
      if (remaining === 0) clearInterval(intervalId)
    }, 1000)

    set({ sleepTimer: { endsAt, timeoutId, intervalId }, sleepRemaining: minutes * 60 })
  },

  clearSleepTimer: () => {
    const { sleepTimer } = get()
    if (sleepTimer?.timeoutId) clearTimeout(sleepTimer.timeoutId)
    if (sleepTimer?.intervalId) clearInterval(sleepTimer.intervalId)
    set({ sleepTimer: null, sleepRemaining: null })
  },
}))

// ── Speaker Store ─────────────────────────────────────────────────────────────
export const useSpeakerStore = create((set) => ({
  speakers: [],
  loading: false,
  loadSpeakers: async () => {
    set({ loading: true })
    try {
      const r = await fetch('/api/ha/speakers')
      const d = await r.json()
      set({ speakers: Array.isArray(d) ? d : [], loading: false })
    } catch { set({ loading: false }) }
  },
  group: async (leader, members) => {
    await fetch('/api/ha/group', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leader, members })
    })
  },
  ungroup: async (entity_id) => {
    await fetch('/api/ha/ungroup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id })
    })
  },
}))

// ── Downloads Store ────────────────────────────────────────────────────────
export const useDownloadStore = create((set, get) => ({
  downloads: {},
  loadDownloads: async () => {
    try {
      const r = await fetch('/api/downloads')
      const d = await r.json()
      const map = {}
      ;(d.downloads || []).forEach(dl => { map[dl.contentId] = dl })
      set({ downloads: map })
    } catch {}
  },
  download: async (song) => {
    set(s => ({ downloads: { ...s.downloads, [song.id]: { status: 'queued', progress: 0, song } } }))
    try {
      const r = await fetch('/api/downloads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: song.id, format: 'aac' })
      })
      const d = await r.json()
      set(s => ({ downloads: { ...s.downloads, [song.id]: { ...s.downloads[song.id], ...d } } }))
    } catch {
      set(s => ({ downloads: { ...s.downloads, [song.id]: { status: 'failed', progress: 0 } } }))
    }
  },
  deleteDownload: async (songId) => {
    try {
      await fetch(`/api/downloads/${songId}`, { method: 'DELETE' })
      set(s => { const d = { ...s.downloads }; delete d[songId]; return { downloads: d } })
    } catch {}
  },
  isDownloaded: (songId) => get().downloads[songId]?.status === 'completed',
}))

// ── Zone Store ────────────────────────────────────────────────────────────────
// A "zone" is an independent playback session tied to one HA media_player entity
// (or group leader). Multiple zones can play different songs simultaneously.
// The "active zone" is what the UI controls. Browser audio is always zone 0.

const createZone = (id, label, entity_id = null) => ({
  id,
  label,
  entity_id,
  currentSong: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  progress: 0,
  duration: 0,
})

export const useZoneStore = create((set, get) => ({
  zones: [createZone('browser', 'This Device', null)],
  activeZoneId: 'browser',

  // ── Active zone helpers ────────────────────────────────────────────────────
  getActiveZone: () => {
    const { zones, activeZoneId } = get()
    return zones.find(z => z.id === activeZoneId) || zones[0]
  },

  setActiveZone: (id) => set({ activeZoneId: id }),

  // ── Zone management ────────────────────────────────────────────────────────
  addZone: (entity_id, label) => {
    set(s => ({
      zones: [...s.zones.filter(z => z.entity_id !== entity_id),
        createZone(entity_id, label, entity_id)],
    }))
  },

  removeZone: (id) => {
    set(s => {
      const zones = s.zones.filter(z => z.id !== id)
      return {
        zones,
        activeZoneId: s.activeZoneId === id ? (zones[0]?.id || 'browser') : s.activeZoneId,
      }
    })
  },

  renameZone: (id, label) => {
    set(s => ({ zones: s.zones.map(z => z.id === id ? { ...z, label } : z) }))
  },

  // ── Playback to a specific zone ────────────────────────────────────────────
  // Plays song on a zone. If zone has no entity_id, falls back to browser audio via usePlayerStore.
  playToZone: async (zoneId, song, queue = null, startIndex = 0) => {
    const { zones } = get()
    const zone = zones.find(z => z.id === zoneId)
    if (!zone) return

    const newQueue = queue || [song]
    const newIndex = queue ? startIndex : 0

    set(s => ({
      zones: s.zones.map(z => z.id === zoneId
        ? { ...z, currentSong: song, queue: newQueue, queueIndex: newIndex, isPlaying: true, progress: 0 }
        : z
      )
    }))

    if (zone.entity_id) {
      // Play on HA media player
      try {
        const r = await fetch('/api/ha/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity_id: zone.entity_id, song_id: song.id })
        })
        if (!r.ok) throw new Error('ha/play failed')
      } catch {
        set(s => ({ zones: s.zones.map(z => z.id === zoneId ? { ...z, isPlaying: false } : z) }))
      }
    } else {
      // Browser zone - delegate to playerStore
      usePlayerStore.getState().playSong(song, newQueue, newIndex)
    }

    fetch(`/api/recent/${song.id}`, { method: 'POST' }).catch(() => {})
  },

  // ── Zone-level transport ───────────────────────────────────────────────────
  toggleZone: async (zoneId) => {
    const zone = get().zones.find(z => z.id === zoneId)
    if (!zone) return
    const newState = !zone.isPlaying
    set(s => ({ zones: s.zones.map(z => z.id === zoneId ? { ...z, isPlaying: newState } : z) }))
    if (zone.entity_id) {
      fetch('/api/ha/call', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'media_player',
          service: newState ? 'media_play' : 'media_pause',
          entity_id: zone.entity_id,
        })
      }).catch(() => {})
    } else {
      usePlayerStore.getState().togglePlay()
    }
  },

  nextInZone: (zoneId) => {
    const { zones } = get()
    const zone = zones.find(z => z.id === zoneId)
    if (!zone || !zone.queue.length) return
    const nextIdx = zone.queueIndex + 1
    if (nextIdx >= zone.queue.length) return
    get().playToZone(zoneId, zone.queue[nextIdx], zone.queue, nextIdx)
  },

  prevInZone: (zoneId) => {
    const { zones } = get()
    const zone = zones.find(z => z.id === zoneId)
    if (!zone || zone.queueIndex <= 0) return
    const prevIdx = zone.queueIndex - 1
    get().playToZone(zoneId, zone.queue[prevIdx], zone.queue, prevIdx)
  },

  updateZoneProgress: (zoneId, progress, duration) => {
    set(s => ({
      zones: s.zones.map(z => z.id === zoneId ? { ...z, progress, duration } : z)
    }))
  },

  setZoneVolume: async (zoneId, volume) => {
    const zone = get().zones.find(z => z.id === zoneId)
    if (!zone) return
    if (zone.entity_id) {
      fetch('/api/ha/call', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'media_player', service: 'volume_set',
          entity_id: zone.entity_id, data: { volume_level: volume }
        })
      }).catch(() => {})
    } else {
      usePlayerStore.getState().setVolume(volume)
    }
  },

  // ── Sync zone state from HA polling ───────────────────────────────────────
  // Called periodically to keep zone play/pause state accurate from HA
  syncFromHA: async () => {
    const { zones } = get()
    const haZones = zones.filter(z => z.entity_id)
    if (!haZones.length) return

    try {
      const r = await fetch('/api/ha/speakers')
      const speakers = await r.json()
      const speakerMap = {}
      speakers.forEach(s => { speakerMap[s.entity_id] = s })

      set(s => ({
        zones: s.zones.map(z => {
          if (!z.entity_id) return z
          const sp = speakerMap[z.entity_id]
          if (!sp) return z
          return {
            ...z,
            isPlaying: sp.state === 'playing',
          }
        })
      }))
    } catch {}
  },
}))
