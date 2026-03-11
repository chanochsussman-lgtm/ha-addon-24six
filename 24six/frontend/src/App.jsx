import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './api';
import { useStore } from './store';
import Login from './pages/Login';
import Home from './pages/Home';
import Search from './pages/Search';
import Album from './pages/Album';
import Artist from './pages/Artist';
import Playlist from './pages/Playlist';
import Library from './pages/Library';
import Sidebar from './components/Sidebar';
import Player from './components/Player';

export default function App() {
  const { configured, setConfigured } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.status().then(d => {
      setConfigured(d.configured, d.profile);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="text-accent text-4xl animate-pulse">♪</div>
    </div>
  );

  if (!configured) return (
    <BrowserRouter basename={window.ingressPath || '/'}>
      <Login onLogin={(profile) => setConfigured(true, profile)} />
    </BrowserRouter>
  );

  return (
    <BrowserRouter basename={window.ingressPath || '/'}>
      <div className="flex h-screen bg-bg overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto pb-24">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/album/:id" element={<Album />} />
              <Route path="/artist/:id" element={<Artist />} />
              <Route path="/playlist/:id" element={<Playlist />} />
              <Route path="/library" element={<Library />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
          <Player />
        </div>
      </div>
    </BrowserRouter>
  );
}
