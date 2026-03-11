import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import AlbumCard from '../components/AlbumCard'

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setLoading(true)
      api.search(q).then(d => {
        const arr = d?.results || d?.data || (Array.isArray(d) ? d : [])
        setResults(arr)
        setLoading(false)
      }).catch(() => setLoading(false))
    }, 400)
    return () => clearTimeout(timer.current)
  }, [q])

  return (
    <div style={{ padding: '18px 16px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Search</div>

      {/* Search input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '10px 14px', marginBottom: 24
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Albums, artists, songs..."
          autoFocus
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text)', fontSize: 15, fontFamily: 'inherit'
          }}
        />
        {q && (
          <button onClick={() => setQ('')} style={{ background: 'transparent', color: 'var(--muted)', fontSize: 18, lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {results.map((item, i) => (
            <AlbumCard key={item.id || i} item={item} size="100%" />
          ))}
        </div>
      )}

      {!loading && q && results.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: 14 }}>
          No results for "{q}"
        </div>
      )}

      {!q && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: 14 }}>
          Search for Jewish music
        </div>
      )}
    </div>
  )
}
