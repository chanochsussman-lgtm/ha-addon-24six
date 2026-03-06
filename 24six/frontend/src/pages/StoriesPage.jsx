import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { getArtwork } from '../api'

export default function StoriesPage() {
  const { data, isLoading } = useQuery('stories', () =>
    fetch('/api/browse/section/newStories').then(r => r.json())
  )
  const items = data?.data || data?.items || data?.results || data || []
  const [active, setActive] = useState(null)
  const [viewedIds, setViewedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('24six_viewed_stories') || '[]')) }
    catch { return new Set() }
  })

  const markViewed = (id) => {
    if (!id) return
    setViewedIds(prev => {
      const next = new Set(prev)
      next.add(String(id))
      try { localStorage.setItem('24six_viewed_stories', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  if (isLoading) return (
    <div className="pt-8 pb-6 fade-in">
      <h1 className="font-display text-3xl px-6 mb-6" style={{ color: 'var(--text)' }}>Stories</h1>
      <div className="flex gap-4 px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full shimmer" />
            <div className="w-12 h-2.5 rounded shimmer" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="pt-8 pb-6 fade-in">
      <h1 className="font-display text-3xl px-6 mb-6" style={{ color: 'var(--text)' }}>Stories</h1>

      {/* Story circles row */}
      <div className="flex gap-4 px-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {items.map((item, i) => (
          <StoryCircle key={item.id || i} item={item} viewed={viewedIds.has(String(item.id))} onClick={() => setActive(i)} />
        ))}
      </div>

      {!items.length && <p className="px-6 text-sm mt-4" style={{ color: 'var(--muted)' }}>No stories right now.</p>}

      {/* Full-screen story viewer */}
      {active !== null && (
        <StoryViewer
          stories={items}
          startIndex={active}
          onClose={() => setActive(null)}
          onViewed={markViewed}
        />
      )}
    </div>
  )
}

function StoryCircle({ item, viewed, onClick }) {
  const art = getArtwork(item, 80)
  return (
    <button onClick={onClick} className="flex-shrink-0 flex flex-col items-center gap-1.5">
      <div className="p-0.5 rounded-full" style={{
        background: viewed
          ? 'var(--border)'
          : 'linear-gradient(135deg, var(--accent), #e07b39)'
      }}>
        <div className="w-14 h-14 rounded-full overflow-hidden" style={{ background: 'var(--card)', padding: 2 }}>
          {art
            ? <img src={art} alt={item.title} className="w-full h-full rounded-full object-cover" />
            : <div className="w-full h-full rounded-full flex items-center justify-center text-xl">🎵</div>
          }
        </div>
      </div>
      <p className="text-xs truncate font-medium" style={{ color: viewed ? 'var(--muted)' : 'var(--text)', maxWidth: 64 }}>
        {item.title || item.name}
      </p>
    </button>
  )
}

function StoryViewer({ stories, startIndex, onClose, onViewed }) {
  const [index, setIndex] = useState(startIndex)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const videoRef = useRef(null)

  const story = stories[index]
  const art = getArtwork(story, 800)
  const isVideo = story?.layout === 'video' || (story?.img && story.img.includes('videodelivery.net')) || story?.video_url

  // Compute duration: video uses actual length, images use 5s
  const DURATION = isVideo ? (story?.length ? story.length * 1000 : 8000) : 5000

  const next = useCallback(() => {
    if (index < stories.length - 1) { setIndex(i => i + 1); setProgress(0) }
    else onClose()
  }, [index, stories.length, onClose])

  const prev = () => {
    if (index > 0) { setIndex(i => i - 1); setProgress(0) }
  }

  // Mark current story as viewed
  useEffect(() => {
    onViewed?.(story?.id)
  }, [index])

  // Auto-advance timer (only for images; videos auto-advance on ended)
  useEffect(() => {
    if (isVideo) return
    if (paused) return
    const start = Date.now()
    let raf
    const tick = () => {
      const elapsed = Date.now() - start
      setProgress(Math.min(elapsed / DURATION, 1))
      if (elapsed < DURATION) raf = requestAnimationFrame(tick)
      else next()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [index, next, isVideo, paused, DURATION])

  // For videos, sync progress bar with video time
  useEffect(() => {
    if (!isVideo || !videoRef.current) return
    const vid = videoRef.current
    const onTimeUpdate = () => {
      if (vid.duration) setProgress(vid.currentTime / vid.duration)
    }
    const onEnded = () => next()
    vid.addEventListener('timeupdate', onTimeUpdate)
    vid.addEventListener('ended', onEnded)
    return () => {
      vid.removeEventListener('timeupdate', onTimeUpdate)
      vid.removeEventListener('ended', onEnded)
    }
  }, [index, isVideo, next])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'Escape') onClose()
      if (e.key === ' ') setPaused(p => !p)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, onClose])

  // Get the stream URL for video stories from Cloudflare
  const videoSrc = isVideo
    ? (story?.video_url || (story?.img?.includes('videodelivery.net')
        ? story.img.replace('/thumbnails/thumbnail.jpg?fit=fill', '/manifest/video.m3u8')
        : null))
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: '#000' }}>
      {/* Blurred background */}
      {art && !isVideo && (
        <img src={art} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110" aria-hidden />
      )}

      {/* Story card */}
      <div className="relative w-full max-w-sm mx-auto h-full max-h-screen flex flex-col">
        {/* Progress bars */}
        <div className="flex gap-1 px-4 pt-4 pb-2 z-10 absolute top-0 left-0 right-0">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: '#fff',
                  width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%',
                  transition: i === index ? 'none' : undefined,
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 z-10 absolute top-10 left-0 right-0">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'var(--card)' }}>
            {story?.by?.img
              ? <img src={story.by.img} alt="" className="w-full h-full object-cover" />
              : art && <img src={art} alt="" className="w-full h-full object-cover" />
            }
          </div>
          <p className="text-sm font-semibold text-white drop-shadow">{story?.by?.name || story?.title || story?.name}</p>
          {story?.length_formatted && (
            <span className="text-xs text-white/60 ml-1">{story.length_formatted}</span>
          )}
          <button onClick={onClose} className="ml-auto text-white text-xl leading-none drop-shadow">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 relative flex items-center justify-center">
          {isVideo && videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-contain"
              style={{ maxHeight: '100vh' }}
            />
          ) : isVideo ? (
            // Fallback: show thumbnail for video if stream URL unavailable
            <div className="w-full h-full flex flex-col items-center justify-center gap-4" style={{ background: '#111' }}>
              {art && <img src={art} alt={story?.title} className="max-w-full max-h-64 object-contain rounded-xl" />}
              <p className="text-white/60 text-sm">Video unavailable in browser</p>
            </div>
          ) : art ? (
            <img src={art} alt={story?.title} className="max-w-full max-h-full object-contain" style={{ borderRadius: 12 }} />
          ) : (
            <div className="text-6xl">🎵</div>
          )}

          {/* Tap zones */}
          <div className="absolute inset-0 flex" style={{ top: 80 }}>
            <div className="flex-1 cursor-pointer" onClick={prev} />
            <div className="flex-1 cursor-pointer" onClick={next} />
          </div>
        </div>

        {/* Footer text */}
        {story?.text && (
          <div className="absolute bottom-8 left-0 right-0 px-6 z-10">
            <p className="text-white text-sm leading-relaxed text-center drop-shadow-lg"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{story.text}</p>
          </div>
        )}
      </div>
    </div>
  )
}
