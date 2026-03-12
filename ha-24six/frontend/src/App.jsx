import ErrorBoundary from './components/ErrorBoundary'
import React, { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { PlayerProvider } from './store/index.jsx'
import { api } from './api'
import Player from './components/Player'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import CollectionPage from './pages/CollectionPage'
import ArtistPage from './pages/ArtistPage'
import SearchPage from './pages/SearchPage'
import PlaylistPage from './pages/PlaylistPage'
import SpeakersPage from './pages/SpeakersPage'
import CategoryPage from './pages/CategoryPage'

function Login({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const go = async () => {
    setLoading(true); setError(null)
    try {
      const r = await api.login()
      if (r.success) onLogin()
      else setError('Login failed. Check server logs.')
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }
  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg)', gap:20, padding:32 }}>
      <div style={{ fontSize:56 }}>🎵</div>
      <div style={{ fontSize:28, fontWeight:700, color:'var(--accent)' }}>24Six</div>
      <div style={{ color:'var(--text-secondary)', fontSize:14 }}>Jewish Music Streaming</div>
      {error && <div style={{ background:'rgba(220,50,50,0.15)', border:'1px solid rgba(220,50,50,0.3)', color:'#ff6b6b', padding:'10px 20px', borderRadius:8, fontSize:13 }}>{error}</div>}
      <button onClick={go} disabled={loading} style={{ background:loading?'var(--accent-dim)':'var(--accent)', color:'#000', fontWeight:700, fontSize:15, padding:'13px 36px', borderRadius:30, opacity:loading?0.7:1 }}>
        {loading ? 'Connecting...' : 'Connect to 24Six'}
      </button>
    </div>
  )
}

function Splash() {
  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ width:32, height:32, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  )
}

function ReconnectBanner() {
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    window.__serverDisconnected = () => setOffline(true)
    window.__serverReconnected  = () => setOffline(false)
    return () => { delete window.__serverDisconnected; delete window.__serverReconnected }
  }, [])
  if (!offline) return null
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:9999, background:'#c0392b', color:'#fff', fontSize:13, fontWeight:600, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <span>⚠️ Server disconnected — reconnecting…</span>
      <div style={{ width:16, height:16, border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(null)
  useEffect(() => {
    api.status().then(d => setAuthed(d.authenticated)).catch(() => setAuthed(false))
  }, [])
  if (authed === null) return <Splash />
  if (!authed) return <Login onLogin={() => setAuthed(true)} />
  return (
    <>
    <ErrorBoundary>
    <ReconnectBanner />
    <PlayerProvider>
      <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)', overflow:'hidden' }}>
        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', paddingBottom:'calc(var(--player-height) + var(--nav-height) + 12px)' }}>
          <Routes>
            <Route path="/"               element={<Home />} />
            <Route path="/search"         element={<SearchPage />} />
            <Route path="/collection/:id" element={<CollectionPage />} />
            <Route path="/artist/:id"     element={<ArtistPage />} />
            <Route path="/playlist/:id"   element={<PlaylistPage />} />
            <Route path="/favorites"         element={<PlaylistPage />} />
            <Route path="/speakers"       element={<SpeakersPage />} />
            <Route path="/category/:id"    element={<CategoryPage />} />
          </Routes>
        </div>
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100 }}>
          <Player />
          <BottomNav />
        </div>
      </div>
    </PlayerProvider>
    </ErrorBoundary>
    </>
  )
}
