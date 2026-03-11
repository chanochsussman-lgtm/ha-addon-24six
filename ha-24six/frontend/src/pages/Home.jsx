import { useEffect, useState } from 'react'
import { api } from '../api'
import AlbumCard from '../components/AlbumCard'

export default function Home() {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.home()
      .then(data => {
        // data is array of {category, data[]}
        setSections(Array.isArray(data) ? data : [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  )

  if (error) return (
    <div style={{ padding: 24, color: '#e55' }}>Error: {error}</div>
  )

  return (
    <div style={{ padding: '24px 20px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, color: 'var(--text)' }}>
        Home
      </h1>

      {sections.map(({ category, data }) => (
        <section key={category.id} style={{ marginBottom: 32 }}>
          <div className="section-header">{category.title}</div>
          <div className="scroll-row">
            {data.map(item => (
              <AlbumCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
