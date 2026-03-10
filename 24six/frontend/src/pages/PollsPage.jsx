import React, { useState } from 'react'
import { useQuery } from 'react-query'

export default function PollsPage() {
  const { data, isLoading } = useQuery('polls', () =>
    fetch('/api/polls').then(r => r.json())
  )
  const polls = data?.polls || data?.data || data || []

  if (isLoading) return (
    <div className="pt-8 pb-6 fade-in px-6">
      <h1 className="font-display text-3xl mb-6" style={{ color: 'var(--text)' }}>Polls</h1>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl p-5 mb-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="h-4 rounded shimmer mb-4 w-3/4" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="h-10 rounded-xl shimmer mb-2" />
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <div className="pt-8 pb-6 fade-in">
      <h1 className="font-display text-3xl px-6 mb-6" style={{ color: 'var(--text)' }}>Polls</h1>
      {!polls.length && (
        <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>No polls right now. Check back soon!</p>
      )}
      <div className="px-6 flex flex-col gap-4">
        {polls.map(poll => <PollCard key={poll.id} poll={poll} />)}
      </div>
    </div>
  )
}

function PollCard({ poll }) {
  const [voted, setVoted] = useState(poll.userVote ?? null)
  const [counts, setCounts] = useState(poll.options?.map(o => o.votes || 0) || [])
  const total = counts.reduce((a, b) => a + b, 0)

  const handleVote = async (idx) => {
    if (voted !== null) return
    const newCounts = counts.map((c, i) => i === idx ? c + 1 : c)
    setCounts(newCounts)
    setVoted(idx)
    await fetch(`/api/polls/${poll.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionIndex: idx })
    }).catch(() => {})
  }

  const GRADIENT_COLORS = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
  ]

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold text-base mb-4 leading-snug" style={{ color: 'var(--text)' }}>
        {poll.title || poll.question}
      </h2>
      <div className="flex flex-col gap-2">
        {(poll.options || []).map((opt, i) => {
          const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0
          const isVoted = voted === i
          return (
            <button key={i}
              onClick={() => handleVote(i)}
              disabled={voted !== null}
              className="relative w-full text-left rounded-xl overflow-hidden transition-transform active:scale-95"
              style={{
                height: 48,
                background: voted !== null ? 'var(--surface)' : 'var(--surface)',
                border: isVoted ? '2px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              {/* Fill bar */}
              {voted !== null && (
                <div className="absolute inset-y-0 left-0 rounded-xl transition-all"
                  style={{ width: `${pct}%`, background: GRADIENT_COLORS[i % GRADIENT_COLORS.length], opacity: 0.25 }} />
              )}
              <div className="absolute inset-0 flex items-center justify-between px-4">
                <span className="text-sm font-medium" style={{ color: isVoted ? 'var(--accent)' : 'var(--text)' }}>
                  {opt.text || opt.label || opt}
                </span>
                {voted !== null && (
                  <span className="text-sm font-semibold tabular-nums" style={{ color: isVoted ? 'var(--accent)' : 'var(--muted)' }}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      {voted !== null && (
        <p className="text-xs mt-3 text-right" style={{ color: 'var(--muted)' }}>{total} votes</p>
      )}
    </div>
  )
}
