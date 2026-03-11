import { usePlayer } from '../store/index.jsx'

function fmt(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export default function Player() {
  const { currentTrack, playing, progress, duration, loading, togglePlay, seek, playNext, playPrev } = usePlayer()

  if (!currentTrack) return (
    <div className="player-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--muted)', fontSize: 13 }}>No track playing</span>
    </div>
  )

  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <div className="player-bar" style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
      {/* Art */}
      <img
        src={currentTrack.img}
        alt=""
        style={{ width: 52, height: 52, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
      />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentTrack.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentTrack.subtitle}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={playPrev} style={btnStyle}>⏮</button>
          <button onClick={togglePlay} style={{ ...btnStyle, fontSize: 22, width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', color: '#000' }}>
            {loading ? '⏳' : playing ? '⏸' : '▶'}
          </button>
          <button onClick={playNext} style={btnStyle}>⏭</button>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 360 }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', width: 30, textAlign: 'right' }}>{fmt(progress)}</span>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pct = (e.clientX - rect.left) / rect.width
              seek(pct * duration)
            }}
            style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}
          >
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 10, color: 'var(--muted)', width: 30 }}>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  )
}

const btnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text)',
  fontSize: 18,
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}
