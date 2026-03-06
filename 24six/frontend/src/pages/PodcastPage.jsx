import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { api, getArtwork, formatDuration } from '../api'
import { usePlayerStore } from '../store'
import SongRow from '../components/SongRow'

export default function PodcastPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { playQueue } = usePlayerStore()

  const { data: podData } = useQuery(['podcast', id], () => api.podcast(id))
  const { data: epData, isLoading } = useQuery(['podcastEpisodes', id], () => api.podcastEpisodes(id))

  const podcast = podData?.podcast || podData
  const episodes = epData?.episodes || epData?.data || epData || []
  const art = getArtwork(podcast, 300)

  return (
    <div className="pt-8 pb-6 fade-in">
      {/* Header */}
      <div className="flex gap-5 px-6 mb-6">
        {art && <img src={art} className="w-32 h-32 rounded-2xl object-cover flex-shrink-0" alt={podcast?.title} />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>PODCAST</p>
          <h1 className="font-display text-2xl mb-1" style={{ color: 'var(--text)' }}>{podcast?.title || podcast?.name}</h1>
          {podcast?.description && (
            <p className="text-sm leading-relaxed mt-2" style={{ color: 'var(--text-secondary)' }}>{podcast.description}</p>
          )}
          {episodes.length > 0 && (
            <button className="mt-3 px-5 py-2 rounded-full text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#0d0d0f' }}
              onClick={() => playQueue(episodes)}>▶ Play All</button>
          )}
        </div>
      </div>

      {/* Episodes */}
      <div className="px-6">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>EPISODES</h2>
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex-1"><div className="h-3.5 w-3/4 shimmer rounded mb-1.5" /><div className="h-3 w-1/2 shimmer rounded" /></div>
            <div className="h-3 w-10 shimmer rounded" />
          </div>
        ))}
        {episodes.map((ep, i) => <SongRow key={ep.id || i} song={ep} index={i} queue={episodes} showIndex />)}
      </div>
    </div>
  )
}
