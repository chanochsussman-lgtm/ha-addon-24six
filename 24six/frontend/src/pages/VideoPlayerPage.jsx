import React, { useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { api, getSongTitle, getArtistName } from '../api'

export default function VideoPlayerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)

  const { data, isLoading } = useQuery(['video', id], () => api.video(id))
  const video = data?.video || data

  useEffect(() => {
    if (!video?.streamUrl && !video?.url) return
    const el = videoRef.current
    if (el) {
      el.src = video.streamUrl || video.url
      el.play().catch(() => {})
    }
  }, [video])

  return (
    <div className="pt-6 pb-6 fade-in">
      <div className="flex items-center gap-3 px-6 mb-4">
        <button onClick={() => navigate(-1)} className="text-sm" style={{ color: 'var(--accent)' }}>← Back</button>
      </div>
      {isLoading && <div className="mx-6 rounded-2xl shimmer" style={{ height: 360 }} />}
      {video && (
        <>
          <div className="mx-6 rounded-2xl overflow-hidden mb-4" style={{ background: '#000' }}>
            <video
              ref={videoRef}
              controls
              className="w-full"
              style={{ maxHeight: 400, display: 'block' }}
              playsInline
            />
          </div>
          <div className="px-6">
            <h1 className="font-display text-2xl mb-1" style={{ color: 'var(--text)' }}>
              {getSongTitle(video)}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{getArtistName(video)}</p>
            {video.description && (
              <p className="text-sm mt-4 leading-relaxed" style={{ color: 'var(--muted)' }}>{video.description}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
