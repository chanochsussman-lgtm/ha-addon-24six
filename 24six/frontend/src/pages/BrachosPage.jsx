import React, { useState, useEffect, useMemo } from 'react'

// Bundled from assets/brachos.json - loaded at runtime via API
export default function BrachosPage() {
  const [brachos, setBrachos] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedCat, setSelectedCat] = useState('All')

  useEffect(() => {
    fetch('/api/brachos').then(r => r.json()).then(d => {
      setBrachos(d.results || d || [])
      setLoading(false)
    }).catch(() => { setLoading(false) })
  }, [])

  const categories = useMemo(() => {
    const cats = [...new Set(brachos.map(b => b.category).filter(Boolean))].sort()
    return ['All', ...cats]
  }, [brachos])

  const filtered = useMemo(() => {
    return brachos.filter(b => {
      const matchCat = selectedCat === 'All' || b.category === selectedCat
      const matchQ = !query || b.name.toLowerCase().includes(query.toLowerCase())
      return matchCat && matchQ
    })
  }, [brachos, query, selectedCat])

  return (
    <div className="pt-8 pb-6 fade-in">
      <div className="px-6 mb-6">
        <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text)' }}>Brachos</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Look up the bracha for any food or drink</p>
      </div>

      {/* Search */}
      <div className="px-6 mb-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--muted)' }}>🔍</span>
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
            placeholder="Search food or drink…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      </div>

      {/* Loading shimmer */}
      {loading && (
        <div className="px-6 flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-2">
              <div className="h-4 rounded shimmer flex-1" style={{ maxWidth: 180 }} />
              <div className="h-4 rounded shimmer" style={{ width: 80 }} />
              <div className="h-4 rounded shimmer" style={{ width: 80 }} />
            </div>
          ))}
        </div>
      )}

      {/* Category pills */}
      {!loading && (
        <div className="flex gap-2 px-6 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                background: selectedCat === cat ? 'var(--accent)' : 'var(--card)',
                color: selectedCat === cat ? '#0d0d0f' : 'var(--text-secondary)',
              }}
            >{cat}</button>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && (
      <div className="px-6">
        {filtered.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No results found.</p>
        )}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {filtered.map((b, i) => (
            <div
              key={b.id}
              className="px-4 py-3"
              style={{
                background: i % 2 === 0 ? 'var(--surface)' : 'var(--card)',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>{b.name}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <BrachaChip label="Bracha Rishona" value={b.brachaRishona} />
                <BrachaChip label="Bracha Achrona" value={b.brachaAchrona} />
              </div>
              {b.comments && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>{b.comments}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  )
}

function BrachaChip({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}:</span>
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(200,168,75,0.15)', color: 'var(--accent)' }}>
        {value}
      </span>
    </div>
  )
}
