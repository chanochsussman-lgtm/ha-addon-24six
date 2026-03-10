import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore, useZoneStore } from '../store'
import { getArtwork, getSongTitle, getArtistName, formatDuration } from '../api'
import { useVolumeSync } from './useVolumeSync'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const SLEEP_PRESETS = [5, 10, 15, 20, 30, 45, 60, 90]
const QUALITIES = [{ v: 'aac', label: 'AAC' }, { v: 'mp3', label: 'MP3' }, { v: 'flac', label: 'HQ' }]

export default function Player({ onSpeakerClick }) {
  const {
    currentSong, isPlaying, progress, duration, volume,
    shuffle, repeat, entity_id, speed, quality, autoplay,
    sleepRemaining, sleepTimer,
    togglePlay, next, prev, setVolume, setProgress,
    toggleShuffle, cycleRepeat, toggleAutoplay,
    setSpeed, setQuality, setSleepTimer, clearSleepTimer,
    rewind10, forward10,
  } = usePlayerStore()

  const navigate = useNavigate()
  const progressRef = useRef(null)
  const [showSpeed, setShowSpeed] = useState(false)
  const [showSleep, setShowSleep] = useState(false)
  const [showQuality, setShowQuality] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const { zones, activeZoneId } = useZoneStore()
  const activeZone = zones.find(z => z.id === activeZoneId)
  const zoneLabel = activeZone?.id !== 'browser' ? activeZone?.label : null

  // Sync hardware volume buttons ↔ slider ↔ actual device (browser or HA)
  useVolumeSync()

  useEffect(() => {
    if (!progressRef.current || !duration) return
    progressRef.current.style.setProperty('--progress', `${(progress / duration) * 100}%`)
  }, [progress, duration])

  useEffect(() => {
    const close = () => { setShowSpeed(false); setShowSleep(false); setShowQuality(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const artwork = getArtwork(currentSong, 64)
  const title = getSongTitle(currentSong)
  const artist = getArtistName(currentSong)

  const formatSleep = (s) => {
    if (!s) return ''
    if (s >= 60) return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
    return `${s}s`
  }

  return (
    <>
    {expanded && (
      <ExpandedPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        volume={volume}
        shuffle={shuffle}
        repeat={repeat}
        speed={speed}
        quality={quality}
        autoplay={autoplay}
        sleepRemaining={sleepRemaining}
        sleepTimer={sleepTimer}
        entity_id={entity_id}
        onClose={() => setExpanded(false)}
        onSpeakerClick={() => { setExpanded(false); onSpeakerClick() }}
        togglePlay={togglePlay}
        next={next}
        prev={prev}
        setVolume={setVolume}
        setProgress={setProgress}
        toggleShuffle={toggleShuffle}
        cycleRepeat={cycleRepeat}
        toggleAutoplay={toggleAutoplay}
        setSpeed={setSpeed}
        setQuality={setQuality}
        setSleepTimer={setSleepTimer}
        clearSleepTimer={clearSleepTimer}
        rewind10={rewind10}
        forward10={forward10}
        navigate={navigate}
      />
    )}

    {/* ── Mini player bar: always full-width across the entire bottom ── */}
    <div
      className="fixed bottom-0 left-0 right-0 glass border-t z-50"
      style={{
        height: 'var(--player-height)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-3 px-4 h-full">

        {/* Song info — click to expand */}
        <div
          className="flex items-center gap-3 min-w-0 cursor-pointer flex-shrink-0"
          style={{ width: 220 }}
          onClick={() => currentSong && setExpanded(true)}
          title="Open Now Playing"
        >
          {artwork ? (
            <img src={artwork} alt={title}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ background: 'var(--card)' }}>
              <MusicIcon size={18} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
              {currentSong ? title : 'Nothing playing'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              {artist}
              {zoneLabel && <span className="ml-1" style={{ color: 'var(--accent)' }}>▸ {zoneLabel}</span>}
              {!zoneLabel && entity_id && <span className="ml-1" style={{ color: 'var(--accent)' }}>▸ {entity_id.replace('media_player.', '').replace(/_/g, ' ')}</span>}
            </p>
          </div>
        </div>

        {/* Center: controls + progress */}
        <div className="flex-1 flex flex-col items-center gap-1" style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2">
            <Btn active={shuffle} onClick={toggleShuffle} title="Shuffle"><ShuffleIcon size={15} /></Btn>
            <Btn onClick={prev} title="Previous"><PrevIcon size={18} /></Btn>
            <Btn onClick={rewind10} title="-10s"><Rewind10Icon size={18} /></Btn>
            <button onClick={togglePlay}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105 flex-shrink-0"
              style={{ background: 'var(--accent)', color: '#0d0d0f' }}>
              {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            </button>
            <Btn onClick={forward10} title="+10s"><Forward10Icon size={18} /></Btn>
            <Btn onClick={next} title="Next"><NextIcon size={18} /></Btn>
            <Btn active={repeat !== 'none'} onClick={cycleRepeat} title="Repeat">
              {repeat === 'one' ? <RepeatOneIcon size={15} /> : <RepeatIcon size={15} />}
            </Btn>
          </div>

          <div className="flex items-center gap-2 w-full">
            <span className="text-xs w-8 text-right tabular-nums" style={{ color: 'var(--muted)' }}>{formatDuration(progress)}</span>
            <input ref={progressRef} type="range" className="flex-1 progress"
              min={0} max={duration || 100} value={progress}
              onChange={e => setProgress(Number(e.target.value))} />
            <span className="text-xs w-8 tabular-nums" style={{ color: 'var(--muted)' }}>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Right: volume slider (prominent) + secondary controls */}
        <div className="flex items-center gap-1 flex-shrink-0">

          {/* Lyrics */}
          <Btn onClick={() => currentSong && navigate(`/lyrics/${currentSong.id}`)} title="Lyrics">
            <LyricsIcon size={16} />
          </Btn>

          {/* Autoplay */}
          <Btn active={autoplay} onClick={toggleAutoplay} title="Autoplay"><AutoplayIcon size={16} /></Btn>

          {/* Speed */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              className="px-2 py-1 rounded text-xs font-semibold tabular-nums transition-colors"
              style={{ color: speed !== 1 ? 'var(--accent)' : 'var(--muted)', background: showSpeed ? 'var(--card)' : 'transparent' }}
              onClick={() => { setShowSpeed(s => !s); setShowSleep(false); setShowQuality(false) }}
              title="Playback speed"
            >{speed}×</button>
            {showSpeed && (
              <div className="absolute bottom-12 right-0 rounded-xl py-2 w-28 z-20 shadow-2xl"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                {SPEEDS.map(s => (
                  <button key={s}
                    className="w-full text-left px-4 py-1.5 text-sm transition-colors"
                    style={{ color: speed === s ? 'var(--accent)' : 'var(--text)', fontWeight: speed === s ? 600 : 400 }}
                    onClick={() => { setSpeed(s); setShowSpeed(false) }}
                  >{s}×</button>
                ))}
              </div>
            )}
          </div>

          {/* Quality */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              className="px-2 py-1 rounded text-xs font-semibold transition-colors"
              style={{ color: quality !== 'aac' ? 'var(--accent)' : 'var(--muted)', background: showQuality ? 'var(--card)' : 'transparent' }}
              onClick={() => { setShowQuality(q => !q); setShowSpeed(false); setShowSleep(false) }}
              title="Stream quality"
            >{QUALITIES.find(q => q.v === quality)?.label || 'AAC'}</button>
            {showQuality && (
              <div className="absolute bottom-12 right-0 rounded-xl py-2 w-24 z-20 shadow-2xl"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                {QUALITIES.map(q => (
                  <button key={q.v}
                    className="w-full text-left px-4 py-1.5 text-sm transition-colors"
                    style={{ color: quality === q.v ? 'var(--accent)' : 'var(--text)', fontWeight: quality === q.v ? 600 : 400 }}
                    onClick={() => { setQuality(q.v); setShowQuality(false) }}
                  >{q.label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Sleep timer */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              className="p-1.5 rounded transition-colors"
              style={{ color: sleepTimer ? 'var(--accent)' : 'var(--muted)', background: showSleep ? 'var(--card)' : 'transparent' }}
              onClick={() => { setShowSleep(s => !s); setShowSpeed(false); setShowQuality(false) }}
              title="Sleep timer"
            >
              {sleepTimer
                ? <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>{formatSleep(sleepRemaining)}</span>
                : <SleepIcon size={16} />}
            </button>
            {showSleep && (
              <div className="absolute bottom-12 right-0 rounded-xl py-2 w-36 z-20 shadow-2xl"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="px-4 py-1 text-xs font-semibold" style={{ color: 'var(--muted)' }}>SLEEP TIMER</p>
                {sleepTimer && (
                  <button className="w-full text-left px-4 py-1.5 text-sm"
                    style={{ color: '#e57373' }}
                    onClick={() => { clearSleepTimer(); setShowSleep(false) }}
                  >Cancel ({formatSleep(sleepRemaining)})</button>
                )}
                {SLEEP_PRESETS.map(m => (
                  <button key={m}
                    className="w-full text-left px-4 py-1.5 text-sm"
                    style={{ color: 'var(--text)' }}
                    onClick={() => { setSleepTimer(m); setShowSleep(false) }}
                  >{m >= 60 ? `${m / 60}h` : `${m} min`}</button>
                ))}
              </div>
            )}
          </div>

          {/* Volume — icon + wide slider + device indicator */}
          <button className="p-1.5 rounded flex-shrink-0" style={{ color: 'var(--muted)' }}
            onClick={() => setVolume(volume === 0 ? 0.7 : 0)}>
            {volume === 0 ? <MuteIcon size={16} /> : <VolumeIcon size={16} />}
          </button>
          <div className="flex flex-col items-center" style={{ width: 90 }}>
            <input
              type="range"
              className="progress w-full"
              min={0} max={1} step={0.01} value={volume}
              onChange={e => setVolume(Number(e.target.value))}
            />
            {entity_id && (
              <span className="tabular-nums" style={{ fontSize: 9, color: 'var(--accent)', marginTop: 1, letterSpacing: '0.02em' }}>
                🔊 {Math.round(volume * 100)}%
              </span>
            )}
          </div>

          {/* Speaker */}
          <button className="p-1.5 rounded transition-colors"
            style={{ color: entity_id ? 'var(--accent)' : 'var(--muted)' }}
            onClick={onSpeakerClick} title="Select speaker">
            <SpeakerIcon size={16} />
          </button>

          {/* Queue */}
          <button className="p-1.5 rounded transition-colors" style={{ color: 'var(--muted)' }}
            onClick={() => navigate('/queue')} title="Queue">
            <QueueIcon size={16} />
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

// ── Expanded full-screen Now Playing ─────────────────────────────────────────
function ExpandedPlayer({
  currentSong, isPlaying, progress, duration, volume,
  shuffle, repeat, speed, quality, autoplay,
  sleepRemaining, sleepTimer, entity_id,
  onClose, onSpeakerClick,
  togglePlay, next, prev, setVolume, setProgress,
  toggleShuffle, cycleRepeat, toggleAutoplay,
  setSpeed, setQuality, setSleepTimer, clearSleepTimer,
  rewind10, forward10, navigate,
}) {
  const artwork = getArtwork(currentSong, 600)
  const title = getSongTitle(currentSong)
  const artist = getArtistName(currentSong)
  const progressRef = useRef(null)
  const [showSpeed, setShowSpeed] = useState(false)
  const [showSleep, setShowSleep] = useState(false)

  useEffect(() => {
    if (!progressRef.current || !duration) return
    progressRef.current.style.setProperty('--progress', `${(progress / duration) * 100}%`)
  }, [progress, duration])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const formatSleep = (s) => {
    if (!s) return ''
    if (s >= 60) return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
    return `${s}s`
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 60, background: 'var(--bg)' }}>
      {artwork && (
        <div className="absolute inset-0" style={{
          backgroundImage: `url(${artwork})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(40px) brightness(0.25)',
          transform: 'scale(1.1)',
        }} />
      )}

      <div className="relative z-10 flex flex-col h-full max-w-lg mx-auto w-full px-6 pt-4 pb-8">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onClose} className="p-2 rounded-full"
            style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)' }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Now Playing</p>
          <button onClick={() => { navigate('/queue'); onClose() }} className="p-2 rounded-full"
            style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)' }}>
            <QueueIcon size={18} />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center mb-8" style={{ minHeight: 0 }}>
          <div className="rounded-2xl overflow-hidden shadow-2xl" style={{
            width: '100%', maxWidth: 340, aspectRatio: '1',
            background: 'var(--card)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}>
            {artwork
              ? <img src={artwork} alt={title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><MusicIcon size={64} /></div>
            }
          </div>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0 mr-4">
            <p className="font-display text-2xl font-semibold leading-tight mb-1" style={{ color: '#fff' }}>{title}</p>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {artist}
              {entity_id && (
                <span className="ml-2 text-sm" style={{ color: 'var(--accent)' }}>
                  ▸ {entity_id.replace('media_player.', '').replace(/_/g, ' ')}
                </span>
              )}
            </p>
          </div>
          <button onClick={() => navigate(`/album/${currentSong?.albumId}`)}
            className="p-2 rounded-full flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)' }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <input ref={progressRef} type="range" className="w-full progress"
            min={0} max={duration || 100} value={progress}
            onChange={e => setProgress(Number(e.target.value))} style={{ height: 4 }} />
          <div className="flex justify-between mt-1">
            <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatDuration(progress)}</span>
            <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatDuration(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <button className="p-2" style={{ color: shuffle ? 'var(--accent)' : 'rgba(255,255,255,0.5)' }} onClick={toggleShuffle}><ShuffleIcon size={20} /></button>
          <button className="p-2" style={{ color: 'rgba(255,255,255,0.8)' }} onClick={prev}><PrevIcon size={28} /></button>
          <button onClick={togglePlay}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105"
            style={{ background: '#fff', color: '#0d0d0f', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            {isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
          </button>
          <button className="p-2" style={{ color: 'rgba(255,255,255,0.8)' }} onClick={next}><NextIcon size={28} /></button>
          <button className="p-2" style={{ color: repeat !== 'none' ? 'var(--accent)' : 'rgba(255,255,255,0.5)' }} onClick={cycleRepeat}>
            {repeat === 'one' ? <RepeatOneIcon size={20} /> : <RepeatIcon size={20} />}
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button className="p-2" style={{ color: 'rgba(255,255,255,0.5)' }} onClick={rewind10}><Rewind10Icon size={20} /></button>
          <button className="p-2" style={{ color: 'rgba(255,255,255,0.5)' }}
            onClick={() => { navigate(`/lyrics/${currentSong?.id}`); onClose() }}><LyricsIcon size={20} /></button>

          <div className="relative" onClick={e => e.stopPropagation()}>
            <button className="px-3 py-1.5 rounded-lg text-sm font-semibold"
              style={{ color: speed !== 1 ? 'var(--accent)' : 'rgba(255,255,255,0.5)', background: showSpeed ? 'rgba(255,255,255,0.1)' : 'transparent' }}
              onClick={() => setShowSpeed(s => !s)}>{speed}×</button>
            {showSpeed && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-xl py-2 w-28 z-20 shadow-2xl"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                {SPEEDS.map(s => (
                  <button key={s} className="w-full text-left px-4 py-1.5 text-sm"
                    style={{ color: speed === s ? 'var(--accent)' : 'var(--text)', fontWeight: speed === s ? 600 : 400 }}
                    onClick={() => { setSpeed(s); setShowSpeed(false) }}>{s}×</button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" onClick={e => e.stopPropagation()}>
            <button className="p-2 rounded" style={{ color: sleepTimer ? 'var(--accent)' : 'rgba(255,255,255,0.5)' }}
              onClick={() => setShowSleep(s => !s)}>
              {sleepTimer ? <span className="text-xs font-semibold tabular-nums">{formatSleep(sleepRemaining)}</span> : <SleepIcon size={20} />}
            </button>
            {showSleep && (
              <div className="absolute bottom-10 right-0 rounded-xl py-2 w-36 z-20 shadow-2xl"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="px-4 py-1 text-xs font-semibold" style={{ color: 'var(--muted)' }}>SLEEP TIMER</p>
                {sleepTimer && (
                  <button className="w-full text-left px-4 py-1.5 text-sm" style={{ color: '#e57373' }}
                    onClick={() => { clearSleepTimer(); setShowSleep(false) }}>Cancel ({formatSleep(sleepRemaining)})</button>
                )}
                {SLEEP_PRESETS.map(m => (
                  <button key={m} className="w-full text-left px-4 py-1.5 text-sm" style={{ color: 'var(--text)' }}
                    onClick={() => { setSleepTimer(m); setShowSleep(false) }}>{m >= 60 ? `${m / 60}h` : `${m} min`}</button>
                ))}
              </div>
            )}
          </div>

          <button className="p-2" style={{ color: entity_id ? 'var(--accent)' : 'rgba(255,255,255,0.5)' }}
            onClick={onSpeakerClick}><SpeakerIcon size={20} /></button>
          <button className="p-2" style={{ color: 'rgba(255,255,255,0.5)' }} onClick={forward10}><Forward10Icon size={20} /></button>
        </div>

        {/* Volume — full width slider */}
        <div className="flex items-center gap-3">
          <button style={{ color: 'rgba(255,255,255,0.4)' }} onClick={() => setVolume(0)}><MuteIcon size={16} /></button>
          <input type="range" className="flex-1 progress" min={0} max={1} step={0.01} value={volume}
            onChange={e => setVolume(Number(e.target.value))} />
          <button style={{ color: 'rgba(255,255,255,0.4)' }} onClick={() => setVolume(1)}><VolumeIcon size={16} /></button>
        </div>
        {entity_id && (
          <p className="text-center mt-1" style={{ fontSize: 11, color: 'var(--accent)' }}>
            🔊 {entity_id.replace('media_player.', '').replace(/_/g, ' ')} · {Math.round(volume * 100)}%
          </p>
        )}
      </div>
    </div>
  )
}

function Btn({ children, active, onClick, title, style }) {
  return (
    <button onClick={onClick} title={title}
      className="p-1.5 rounded transition-colors"
      style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)', ...style }}>
      {children}
    </button>
  )
}

function PlayIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg> }
function PauseIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg> }
function PrevIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg> }
function NextIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg> }
function ShuffleIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg> }
function RepeatIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg> }
function RepeatOneIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /><line x1="12" y1="8" x2="12" y2="16" /></svg> }
function VolumeIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg> }
function MuteIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg> }
function SpeakerIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><circle cx="12" cy="14" r="4" /><line x1="12" y1="6" x2="12" y2="6.01" /></svg> }
function QueueIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> }
function MusicIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg> }
function LyricsIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> }
function SleepIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg> }
function AutoplayIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /><line x1="19" y1="3" x2="19" y2="21" /></svg> }
function Rewind10Icon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" /><text x="9" y="14" fontSize="6" fill="currentColor" stroke="none" fontWeight="bold">10</text></svg> }
function Forward10Icon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-.49-3.5" /><text x="8" y="14" fontSize="6" fill="currentColor" stroke="none" fontWeight="bold">10</text></svg> }

