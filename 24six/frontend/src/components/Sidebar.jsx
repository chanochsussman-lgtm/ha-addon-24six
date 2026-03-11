import React from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../store';
import { api } from '../api';

const links = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/search', label: 'Search', icon: '⌕' },
  { to: '/library', label: 'Library', icon: '♥' },
];

export default function Sidebar() {
  const { profile, setConfigured } = useStore();

  async function logout() {
    await api.reset().catch(() => {});
    setConfigured(false, null);
    window.location.reload();
  }

  return (
    <div className="w-56 flex-shrink-0 bg-surface border-r border-border flex flex-col py-6 px-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <span className="text-accent text-2xl">♪</span>
        <span className="text-text font-bold text-lg">24Six</span>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-secondary hover:text-text hover:bg-card'
              }`
            }
          >
            <span className="text-base">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>

      {profile && (
        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex items-center gap-2 px-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">
              {(profile.name || '?')[0]}
            </div>
            <span className="text-text-secondary text-xs truncate">{profile.name}</span>
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-muted text-xs hover:text-text rounded-lg hover:bg-card transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
