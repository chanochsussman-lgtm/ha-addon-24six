import React, { useState } from 'react';
import { api } from '../api';

export default function Login({ onLogin }) {
  const [step, setStep] = useState('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [creds, setCreds] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const d = await api.getProfiles(email, password);
      setCreds({ email, password });
      setProfiles(d.profiles || []);
      setStep('profiles');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  }

  async function selectProfile(profile) {
    setLoading(true); setError('');
    try {
      const d = await api.saveProfile(creds.email, creds.password, profile.id);
      onLogin(d.profile || profile);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="bg-surface rounded-2xl p-8 w-full max-w-sm shadow-xl border border-border">
        <div className="text-center mb-8">
          <div className="text-accent text-5xl mb-3">♪</div>
          <h1 className="text-2xl font-bold text-text">24Six</h1>
          <p className="text-text-secondary text-sm mt-1">Jewish Music Streaming</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-2 mb-4 text-sm">
            {error}
          </div>
        )}

        {step === 'credentials' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              className="w-full bg-card border border-border rounded-lg px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required
            />
            <input
              className="w-full bg-card border border-border rounded-lg px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required
            />
            <button
              type="submit" disabled={loading}
              className="w-full bg-accent hover:bg-accent-dim text-bg font-semibold rounded-lg py-3 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-text-secondary text-sm mb-4">Select a profile:</p>
            {profiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => selectProfile(profile)}
                disabled={loading}
                className="w-full flex items-center gap-3 bg-card hover:bg-border rounded-xl p-4 transition-colors disabled:opacity-50 text-left"
              >
                {profile.img ? (
                  <img src={profile.img} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt={profile.name} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold flex-shrink-0">
                    {(profile.name || '?')[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-text font-medium truncate">{profile.name}</div>
                  {profile.type && <div className="text-text-secondary text-xs">{profile.type}</div>}
                </div>
              </button>
            ))}
            <button
              onClick={() => { setStep('credentials'); setError(''); }}
              className="text-muted text-sm mt-2 hover:text-text transition-colors"
            >← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
