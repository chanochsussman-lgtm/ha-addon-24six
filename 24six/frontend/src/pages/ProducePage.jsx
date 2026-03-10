import React, { useState, useMemo } from 'react'
import produceData from '../data/produce.json'

const CATEGORIES = ['All', ...Array.from(new Set(produceData.map(p => p.category))).sort()]

const CATEGORY_COLORS = {
  'Fresh Vegetables': '#1a5f4a',
  'Frozen Vegetables': '#2d4a7a',
  'Canned Vegetables': '#5c3317',
  'Fresh Berries': '#6b2d5e',
  'Dried Fruit': '#4a3a1a',
}

export default function ProducePage() {
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(null)

  const filtered = useMemo(() => {
    let items = produceData
    if (category !== 'All') items = items.filter(p => p.category === category)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      items = items.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.insectType?.toLowerCase().includes(q)
      )
    }
    return items
  }, [category, query])

  return (
    <div className="pt-8 pb-6 fade-in">
      {/* Header */}
      <div className="px-6 mb-6">
        <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text)' }}>Produce Checking</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          OU Kosher insect inspection guide
        </p>
      </div>

      {/* Search */}
      <div className="px-6 mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width={16} height={16} viewBox="0 0 24 24"
            fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search produce…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {query && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'var(--muted)' }}
              onClick={() => setQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 px-6 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={{
              background: category === cat ? 'var(--accent)' : 'var(--card)',
              color: category === cat ? '#0d0d0f' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >{cat}</button>
        ))}
      </div>

      {/* Results count */}
      <p className="px-6 mb-3 text-xs" style={{ color: 'var(--muted)' }}>
        {filtered.length} item{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Produce list */}
      <div className="px-6 flex flex-col gap-2">
        {filtered.map(item => (
          <ProduceCard
            key={item.id}
            item={item}
            expanded={expanded === item.id}
            onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🥬</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No produce found</p>
          </div>
        )}
      </div>

      {/* Attribution */}
      <p className="px-6 mt-8 text-xs" style={{ color: 'var(--muted)' }}>
        Data sourced from OU Kosher. Always consult a rabbi for halachic questions.
      </p>
    </div>
  )
}

function ProduceCard({ item, expanded, onToggle }) {
  const catColor = CATEGORY_COLORS[item.category] || '#2a2b32'
  const methodLines = item.inspectionMethod?.split(/\r?\n/).filter(Boolean) || []

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${expanded ? 'var(--accent)' : 'var(--border)'}`,
      }}
      onClick={onToggle}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Category color dot */}
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: catColor }} />

        {/* Produce image */}
        {item.image && (
          <img
            src={item.image}
            alt={item.name}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            onError={e => { e.target.style.display = 'none' }}
          />
        )}

        {/* Name + category */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {item.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {item.category}
            {item.insectType && <span> · {item.insectType}</span>}
          </p>
        </div>

        {/* Expand chevron */}
        <svg
          width={16} height={16} viewBox="0 0 24 24" fill="none"
          stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          {item.insectLocation && (
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent)' }}>
                Where Insects Hide
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {item.insectLocation}
              </p>
            </div>
          )}
          {methodLines.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>
                Inspection Method
              </p>
              <div className="flex flex-col gap-2">
                {methodLines.map((line, i) => (
                  <p key={i} className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.6 }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
