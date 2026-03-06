import React, { useEffect } from 'react'
import { useDownloadStore } from '../store'
import { usePlayerStore } from '../store'
import { getSongTitle, getArtistName, getArtwork, formatDuration } from '../api'

export default function DownloadsPage() {
  const { downloads, loadDownloads, deleteDownload } = useDownloadStore()
  const { playSong } = usePlayerStore()

  useEffect(() => { loadDownloads() }, [])

  const items = Object.values(downloads)
  const completed = items.filter(d => d.status === 'completed')
  const active = items.filter(d => d.status === 'downloading' || d.status === 'queued')
  const failed = items.filter(d => d.status === 'failed')

  // Play downloaded song from local server file (no re-fetch from CDN)
  const playLocal = (dl) => {
    const song = dl.song || { id: dl.contentId }
    const { audioEl } = usePlayerStore.getState()
    if (audioEl) {
      audioEl.src = `/api/downloads/${dl.contentId}/play`
      audioEl.play().catch(() => {})
      usePlayerStore.setState({ currentSong: song, isPlaying: true, progress: 0 })
    } else {
      playSong(song)
    }
  }

  return (
    <div className="pt-8 pb-6 fade-in">
      <div className="px-6 mb-6">
        <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text)' }}>Downloads</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {completed.length} songs · {Math.round(completed.reduce((a, d) => a + (d.sizeBytes || 0), 0) / 1024 / 1024)} MB
        </p>
      </div>

      {/* Active downloads */}
      {active.length > 0 && (
        <div className="px-6 mb-6">
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--muted)' }}>DOWNLOADING</p>
          {active.map((dl, i) => {
            const song = dl.song || {}
            return (
              <div key={song.id || i} className="flex items-center gap-3 py-2">
                <div className="w-10 h-10 rounded-md flex-shrink-0 shimmer" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--text)' }}>{getSongTitle(song)}</p>
                  <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${dl.progress || 0}%`, background: 'var(--accent)' }} />
                  </div>
                </div>
                <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{dl.progress || 0}%</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Failed downloads */}
      {failed.length > 0 && (
        <div className="px-6 mb-6">
          <p className="text-xs font-semibold mb-2" style={{ color: '#e57373' }}>FAILED</p>
          {failed.map((dl, i) => {
            const song = dl.song || {}
            return (
              <div key={song.id || i} className="flex items-center gap-3 py-2">
                <div className="w-10 h-10 rounded-md flex-shrink-0 flex items-center justify-center text-lg"
                  style={{ background: 'var(--card)' }}>⚠</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--text)' }}>{getSongTitle(song)}</p>
                  <p className="text-xs" style={{ color: '#e57373' }}>Download failed</p>
                </div>
                <button className="text-sm px-2 py-1 rounded"
                  style={{ color: 'var(--muted)' }}
                  onClick={() => deleteDownload(dl.contentId || song.id)}>✕</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="px-6">
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--muted)' }}>DOWNLOADED</p>
          {completed.map((dl, i) => {
            const song = dl.song || {}
            const art = getArtwork(song, 48)
            return (
              <div key={song.id || i}
                className="group flex items-center gap-3 py-2 rounded-lg px-2 cursor-pointer transition-colors hover:bg-card"
                onDoubleClick={() => playLocal(dl)}>
                {art
                  ? <img src={art} className="w-10 h-10 rounded-md object-cover flex-shrink-0" alt="" />
                  : <div className="w-10 h-10 rounded-md flex-shrink-0 flex items-center justify-center text-lg" style={{ background: 'var(--card)' }}>🎵</div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{getSongTitle(song)}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{getArtistName(song)}</p>
                </div>
                <button
                  className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                  style={{ background: 'var(--accent)', color: '#0d0d0f' }}
                  title="Play"
                  onClick={() => playLocal(dl)}
                >▶</button>
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                  style={{ background: 'var(--accent)', color: '#0d0d0f' }}>↓</div>
                <button className="opacity-0 group-hover:opacity-100 text-sm px-2 py-1 rounded transition-all"
                  style={{ color: '#e57373' }}
                  onClick={e => { e.stopPropagation(); deleteDownload(dl.contentId || song.id) }}>✕</button>
              </div>
            )
          })}
        </div>
      )}

      {items.length === 0 && (
        <div className="px-6 text-center py-12">
          <p className="text-4xl mb-3">⬇</p>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>No downloads yet</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Press ⋯ on any song and choose Download to listen offline</p>
        </div>
      )}
    </div>
  )
}
