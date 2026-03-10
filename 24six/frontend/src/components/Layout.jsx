import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore, usePlayerStore } from '../store'
import Player from './Player'
import SpeakerPanel from './SpeakerPanel'

const NAV_MAIN = [
  { to: '/', icon: HomeIcon, label: 'Home' },
  { to: '/search', icon: SearchIcon, label: 'Search' },
  { to: '/library', icon: LibraryIcon, label: 'Library' },
  { to: '/torah', icon: TorahIcon, label: 'Torah' },
  { to: '/live', icon: LiveIcon, label: 'Live Radio' },
  { to: '/videos', icon: VideoIcon, label: 'Videos' },
  { to: '/podcasts', icon: PodcastIcon, label: 'Podcasts' },
]

const NAV_PERSONAL = [
  { to: '/recent', icon: ClockIcon, label: 'Recently Played' },
  { to: '/favorites', icon: HeartIcon, label: 'Favorites' },
  { to: '/queue', icon: QueueIcon, label: 'Queue' },
  { to: '/downloads', icon: DownloadIcon, label: 'Downloads' },
  { to: '/alarms', icon: AlarmIcon, label: 'Alarms' },
]

const NAV_JEWISH = [
  { to: '/zmanim', icon: ClockFaceIcon, label: 'Zmanim' },
  { to: '/brachos', icon: BookIcon, label: 'Brachos' },
  { to: '/produce', icon: ProduceIcon, label: 'Produce Checking' },
]

const NAV_DISCOVER = [
  { to: '/stories', icon: StoriesIcon, label: 'Stories' },
  { to: '/polls', icon: PollIcon, label: 'Polls' },
  { to: '/rewind', icon: RewindIcon, label: 'Rewind' },
]

const MOBILE_NAV = [
  { to: '/', icon: HomeIcon, label: 'Home' },
  { to: '/search', icon: SearchIcon, label: 'Search' },
  { to: '/library', icon: LibraryIcon, label: 'Library' },
  { to: '/live', icon: LiveIcon, label: 'Live' },
]

export default function Layout({ children }) {
  const [speakerOpen, setSpeakerOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 overflow-y-auto fixed md:relative z-40 h-full transition-transform duration-300"
        style={{
          width: 'var(--nav-width)',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
        }}
        data-sidebar
        data-open={sidebarOpen ? 'true' : 'false'}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#0d0d0f' }}>24</div>
          <span className="font-display text-lg" style={{ color: 'var(--text)' }}>24Six</span>
          {/* Close button on mobile */}
          <button
            className="ml-auto p-1 md-hidden"
            style={{ color: 'var(--muted)', display: 'none' }}
            id="sidebar-close"
            onClick={closeSidebar}
          >✕</button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 pt-1 flex flex-col gap-0.5 overflow-y-auto">
          <NavSection items={NAV_MAIN} onNavigate={closeSidebar} />
          <Divider label="Personal" />
          <NavSection items={NAV_PERSONAL} onNavigate={closeSidebar} />
          <Divider label="Jewish" />
          <NavSection items={NAV_JEWISH} onNavigate={closeSidebar} />
          <Divider label="Discover" />
          <NavSection items={NAV_DISCOVER} onNavigate={closeSidebar} />
        </nav>

        {/* Bottom: settings + speakers + logout */}
        <div className="px-3 pb-4 flex flex-col gap-0.5 border-t flex-shrink-0"
          style={{ borderColor: 'var(--border)', paddingTop: 12, marginTop: 8 }}>
          <NavButton icon={<SettingsIcon size={18} />} label="Settings" onClick={() => { navigate('/settings'); closeSidebar() }} />
          <NavButton icon={<SpeakerIcon size={18} />} label="Speakers" onClick={() => { setSpeakerOpen(true); closeSidebar() }} />
          <NavButton icon={<LogoutIcon size={18} />} label="Sign Out" onClick={handleLogout} muted />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
        {/* Mobile top bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            display: 'none',
          }}
          id="mobile-topbar"
        >
          <button
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setSidebarOpen(true)}
          >
            <HamburgerIcon size={20} />
          </button>
          <div className="w-6 h-6 rounded flex items-center justify-center font-display text-xs font-bold"
            style={{ background: 'var(--accent)', color: '#0d0d0f' }}>24</div>
          <span className="font-display text-base" style={{ color: 'var(--text)' }}>24Six</span>
        </div>

        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(var(--player-height) + 16px)' }}>
          {children}
        </main>
        <Player onSpeakerClick={() => setSpeakerOpen(true)} />
      </div>

      {speakerOpen && <SpeakerPanel onClose={() => setSpeakerOpen(false)} />}

      {/* Mobile bottom nav bar */}
      <nav
        id="mobile-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{
          background: 'rgba(23,24,28,0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          display: 'none',
        }}
      >
        <div className="flex items-center justify-around px-2 py-1">
          {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={closeSidebar}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors"
              style={({ isActive }) => ({
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                minWidth: 52,
              })}
            >
              <Icon size={22} />
              <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
            </NavLink>
          ))}
          <button
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl"
            style={{ color: 'var(--text-secondary)', minWidth: 52 }}
            onClick={() => setSidebarOpen(true)}
          >
            <HamburgerIcon size={22} />
            <span style={{ fontSize: 10, fontWeight: 500 }}>More</span>
          </button>
        </div>
      </nav>

      {/* Responsive styles injected inline so they work without a CSS preprocessor */}
      <style>{`
        @media (max-width: 768px) {
          [data-sidebar] { transform: translateX(-100%); }
          [data-sidebar][data-open="true"] { transform: translateX(0) !important; }
          #mobile-topbar { display: flex !important; }
          #sidebar-close { display: block !important; }
          #mobile-bottom-nav { display: block !important; }
          :root { --nav-width: 0px; }
          /* On mobile: player sits above bottom nav */
          .fixed.bottom-0.glass { bottom: calc(56px + env(safe-area-inset-bottom)) !important; }
          main { padding-bottom: calc(var(--player-height) + 56px + env(safe-area-inset-bottom) + 16px) !important; }
        }
        @media (min-width: 769px) {
          [data-sidebar] { position: relative !important; transform: none !important; }
          #mobile-bottom-nav { display: none !important; }
        }
      `}</style>
    </div>
  )
}

function NavSection({ items, onNavigate }) {
  return (
    <>
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive ? '' : 'text-text-secondary hover:text-text hover:bg-card'
            }`
          }
          style={({ isActive }) => isActive
            ? { background: 'var(--card)', color: 'var(--accent)' }
            : { color: 'var(--text-secondary)' }
          }
        >
          <Icon size={17} />
          {label}
        </NavLink>
      ))}
    </>
  )
}

function Divider({ label }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider px-3 pt-4 pb-1"
      style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}>
      {label}
    </p>
  )
}

function NavButton({ icon, label, onClick, muted }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left transition-all hover:bg-card"
      style={{ color: muted ? 'var(--muted)' : 'var(--text-secondary)' }}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function HomeIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function SearchIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function LibraryIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> }
function ClockIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function HeartIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> }
function QueueIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> }
function SpeakerIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="14" r="4"/><line x1="12" y1="6" x2="12" y2="6.01"/></svg> }
function LogoutIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
function VideoIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> }
function PodcastIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0"/><path d="M22 8A10 10 0 0 0 2 8"/><circle cx="12" cy="20" r="2"/><line x1="12" y1="8" x2="12" y2="18"/></svg> }
function DownloadIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function AlarmIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M6.38 18.7 4 21"/><path d="M17.64 18.67 20 21"/><path d="M12 10v3l2 2"/></svg> }
function ClockFaceIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><path d="M4.93 4.93a10 10 0 0 1 14.14 0"/></svg> }
function BookIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> }
function StoriesIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> }
function PollIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
function RewindIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg> }
function HamburgerIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg> }
function TorahIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg> }
function LiveIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg> }
function ProduceIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9S3 15.97 3 11a9 9 0 0 1 9-9z"/><path d="M12 2c0 0-3 4-3 9s3 9 3 9"/><path d="M3 11h18"/></svg> }
function SettingsIcon({ size = 20 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }
