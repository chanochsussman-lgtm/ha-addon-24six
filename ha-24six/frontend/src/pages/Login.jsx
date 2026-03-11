import { useState } from 'react'
import { api } from '../api'

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')
    try {
      const res = await api.login()
      if (res.success) {
        onLogin()
      } else {
        setError('Login failed. Check server logs.')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', background: 'var(--bg)', gap: 16
    }}>
      <div style={{ fontSize: 48 }}>🎵</div>
      <h1 style={{ color: 'var(--text)', fontSize: 28, fontWeight: 800 }}>24Six</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Connect to your 24Six account</p>

      {error && (
        <p style={{ color: '#e55', fontSize: 13, background: 'var(--card)', padding: '8px 16px', borderRadius: 6 }}>
          {error}
        </p>
      )}

      <button className="btn-accent" onClick={handleLogin} disabled={loading} style={{ marginTop: 8 }}>
        {loading ? 'Connecting...' : 'Connect Account'}
      </button>
    </div>
  )
}
