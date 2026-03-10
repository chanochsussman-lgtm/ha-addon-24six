import React, { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore, useDownloadStore, useZoneStore } from '../store'
import { getArtwork, getSongTitle, getArtistName, formatDuration } from '../api'

// ── Long-press hook ───────────────────────────────────────────────────────────
function useLongPress(onLongPress, onClick, delay = 500) {
  const timer = useRef(null)
  const fired = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  const start = useCallback((x, y) => {
    fired.current = false
    startPos.current = { x, y }
    timer.current = setTimeout(() => {
      fired.current = true
      onLongPress()
    }, delay)
  }, [onLongPress, delay])

  const cancel = useCallback(() => clearTimeout(timer.current), [])

  const end = useCallback(() => {
    clearTimeout(timer.current)
    if (!fired.current) onClick()
  }, [onClick])

  return {
    onMouseDown: (e) => start(e.clientX, e.clientY),
    onMouseUp: end,
    onMouseLeave: cancel,
    onTouchStart: (e) => { const t = e.touches[0]; start(t.clientX, t.clientY) },
    onTouchEnd: (e) => { e.preventDefault(); end() },
    onTouchMove: (e) => {
      const t = e.touches[0]
      if (Math.abs(t.clientX - startPos.current.x) > 10 || Math.abs(t.clientY - startPos.current.y) > 10) cancel()
    },
  }
}

// ── Bottom sheet ──────────────────────────────────────────────────────────────
function SongSheet({ song, onClose }) {
  const navigate = useNavigate()
  const { addToQueue, playNext } = usePlayerStore()

  const albumId = song?.albumId || song?.album?.id
  const artistId = song?.artistId || song?.artist?.id
  const title = song?.title_hebrew || getSongTitle(song)
  const artist = song?.subtitle_hebrew || getArtistName(song)
  const art = getArtwork(song, 96)

  const actions = [
    { label: 'Play Next',      icon: '⏭', onPress: () => { playNext(song); onClose() } },
    { label: 'Add to Queue',   icon: '➕', onPress: () => { addToQueue(song); onClose() } },
    albumId  && { label: 'Go to Album',  icon: '💿', onPress: () => { navigate(`/album/${albumId}`);  onClose() } },
    artistId && { label: 'Go to Artist', icon: '🎤', onPress: () => { navigate(`/artist/${artistId}`); onClose() } },
  ].filter(Boolean)

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div className="fixed left-0 right-0 bottom-0 z-50 rounded-t-3xl fade-in"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', paddingBottom: 'max(env(safe-area-inset-bottom),12px)' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Song info */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          {art
            ? <img src={art} alt={title} className="rounded-xl object-cover flex-shrink-0" style={{ width: 52, height: 52 }} />
            : <div className="rounded-xl flex-shrink-0 flex items-center justify-center" style={{ width: 52, height: 52, background: 'var(--card)', fontSize: 22 }}>🎵</div>
          }
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate" style={{ color: 'var(--text)', fontSize: 16 }}>{title}</p>
            <p className="truncate" style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>{artist}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="py-1">
          {actions.map(({ label, icon, onPress }) => (
            <button key={label}
              className="flex items-center gap-4 w-full px-5 active:bg-card"
              style={{ height: 58, color: 'var(--text)' }}
              onClick={onPress}>
              <span style={{ fontSize: 22, width: 30, textAlign: 'center' }}>{icon}</span>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Cancel */}
        <div className="px-4 pt-2 pb-1">
          <button className="w-full rounded-2xl font-semibold"
            style={{ height: 52, background: 'var(--card)', color: 'var(--text)', fontSize: 16 }}
            onClick={onClose}>Cancel</button>
        </div>
      </div>
    </>
  )
}

// ── SongRow ───────────────────────────────────────────────────────────────────
export default function SongRow({ song, index, queue, showIndex = false, showAlbum = false }) {
  const { currentSong, isPlaying, playSong, playQueue } = usePlayerStore()
  const { isDownloaded } = useDownloadStore()
  const { getActiveZone, playToZone } = useZoneStore()
  const [sheetOpen, setSheetOpen] = useState(false)

  const isActive = currentSong?.id === song?.id
  const art = getArtwork(song, 56)
  const title = song?.title_hebrew || getSongTitle(song)
  const artist = song?.subtitle_hebrew || getArtistName(song)
  const downloaded = isDownloaded(song?.id)

  const handlePlay = useCallback(() => {
    const zone = getActiveZone()
    if (zone?.id === 'browser') {
      if (queue) playQueue(queue, index ?? 0)
      else playSong(song)
    } else {
      playToZone(zone.id, song, queue || null, index ?? 0)
    }
  }, [song, queue, index, getActiveZone, playQueue, playSong, playToZone])

  const pressHandlers = useLongPress(() => setSheetOpen(true), handlePlay)

  return (
    <>
      <div
        className="flex items-center gap-3 px-3 rounded-xl active:bg-card"
        style={{ paddingTop: 10, paddingBottom: 10, cursor: 'pointer', WebkitUserSelect: 'none', userSelect: 'none' }}
        {...pressHandlers}
      >
        {/* Index / bars */}
        <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 28 }}>
          {isActive && isPlaying
            ? <NowPlayingBars />
            : showIndex
              ? <span style={{ color: 'var(--muted)', fontSize: 14 }}>{(index ?? 0) + 1}</span>
              : null}
        </div>

        {/* Art */}
        <div className="relative flex-shrink-0">
          {art
            ? <img src={art} alt={title} className="rounded-xl object-cover" style={{ width: 52, height: 52 }} />
            : <div className="rounded-xl flex items-center justify-center" style={{ width: 52, height: 52, background: 'var(--card)', fontSize: 22 }}>🎵</div>
          }
          {downloaded && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: 'var(--accent)', fontSize: 9 }}>↓</div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold" style={{ color: isActive ? 'var(--accent)' : 'var(--text)', fontSize: 15, lineHeight: 1.35 }}>{title}</p>
          <p className="truncate" style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>{artist}</p>
        </div>

        {/* Album (desktop) */}
        {showAlbum && (
          <p className="hidden md:block truncate text-right" style={{ color: 'var(--muted)', fontSize: 13, width: 140 }}>
            {song?.album?.title || song?.albumTitle || ''}
          </p>
        )}

        {/* Duration */}
        <span className="tabular-nums flex-shrink-0" style={{ color: 'var(--muted)', fontSize: 13, minWidth: 36, textAlign: 'right' }}>
          {formatDuration(song?.duration || song?.length)}
        </span>

        {/* More button */}
        <button
          className="flex-shrink-0 flex items-center justify-center rounded-lg"
          style={{ width: 36, height: 36, color: 'var(--muted)', fontSize: 20 }}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setSheetOpen(true) }}
        >⋯</button>
      </div>

      {sheetOpen && <SongSheet song={song} onClose={() => setSheetOpen(false)} />}
    </>
  )
}

function NowPlayingBars() {
  return (
    <div className="flex items-end justify-center gap-px" style={{ height: 16, width: 18 }}>
      {[0.6, 1.0, 0.75].map((h, i) => (
        <div key={i} className="now-playing-bar rounded-sm"
          style={{ width: 4, background: 'var(--accent)', height: `${h * 100}%`, animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}

const W = [75, 55, 80, 60, 70, 50, 65, 72]
export function SongRowSkeleton({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3" style={{ paddingTop: 10, paddingBottom: 10 }}>
          <div style={{ width: 28, flexShrink: 0 }} />
          <div className="rounded-xl shimmer flex-shrink-0" style={{ width: 52, height: 52 }} />
          <div className="flex-1 min-w-0">
            <div className="rounded shimmer" style={{ height: 14, width: `${W[i % W.length]}%`, marginBottom: 6 }} />
            <div className="rounded shimmer" style={{ height: 12, width: `${W[(i + 3) % W.length] * 0.6}%` }} />
          </div>
          <div className="rounded shimmer" style={{ width: 36, height: 12 }} />
        </div>
      ))}
    </>
  )
}

