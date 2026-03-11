import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import AlbumCard from '../components/AlbumCard'

export default function ArtistPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [artist, setArtist] = useState(null)
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.artist(id),
      api.collections(`?artist_id=${id}`)
    ]).then(([artistData, colData]) => {
      setArtist(artistData?.artist || artistData)
      const list = colData?.data || colData?.collection || (Array.isArray(colData) ? colData : [])
      setCollections(list)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  )

  if (!artist) return null

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '32px 24px 20px', position: 'relative' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 20, cursor: 'pointer', marginBottom: 16 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <img src={artist.img} alt={artist.name} style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{artist.name}</h1>
          </div>
        </div>
      </div>

      {/* Albums */}
      {collections.length > 0 && (
        <div style={{ padding: '0 20px' }}>
          <div className="section-header">Albums</div>
          <div className="scroll-row" style={{ flexWrap: 'wrap', overflowX: 'visible' }}>
            {collections.map(item => <AlbumCard key={item.id} item={item} />)}
          </div>
        </div>
      )}
    </div>
  )
}
