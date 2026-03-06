import React, { useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, usePlayerStore, useDownloadStore, useZoneStore } from './store'
import Login from './pages/Login'
import Layout from './components/Layout'
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import ArtistPage from './pages/ArtistPage'
import AlbumPage from './pages/AlbumPage'
import PlaylistPage from './pages/PlaylistPage'
import Queue from './pages/Queue'
import RecentlyPlayed from './pages/RecentlyPlayed'
import Favorites from './pages/Favorites'
import CategoryPage from './pages/CategoryPage'
import LyricsPage from './pages/LyricsPage'
import ZmanimPage from './pages/ZmanimPage'
import BrachosPage from './pages/BrachosPage'
import VideosPage from './pages/VideosPage'
import VideoPlayerPage from './pages/VideoPlayerPage'
import PodcastsPage from './pages/PodcastsPage'
import PodcastPage from './pages/PodcastPage'
import RewindPage from './pages/RewindPage'
import StoriesPage from './pages/StoriesPage'
import PollsPage from './pages/PollsPage'
import AlarmsPage from './pages/AlarmsPage'
import DownloadsPage from './pages/DownloadsPage'
import PinLock from './components/PinLock'
import SettingsPage from './pages/SettingsPage'
import TorahPage from './pages/TorahPage'
import LiveRadioPage from './pages/LiveRadioPage'
import CollectionPage from './pages/CollectionPage'
import ProducePage from './pages/ProducePage'

function RequireAuth({ children }) {
  const loggedIn = useAuthStore(s => s.loggedIn)
  if (!loggedIn) return <Navigate to="/login" replace />
  return children
}

// ── Alarm notification banner ─────────────────────────────────────────────────
function AlarmBanner({ alarm, onDismiss }) {
  return (
    <div
      className="fixed top-4 left-1/2 z-50 fade-in"
      style={{
        transform: 'translateX(-50%)',
        background: 'var(--surface)',
        border: '1px solid var(--accent)',
        borderRadius: 16,
        padding: '14px 20px',
        minWidth: 280,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 24 }}>⏰</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{alarm.name || 'Alarm'}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{alarm.time}</p>
        </div>
        <button
          className="text-xs px-3 py-1.5 rounded-full font-medium"
          style={{ background: 'var(--accent)', color: '#0d0d0f' }}
          onClick={onDismiss}
        >Dismiss</button>
      </div>
    </div>
  )
}

export default function App() {
  const { loggedIn, checkAuth, profileName } = useAuthStore()
  const { setAudioEl, next, playSong } = usePlayerStore()
  const { loadDownloads } = useDownloadStore()
  const { syncFromHA } = useZoneStore()
  const [alarmBanner, setAlarmBanner] = useState(null)
  const wsRef = useRef(null)

  useEffect(() => {
    checkAuth()
    loadDownloads()
  }, [])

  // Poll HA every 10s to keep zone play/pause state in sync
  useEffect(() => {
    if (!loggedIn) return
    syncFromHA()
    const id = setInterval(syncFromHA, 10000)
    return () => clearInterval(id)
  }, [loggedIn])

  // ── Audio element setup ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = document.createElement('audio')
    el.preload = 'auto'
    el.addEventListener('ended', () => {
      const { repeat, audioEl } = usePlayerStore.getState()
      if (repeat === 'one') { audioEl.currentTime = 0; audioEl.play() }
      else next()
    })
    el.addEventListener('timeupdate', () => {
      usePlayerStore.setState({ progress: el.currentTime })
    })
    el.addEventListener('loadedmetadata', () => {
      usePlayerStore.setState({ duration: el.duration })
    })
    el.addEventListener('play', () => usePlayerStore.setState({ isPlaying: true }))
    el.addEventListener('pause', () => usePlayerStore.setState({ isPlaying: false }))
    setAudioEl(el)
    return () => { el.pause(); el.src = '' }
  }, [])

  // ── WebSocket: alarm events ──────────────────────────────────────────────────
  useEffect(() => {
    if (!loggedIn) return
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new window.WebSocket(`${proto}://${window.location.host}/ws/player`)
    wsRef.current = ws

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'alarm') {
          const alarm = msg.payload
          setAlarmBanner(alarm)
          // Auto-play the alarm's song if configured
          if (alarm.songId) {
            fetch(`/api/stream/${alarm.songId}?format=aac`)
              .then(r => r.json())
              .then(d => {
                if (d.url) {
                  const { audioEl } = usePlayerStore.getState()
                  if (audioEl) { audioEl.src = d.url; audioEl.play().catch(() => {}) }
                  usePlayerStore.setState({ isPlaying: true })
                }
              }).catch(() => {})
          }
        }
      } catch {}
    }

    ws.onerror = () => {}
    return () => { ws.close() }
  }, [loggedIn])

  return (
    <>
      {alarmBanner && (
        <AlarmBanner alarm={alarmBanner} onDismiss={() => setAlarmBanner(null)} />
      )}
      <Routes>
        <Route path="/login" element={loggedIn ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/*" element={
          <RequireAuth>
            <Layout>
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/library" element={<Library />} />
              <Route path="/library/songs" element={<Library tab="songs" />} />
              <Route path="/library/albums" element={<Library tab="albums" />} />
              <Route path="/library/artists" element={<Library tab="artists" />} />
              <Route path="/artist/:id" element={<ArtistPage />} />
              <Route path="/album/:id" element={<AlbumPage />} />
              <Route path="/playlist/:id" element={<PlaylistPage />} />
              <Route path="/queue" element={<Queue />} />
              <Route path="/recent" element={<RecentlyPlayed />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/category/:id" element={<CategoryPage />} />
              <Route path="/lyrics/:id" element={<LyricsPage />} />
              <Route path="/lyrics" element={<LyricsPage />} />
              <Route path="/zmanim" element={<ZmanimPage />} />
              <Route path="/brachos" element={<BrachosPage />} />
              <Route path="/videos" element={<VideosPage />} />
              <Route path="/video/:id" element={<VideoPlayerPage />} />
              <Route path="/podcasts" element={<PodcastsPage />} />
              <Route path="/podcast/:id" element={<PodcastPage />} />
              <Route path="/rewind" element={<RewindPage />} />
              <Route path="/stories" element={<StoriesPage />} />
              <Route path="/polls" element={<PollsPage />} />
              <Route path="/alarms" element={<AlarmsPage />} />
              <Route path="/downloads" element={<DownloadsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/torah" element={<TorahPage />} />
              <Route path="/live" element={<LiveRadioPage />} />
              <Route path="/collection/:id" element={<CollectionPage />} />
              <Route path="/produce" element={<ProducePage />} />
            </Routes>
          </Layout>
        </RequireAuth>
      } />
    </Routes>
    </>
  )
}
