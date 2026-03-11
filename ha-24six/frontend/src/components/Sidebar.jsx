import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/search', icon: '🔍', label: 'Search' },
]

export default function Sidebar() {
  return (
    <div className="sidebar">
      {/* Logo */}
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>24Six</span>
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 0' }}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: isActive ? 700 : 400,
              background: isActive ? 'var(--card)' : 'transparent',
              borderRadius: 6,
              margin: '2px 8px',
              transition: 'all 0.15s'
            })}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
