import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore, useDownloadStore, useZoneStore } from '../store'
import { getArtwork, getSongTitle, getArtistName } from '../api'

// Simple inline toast - avoids alert() blocking dialogs
function useToast() {
  const [toast, setToast] = useState(null)
  const show = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])
  return { toast, show }
}

export default function ContextMenu({ song, onClose }) {
  const navigate = useNavigate()
  const { playSong, addToQueue, playNext } = usePlayerStore()
  const { download, deleteDownload, isDownloaded } = useDownloadStore()
  const { zones, activeZoneId, playToZone } = useZoneStore()
  const { toast, show: showToast } = useToast()
  const [playlists, setPlaylists] = useState([])
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false)
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [showZonePicker, setShowZonePicker] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [liked, setLiked] = useState(song?.is_favorite)
  const downloaded = isDownloaded(song?.id)
  const haZones = zones.filter(z => z.entity_id)

  useEffect(() => {
    fetch('/api/playlists').then(r => r.json()).then(d => {
      setPlaylists(d.playlists || d.data || d || [])
    }).catch(() => {})
  }, [])

  if (!song) return null

  const artwork = getArtwork(song, 60)
  const title = getSongTitle(song)
  const artist = getArtistName(song)

  const handleAddToPlaylist = async (playlistId) => {
    await fetch(`/api/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId: song.id })
    })
    onClose()
  }

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName.trim()) return
    const r = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPlaylistName.trim() })
    })
    const pl = await r.json()
    if (pl.id) await handleAddToPlaylist(pl.id)
    else onClose()
  }

  const handleLike = async () => {
    const method = liked ? 'DELETE' : 'POST'
    await fetch(`/api/favorites/${song.id}`, { method })
    setLiked(!liked)
  }

  const handleShare = async () => {
    const url = `https://24six.app/song/${song.id}`
    if (navigator.share) {
      navigator.share({ title, text: `${title} by ${artist}`, url })
    } else {
      try { await navigator.clipboard.writeText(url) } catch {}
      showToast('Link copied to clipboard')
    }
    onClose()
  }

  const handleReport = async () => {
    await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId: song.id, contentType: 'song' })
    })
    showToast('Report submitted — thank you')
    onClose()
  }

  const handleViewLyrics = () => {
    navigate(`/lyrics/${song.id}`)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl pb-8"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', maxHeight: '80vh', overflowY: 'auto' }}
      >
        {/* Song header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          {artwork
            ? <img src={artwork} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt={title} />
            : <div className="w-12 h-12 rounded-lg flex-shrink-0" style={{ background: 'var(--card)' }} />
          }
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{title}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{artist}</p>
          </div>
          <button className="ml-auto p-1" style={{ color: 'var(--muted)' }} onClick={onClose}>✕</button>
        </div>

        {showAddToPlaylist ? (
          <div className="px-2 py-2">
            <div className="flex items-center gap-2 px-3 py-2 mb-1">
              <button onClick={() => setShowAddToPlaylist(false)} style={{ color: 'var(--accent)' }}>← Back</button>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Add to Playlist</span>
            </div>
            {showCreatePlaylist ? (
              <div className="px-4 py-2">
                <input
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="Playlist name…"
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateAndAdd()}
                />
                <button
                  className="w-full py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--accent)', color: '#0d0d0f' }}
                  onClick={handleCreateAndAdd}
                >Create & Add</button>
              </div>
            ) : (
              <>
                <MenuItem icon="➕" onClick={() => setShowCreatePlaylist(true)}>Create new playlist</MenuItem>
                {playlists.map(pl => (
                  <MenuItem key={pl.id} onClick={() => handleAddToPlaylist(pl.id)}>
                    {pl.name || pl.title}
                  </MenuItem>
                ))}
              </>
            )}
          </div>
        ) : showZonePicker ? (
          <div className="px-2 py-2">
            <div className="flex items-center gap-2 px-3 py-2 mb-1">
              <button onClick={() => setShowZonePicker(false)} style={{ color: 'var(--accent)' }}>← Back</button>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Play on Zone</span>
            </div>
            {zones.map(zone => (
              <MenuItem
                key={zone.id}
                icon={zone.entity_id ? '🔊' : '🖥️'}
                onClick={() => {
                  if (zone.id === 'browser') playSong(song)
                  else playToZone(zone.id, song)
                  onClose()
                }}
                accent={zone.id === activeZoneId}
              >
                <span>{zone.label}</span>
                {zone.id === activeZoneId && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 6 }}>● active</span>}
                {zone.currentSong && (
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>
                    · {zone.currentSong.title || zone.currentSong.name}
                  </span>
                )}
              </MenuItem>
            ))}
          </div>
        ) : (
          <div className="px-2 py-2">
            <MenuItem icon="▶" onClick={() => {
              const activeZone = zones.find(z => z.id === activeZoneId)
              if (!activeZone || activeZone.id === 'browser') playSong(song)
              else playToZone(activeZone.id, song)
              onClose()
            }}>Play Now</MenuItem>
            <MenuItem icon="⊕" onClick={() => { addToQueue([song]); onClose() }}>Add to Queue</MenuItem>
            <MenuItem icon="⏭" onClick={() => { playNext([song]); onClose() }}>Play Next</MenuItem>
            {haZones.length > 0 && (
              <MenuItem icon="🔊" onClick={() => setShowZonePicker(true)}>Play on Zone…</MenuItem>
            )}
            <Divider />
            <MenuItem icon={liked ? '♥' : '♡'} onClick={handleLike} accent={liked}>
              {liked ? 'Remove from Favorites' : 'Add to Favorites'}
            </MenuItem>
            <MenuItem icon="📋" onClick={() => setShowAddToPlaylist(true)}>Add to Playlist</MenuItem>
            <Divider />
            {song?.artist?.id && (
              <MenuItem icon="👤" onClick={() => { navigate(`/artist/${song.artist.id}`); onClose() }}>Go to Artist</MenuItem>
            )}
            {song?.album?.id && (
              <MenuItem icon="💿" onClick={() => { navigate(`/album/${song.album.id}`); onClose() }}>Go to Album</MenuItem>
            )}
            <Divider />
            <MenuItem icon="📝" onClick={handleViewLyrics}>View Lyrics</MenuItem>
            <MenuItem icon="⬇" onClick={() => { downloaded ? deleteDownload(song.id) : download(song); onClose() }}>
              {downloaded ? 'Remove Download' : 'Download'}
            </MenuItem>
            <MenuItem icon="↗" onClick={handleShare}>Share</MenuItem>
            <MenuItem icon="⚑" onClick={handleReport} muted>Report</MenuItem>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed bottom-28 left-1/2 z-[60] px-4 py-2 rounded-xl text-sm font-medium pointer-events-none"
          style={{
            transform: 'translateX(-50%)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          {toast}
        </div>
      )}
    </>
  )
}

function MenuItem({ icon, children, onClick, accent, muted }) {
  return (
    <button
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-left transition-colors hover:bg-card"
      style={{ color: accent ? 'var(--accent)' : muted ? 'var(--muted)' : 'var(--text)' }}
      onClick={onClick}
    >
      <span className="w-5 text-center flex-shrink-0">{icon}</span>
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-4 my-1" style={{ height: 1, background: 'var(--border)' }} />
}
