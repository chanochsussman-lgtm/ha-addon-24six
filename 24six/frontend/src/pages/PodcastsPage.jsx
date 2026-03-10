import React from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { api, getArtwork } from '../api'

export default function PodcastsPage() {
  const { data, isLoading } = useQuery('podcasts', api.podcasts)
  const items = data?.data || data?.podcasts || data || []
  const navigate = useNavigate()

  return (
    <div className="pt-8 pb-6 fade-in">
      <h1 className="font-display text-3xl px-6 mb-6" style={{ color: 'var(--text)' }}>Podcasts</h1>
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}><div className="w-full aspect-square rounded-2xl shimmer mb-2" />
              <div className="h-3 w-3/4 shimmer rounded mb-1" /><div className="h-2.5 w-1/2 shimmer rounded" /></div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6">
        {items.map(item => {
          const art = getArtwork(item, 300)
          return (
            <div key={item.id} className="cursor-pointer group" onClick={() => navigate(`/podcast/${item.id}`)}>
              <div className="w-full aspect-square rounded-2xl overflow-hidden mb-2" style={{ background: 'var(--card)' }}>
                {art
                  ? <img src={art} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl">🎙️</div>}
              </div>
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.title || item.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {item.episodeCount ? `${item.episodeCount} episodes` : ''}
              </p>
            </div>
          )
        })}
      </div>
      {!isLoading && !items.length && (
        <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>No podcasts available.</p>
      )}
    </div>
  )
}
