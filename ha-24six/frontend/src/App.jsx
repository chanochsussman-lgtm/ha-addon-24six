import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { PlayerProvider } from './store/index.jsx'
import { api } from './api'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import Home from './pages/Home'
import CollectionPage from './pages/CollectionPage'
import ArtistPage from './pages/ArtistPage'
import SearchPage from './pages/SearchPage'
import Login from './pages/Login'

export default function App() {
  const [authed, setAuthed] = useState(null) // null = loading

  useEffect(() => {
    api.status().then(d => setAuthed(d.authenticated)).catch(() => setAuthed(false))
  }, [])

  if (authed === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />
  }

  return (
    <PlayerProvider>
      <div className="layout">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/collection/:id" element={<CollectionPage />} />
            <Route path="/artist/:id" element={<ArtistPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Player />
      </div>
    </PlayerProvider>
  )
}
