import React from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { api, getArtwork } from '../api'
import { usePlayerStore } from '../store'

export default function VideosPage() {
  const { data, isLoading } = useQuery('videos', api.videos)
  const items = data?.data || data?.videos || data || []
  const navigate = useNavigate()
  const { playSong } = usePlayerStore()

  return (
    <div className="pt-8 pb-6 fade-in">
      <h1 className="font-display text-3xl px-6 mb-6" style={{ color: 'var(--text)' }}>Videos</h1>
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <div className="w-full h-40 shimmer" />
              <div className="p-3"><div className="h-3.5 w-2/3 shimmer rounded mb-2" /><div className="h-3 w-1/3 shimmer rounded" /></div>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6">
        {items.map(item => {
          const art = getArtwork(item, 400)
          return (
            <div key={item.id} className="rounded-2xl overflow-hidden cursor-pointer group"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              onClick={() => navigate(`/video/${item.id}`)}>
              <div className="relative">
                {art ? (
                  <img src={art} alt={item.title} className="w-full h-44 object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="w-full h-44 flex items-center justify-center text-4xl" style={{ background: 'var(--surface)' }}>🎬</div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.4)' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--accent)', color: '#0d0d0f' }}>▶</div>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-medium"
                  style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>VIDEO</div>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.title || item.name}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {item.artist?.name || item.artistName || ''}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {!isLoading && !items.length && (
        <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>No videos available.</p>
      )}
    </div>
  )
}
