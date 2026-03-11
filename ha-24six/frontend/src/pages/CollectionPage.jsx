import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { usePlayer } from '../store'

export default function CollectionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { playTrack, currentTrack, playing } = usePlayer()
  const [collection, setCollection] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.collection(id),
      api.collectionSongs(id)
    ]).then(([meta, songData]) => {
      // meta: {collection: {...}}
      setCollection(meta?.collection || meta)
      // songs may be in .content, .data, or root array
      const list = songData?.content || songData?.data || (Array.isArray(songData) ? songData : [])
      setSongs(list)
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  )

  if (error) return <div style={{ padding: 24, color: '#e55' }}>Error: {error}</div>
  if (!collection) return null

  const img = collection.img
  const color = collection.color || 'var(--surface)'

  return (
    <div>
      {/* Header */}
      <div style={{
        background: `linear-gradient(180deg, ${color}88 0%, var(--bg) 100%)`,
        padding: '32px 24px 20px',
        display: 'flex',
        gap: 20,
        alignItems: 'flex-end'
      }}>
        <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: 16, left: 16, background: 'none', border: 'none', color: 'var(--text)', fontSize: 20, cursor: 'pointer' }}>
          ←
        </button>
        <img src={img} alt={collection.title} style={{ width: 160, height: 160, borderRadius: 8, objectFit: 'cover', flexShrink: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Album</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{collection.title}</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{collection.subtitle}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{songs.length} songs</div>
        </div>
      </div>

      {/* Play all button */}
      {songs.length > 0 && (
        <div style={{ padding: '8px 24px 16px' }}>
          <button className="btn-accent" onClick={() => playTrack(songs[0], songs, 0)}>
            ▶ Play All
          </button>
        </div>
      )}

      {/* Songs */}
      <div style={{ padding: '0 16px' }}>
        {songs.map((song, i) => {
          const isActive = currentTrack?.id === song.id
          return (
            <div
              key={song.id || i}
              className={`song-row${isActive ? ' active' : ''}`}
              onClick={() => playTrack(song, songs, i)}
            >
              <div style={{ width: 24, textAlign: 'center', color: isActive ? 'var(--accent)' : 'var(--muted)', fontSize: 12 }}>
                {isActive && playing ? '▶' : i + 1}
              </div>
              <img src={song.img || img} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="song-title" style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {song.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {song.subtitle || collection.subtitle}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
