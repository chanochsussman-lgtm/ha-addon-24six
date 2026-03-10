import React, { useState, useEffect } from 'react'

export default function PinLock({ profileName, onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)

  const handleDigit = (d) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) verify(next)
  }

  const handleDelete = () => setPin(p => p.slice(0, -1))

  const verify = async (code) => {
    try {
      const r = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: code })
      })
      const d = await r.json()
      if (d.ok) {
        onUnlock()
      } else {
        setError('Incorrect PIN')
        setShaking(true)
        setTimeout(() => { setShaking(false); setPin(''); setError('') }, 800)
      }
    } catch {
      setPin('')
      setError('Error. Try again.')
    }
  }

  const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del']

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'var(--bg)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display text-sm font-bold mb-6"
        style={{ background: 'var(--accent)', color: '#0d0d0f' }}>24</div>

      <h1 className="font-display text-2xl mb-1" style={{ color: 'var(--text)' }}>
        {profileName || 'Enter PIN'}
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>Enter your 4-digit PIN to continue</p>

      {/* Dots */}
      <div className={`flex gap-4 mb-3 ${shaking ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div key={i}
            className="w-4 h-4 rounded-full border-2 transition-all"
            style={{
              borderColor: 'var(--accent)',
              background: i < pin.length ? 'var(--accent)' : 'transparent',
              transform: i < pin.length ? 'scale(1.1)' : 'scale(1)',
            }} />
        ))}
      </div>

      {error && <p className="text-sm mb-4" style={{ color: '#e57373' }}>{error}</p>}
      {!error && <div className="h-5 mb-4" />}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3" style={{ width: 240 }}>
        {KEYS.map((k, i) => {
          if (k === null) return <div key={i} />
          return (
            <button key={i}
              onClick={() => k === 'del' ? handleDelete() : handleDigit(String(k))}
              className="h-16 rounded-2xl flex items-center justify-center text-xl font-medium transition-all active:scale-95"
              style={{
                background: k === 'del' ? 'var(--surface)' : 'var(--card)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              {k === 'del' ? '⌫' : k}
            </button>
          )
        })}
      </div>

    </div>
  )
}
