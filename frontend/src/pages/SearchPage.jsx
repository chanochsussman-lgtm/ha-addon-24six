import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import AlbumCard from '../components/AlbumCard'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const debounce = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api.search(query)
        const list = data?.data || data?.collection || (Array.isArray(data) ? data : [])
        setResults(list)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }, 400)
  }, [query])

  return (
    <div style={{ padding: '24px 20px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, color: 'var(--text)' }}>Search</h1>

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search songs, albums, artists..."
        style={{
          width: '100%', maxWidth: 480,
          padding: '10px 14px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          color: 'var(--text)',
          fontSize: 14,
          outline: 'none',
          marginBottom: 24
        }}
        autoFocus
      />

      {loading && <div className="spinner" style={{ margin: '32px auto' }} />}

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {results.map(item => <AlbumCard key={item.id} item={item} />)}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>No results found for "{query}"</p>
      )}
    </div>
  )
}
