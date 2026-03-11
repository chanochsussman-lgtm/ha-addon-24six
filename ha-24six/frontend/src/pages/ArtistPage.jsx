import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import SectionRow from '../components/SectionRow'

// DEBUG: set to true to show raw API response on screen
const DEBUG = true

export default function ArtistPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [raw, setRaw]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.artist(id)
      .then(d => { setData(d); setRaw(JSON.stringify(d, null, 2)); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (error) return (
    <div style={{ padding: 20 }}>
      <button onClick={() => nav(-1)} style={{ color: 'var(--accent)', background: 'none', border: 'none', fontSize: 14, marginBottom: 12, cursor: 'pointer' }}>← Back</button>
      <div style={{ color: '#f66', fontSize: 13 }}>Error: {error}</div>
    </div>
  )

  if (DEBUG && raw) return (
    <div style={{ padding: 16 }}>
      <button onClick={() => nav(-1)} style={{ color: 'var(--accent)', background: 'none', border: 'none', fontSize: 14, marginBottom: 12, cursor: 'pointer' }}>← Back</button>
      <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 8 }}>DEBUG — artist/{id} raw response (first 3000 chars):</div>
      <pre style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'var(--surface)', padding: 12, borderRadius: 8, maxHeight: '80vh', overflowY: 'auto' }}>
        {raw?.slice(0, 3000)}
      </pre>
    </div>
  )

  const artist = data?.artist || data?.data || data
  const collections = data?.collections || artist?.collections || []
  const imgUrl = artist?.img ? api.imgUrl(artist.img) : null

  return (
    <div>
      <div style={{ background: 'linear-gradient(180deg, #2a2b3299 0%, var(--bg) 100%)', padding: '14px 16px 28px' }}>
        <button onClick={() => nav(-1)} style={{ background: 'rgba(0,0,0,0.35)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 14, gap: 12 }}>
          <div style={{ width: 110, height: 110, borderRadius: '50%', overflow: 'hidden', background: 'var(--card)', boxShadow: '0 6px 24px rgba(0,0,0,0.5)' }}>
            {imgUrl && <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{artist?.name || artist?.title}</div>
        </div>
      </div>
      {collections.length > 0
        ? <SectionRow title="Albums" items={collections} cardSize={120} />
        : <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>No albums found</div>
      }
    </div>
  )
}
