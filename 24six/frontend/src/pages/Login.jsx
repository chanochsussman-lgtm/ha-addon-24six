import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [profiles, setProfiles] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const checkAuth = useAuthStore(s => s.checkAuth)

  const handleLogin = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    if (!email || !password) { setError('Email and password are required'); return }
    setLoading(true)
    setError('')
    try {
      const r = await fetch((window.ingressPath||'') + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Login failed'); setLoading(false); return }

      if (d.profiles?.length > 1) {
        setProfiles(d.profiles)
        setSelectedProfile(d.profiles[0].id)
      } else {
        await checkAuth()
        navigate('/')
      }
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }

  const handleProfileSelect = async () => {
    const profile = profiles.find(p => p.id === selectedProfile)
    await fetch((window.ingressPath||'') + '/api/auth/select-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: selectedProfile, profileName: profile?.name }),
    })
    await checkAuth()
    navigate('/')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(200,168,75,0.08) 0%, transparent 70%)',
        }}
      />

      <div
        className="w-full max-w-sm rounded-2xl p-8 fade-in"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 font-display text-2xl font-bold"
            style={{ background: 'var(--accent)', color: '#0d0d0f' }}
          >
            24
          </div>
          <h1 className="font-display text-2xl" style={{ color: 'var(--text)' }}>24Six</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Jewish Music Streaming</p>
        </div>

        {profiles ? (
          /* Profile selection */
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>Select Profile</p>
            <div className="flex flex-col gap-2 mb-6">
              {profiles.map(p => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                  style={{
                    background: selectedProfile === p.id ? 'rgba(200,168,75,0.15)' : 'var(--card)',
                    border: selectedProfile === p.id ? '1px solid var(--accent)' : '1px solid transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="profile"
                    value={p.id}
                    checked={selectedProfile === p.id}
                    onChange={() => setSelectedProfile(p.id)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span style={{ color: 'var(--text)' }}>{p.name}</span>
                </label>
              ))}
            </div>
            <button
              className="w-full py-3 rounded-xl font-medium transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#0d0d0f' }}
              onClick={handleProfileSelect}
            >
              Continue
            </button>
          </div>
        ) : (
          /* Login form */
          <div className="flex flex-col gap-4">
            {error && (
              <p className="text-sm text-center py-2 rounded-lg" style={{ color: '#e57373', background: 'rgba(229,115,115,0.1)' }}>
                {error}
              </p>
            )}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                onKeyDown={e => e.key === 'Enter' && !loading && handleLogin(e)}
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                onKeyDown={e => e.key === 'Enter' && !loading && handleLogin(e)}
              />
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleLogin}
              className="w-full py-3 rounded-xl font-medium transition-opacity hover:opacity-90 mt-2"
              style={{ background: 'var(--accent)', color: '#0d0d0f', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
