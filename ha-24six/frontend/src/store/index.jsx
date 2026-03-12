import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const Ctx = createContext(null)
const audio = new Audio()

export function PlayerProvider({ children }) {
  const [track,             setTrack]             = useState(null)
  const [queue,             setQueue]             = useState([])
  const [qIdx,              setQIdx]              = useState(0)
  const [playing,           setPlaying]           = useState(false)
  const [progress,          setProgress]          = useState(0)
  const [duration,          setDuration]          = useState(0)
  const [loading,           setLoading]           = useState(false)
  const [volume,            setVolume]            = useState(1.0)
  const [activeSpeaker,     setActiveSpeaker]     = useState('local')
  const [activeSpeakerName, setActiveSpeakerName] = useState('This Device')

  const queueRef          = useRef([])
  const qIdxRef           = useRef(0)
  const _playRef          = useRef(null)
  const volumeRef         = useRef(1.0)
  const activeSpeakerRef  = useRef('local')
  const trackRef          = useRef(null)
  const progressRef       = useRef(0)
  const durationRef       = useRef(0)
  const volDebounce       = useRef(null)
  const haStatePoller     = useRef(null)   // WS connection to HA bridge (real-time state)
  const volInputRef       = useRef(null)

  useEffect(() => { queueRef.current        = queue    }, [queue])
  useEffect(() => { qIdxRef.current         = qIdx     }, [qIdx])
  useEffect(() => { volumeRef.current       = volume   }, [volume])
  useEffect(() => { activeSpeakerRef.current= activeSpeaker }, [activeSpeaker])
  useEffect(() => { trackRef.current        = track    }, [track])
  useEffect(() => { progressRef.current     = progress }, [progress])
  useEffect(() => { durationRef.current     = duration }, [duration])

  // ── Audio events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onTime  = () => { setProgress(audio.currentTime); progressRef.current = audio.currentTime }
    const onDur   = () => { const d = isNaN(audio.duration)?0:audio.duration; setDuration(d); durationRef.current=d }
    const onPlay  = () => { setPlaying(true);  setLoading(false);  _updatePositionState() }
    const onPause = () => { setPlaying(false); _updatePositionState() }
    const onWait  = () => setLoading(true)
    const onCan   = () => setLoading(false)
    const onEnd   = () => {
      const q=queueRef.current, i=qIdxRef.current
      if (i < q.length-1) _playRef.current?.(q[i+1], q, i+1)
    }
    audio.addEventListener('timeupdate',    onTime)
    audio.addEventListener('durationchange',onDur)
    audio.addEventListener('play',          onPlay)
    audio.addEventListener('pause',         onPause)
    audio.addEventListener('waiting',       onWait)
    audio.addEventListener('canplay',       onCan)
    audio.addEventListener('ended',         onEnd)
    return () => {
      audio.removeEventListener('timeupdate',    onTime)
      audio.removeEventListener('durationchange',onDur)
      audio.removeEventListener('play',          onPlay)
      audio.removeEventListener('pause',         onPause)
      audio.removeEventListener('waiting',       onWait)
      audio.removeEventListener('canplay',       onCan)
      audio.removeEventListener('ended',         onEnd)
    }
  }, [])

  // ── MediaSession position state (enables lock screen scrubber) ───────────
  const _updatePositionState = useCallback(() => {
    if (!('mediaSession' in navigator)) return
    try {
      if (durationRef.current > 0) {
        navigator.mediaSession.setPositionState({
          duration:     durationRef.current,
          playbackRate: audio.playbackRate || 1,
          position:     Math.min(progressRef.current, durationRef.current),
        })
      }
    } catch {}
  }, [])

  // ── MediaSession metadata push ───────────────────────────────────────────
  const _pushMetadata = useCallback((t) => {
    if (!('mediaSession' in navigator) || !t) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   t.title  || '',
      artist:  t.artist || '',
      album:   t.album  || '',
      artwork: t.img
        ? [
            { src: t.img, sizes:'96x96',   type:'image/jpeg' },
            { src: t.img, sizes:'128x128', type:'image/jpeg' },
            { src: t.img, sizes:'256x256', type:'image/jpeg' },
            { src: t.img, sizes:'512x512', type:'image/jpeg' },
          ]
        : [],
    })
    navigator.mediaSession.playbackState = 'playing'
  }, [])

  // ── Push metadata + artwork to HA cast speaker (WiiM / etc.) ─────────────
  const _pushCastMetadata = useCallback(async (t, entity_id) => {
    if (!entity_id || entity_id === 'local' || !t) return
    const base = window.ingressPath || ''
    // HA media_player.play_media carries extra metadata fields that most cast integrations forward
    try {
      await fetch(`${base}/api/ha/cast-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id,
          title:    t.title  || '',
          artist:   t.artist || '',
          album:    t.album  || '',
          img:      t.img    || '',
        })
      })
    } catch {}
  }, [])

  // ── Poll HA speaker state so remote controls (WiiM app, etc.) reflect ────
  // When user presses play/pause/skip on the WiiM app or remote, HA state changes.
  // We poll and sync back to our local audio accordingly.
  // ── Real-time HA WebSocket listener ────────────────────────────────────────
  // Connects once to our /ws/player bridge; the server fans out HA state_changed
  // events instantly — no polling, zero lag.
  const _startHAPoller = useCallback((entity_id) => {
    _stopHAPoller()   // close any existing connection
    if (!entity_id || entity_id === 'local') return

    const base    = window.ingressPath || ''
    const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsBase  = base.replace(/^https?:/, wsProto + ':')
    const wsHost  = window.location.host
    const url     = `${wsProto}://${wsHost}${base}/ws/player`

    console.log('[ws] Connecting to', url)
    const ws = new window.WebSocket(url)
    haStatePoller.current = ws

    ws.onopen  = () => console.log('[ws] Connected to HA bridge')
    ws.onclose = () => {
      console.log('[ws] Disconnected — reconnecting in 3s')
      // Auto-reconnect only if this is still the active speaker
      setTimeout(() => {
        if (activeSpeakerRef.current === entity_id) _startHAPoller(entity_id)
      }, 3000)
    }
    ws.onerror = () => {}

    ws.onmessage = (evt) => {
      let msg
      try { msg = JSON.parse(evt.data) } catch { return }
      if (msg.type !== 'speaker_state' || msg.entity_id !== entity_id) return

      const { state, position, volume: vol } = msg

      // Sync play/pause instantly
      if (state === 'playing') {
        setPlaying(true)
        navigator.mediaSession && (navigator.mediaSession.playbackState = 'playing')
      } else if (state === 'paused' || state === 'idle') {
        setPlaying(false)
        navigator.mediaSession && (navigator.mediaSession.playbackState = 'paused')
      }

      // Sync scrubber if position diverged (user seeked in WiiM/Sonos app)
      if (position != null && Math.abs(position - progressRef.current) > 3) {
        setProgress(position)
        progressRef.current = position
        _updatePositionState()
      }

      // Sync volume slider if changed on speaker side
      if (vol != null && Math.abs(vol - volumeRef.current) > 0.02) {
        setVolume(vol)
        volumeRef.current = vol
      }
    }
  }, [_updatePositionState])

  const _stopHAPoller = useCallback(() => {
    if (haStatePoller.current) {
      haStatePoller.current.onclose = null   // prevent auto-reconnect
      haStatePoller.current.close()
      haStatePoller.current = null
    }
  }, [])

  // ── Volume ───────────────────────────────────────────────────────────────
  const applyVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v))
    setVolume(clamped); volumeRef.current = clamped
    if (activeSpeakerRef.current === 'local') {
      audio.volume = clamped
    } else {
      clearTimeout(volDebounce.current)
      volDebounce.current = setTimeout(() => {
        const base = window.ingressPath || ''
        fetch(`${base}/api/ha/volume`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ entity_id: activeSpeakerRef.current, volume: clamped })
        }).catch(()=>{})
      }, 80)
    }
  }, [])

  // Hardware volume keys (keyboard event)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key==='AudioVolumeUp'   || e.code==='AudioVolumeUp')   { e.preventDefault(); applyVolume(volumeRef.current + 0.05) }
      if (e.key==='AudioVolumeDown' || e.code==='AudioVolumeDown') { e.preventDefault(); applyVolume(volumeRef.current - 0.05) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [applyVolume])

  useEffect(() => {
    if (volInputRef.current) volInputRef.current.value = String(Math.round(volume * 100))
  }, [volume])

  // ── Core play ─────────────────────────────────────────────────────────────
  const _play = useCallback(async (t, q, i) => {
    setTrack(t); setQueue(q); setQIdx(i)
    queueRef.current = q; qIdxRef.current = i
    setLoading(true); setProgress(0); setDuration(0)
    setActiveSpeaker('local'); activeSpeakerRef.current = 'local'
    setActiveSpeakerName('This Device')
    _stopHAPoller()

    _pushMetadata(t)

    try {
      const base = window.ingressPath || ''
      const res  = await fetch(`${base}/api/audio/${t.id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const url  = typeof data === 'string' ? data : data?.url
      if (!url) throw new Error('No URL: ' + JSON.stringify(data))

      console.log('[player] src:', url.slice(0, 80))
      audio.volume = volumeRef.current
      audio.src = url
      audio.load()
      await audio.play()
    } catch (e) {
      console.error('[player] error:', e.message)
      setLoading(false)
    }
  }, [_pushMetadata, _stopHAPoller])

  useEffect(() => { _playRef.current = _play }, [_play])

  // ── Push state to server so Lovelace card stays in sync ─────────────────
  const _pushPlayerState = useCallback((overrides = {}) => {
    const t = trackRef.current
    if (!t) return
    const base = window.ingressPath || ''
    fetch(base + '/api/player/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:    t.title    || '',
        artist:   t.artist   || '',
        img:      t.img      || '',
        playing:  overrides.playing  ?? !audio.paused,
        progress: overrides.progress ?? audio.currentTime,
        duration: overrides.duration ?? (isNaN(audio.duration) ? 0 : audio.duration),
      })
    }).catch(() => {})
  }, [])

  // Push state on play/pause/track change
  useEffect(() => {
    const onPlay  = () => _pushPlayerState({ playing: true })
    const onPause = () => _pushPlayerState({ playing: false })
    const onDur   = () => _pushPlayerState()
    audio.addEventListener('play',          onPlay)
    audio.addEventListener('pause',         onPause)
    audio.addEventListener('durationchange',onDur)
    return () => {
      audio.removeEventListener('play',          onPlay)
      audio.removeEventListener('pause',         onPause)
      audio.removeEventListener('durationchange',onDur)
    }
  }, [_pushPlayerState])

  // Push progress every 5s so card scrubber stays vaguely accurate
  useEffect(() => {
    const t = setInterval(() => { if (!audio.paused) _pushPlayerState() }, 5000)
    return () => clearInterval(t)
  }, [_pushPlayerState])

  // ── Listen for card control commands over WS ─────────────────────────────
  useEffect(() => {
    const base     = window.ingressPath || ''
    const wsProto  = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url      = `${wsProto}://${window.location.host}${base}/ws/player`
    let ws, retryTimer

    const connect = () => {
      ws = new window.WebSocket(url)
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data)
          if (msg.type !== 'player_control') return
          if (msg.action === 'play')  audio.play().catch(() => {})
          if (msg.action === 'pause') audio.pause()
          if (msg.action === 'next')  { const q=queueRef.current,i=qIdxRef.current; if(i<q.length-1) _playRef.current?.(q[i+1],q,i+1) }
          if (msg.action === 'prev')  { const q=queueRef.current,i=qIdxRef.current; if(i>0) _playRef.current?.(q[i-1],q,i-1) }
        } catch {}
      }
      ws.onclose  = () => { retryTimer = setTimeout(connect, 3000) }
      ws.onerror  = () => {}
    }
    connect()
    return () => { ws?.close(); clearTimeout(retryTimer) }
  }, [])


  // ── MediaSession action handlers ─────────────────────────────────────────
  // Registered once, but all actions check activeSpeaker and route accordingly
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const doPlay = () => {
      if (activeSpeakerRef.current === 'local') {
        audio.play()
      } else {
        // Tell HA speaker to play
        const base = window.ingressPath || ''
        fetch(`${base}/api/ha/control`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ entity_id: activeSpeakerRef.current, action:'play' })
        }).catch(()=>{})
        setPlaying(true)
        navigator.mediaSession.playbackState = 'playing'
      }
    }
    const doPause = () => {
      if (activeSpeakerRef.current === 'local') {
        audio.pause()
      } else {
        const base = window.ingressPath || ''
        fetch(`${base}/api/ha/control`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ entity_id: activeSpeakerRef.current, action:'pause' })
        }).catch(()=>{})
        setPlaying(false)
        navigator.mediaSession.playbackState = 'paused'
      }
    }
    const doNext = () => {
      const q=queueRef.current, i=qIdxRef.current
      if (i < q.length-1) _playRef.current?.(q[i+1], q, i+1)
    }
    const doPrev = () => {
      if (audio.currentTime > 3 && activeSpeakerRef.current === 'local') { audio.currentTime = 0; return }
      const q=queueRef.current, i=qIdxRef.current
      if (i > 0) _playRef.current?.(q[i-1], q, i-1)
    }
    const doSeek = ({ seekTime }) => {
      if (activeSpeakerRef.current === 'local') {
        audio.currentTime = seekTime
      } else {
        const base = window.ingressPath || ''
        fetch(`${base}/api/ha/control`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ entity_id: activeSpeakerRef.current, action:'seek', position: seekTime })
        }).catch(()=>{})
        setProgress(seekTime)
        _updatePositionState()
      }
    }

    navigator.mediaSession.setActionHandler('play',         doPlay)
    navigator.mediaSession.setActionHandler('pause',        doPause)
    navigator.mediaSession.setActionHandler('stop',         doPause)
    navigator.mediaSession.setActionHandler('nexttrack',    doNext)
    navigator.mediaSession.setActionHandler('previoustrack',doPrev)
    navigator.mediaSession.setActionHandler('seekto',       doSeek)
    navigator.mediaSession.setActionHandler('seekforward',  () => doSeek({ seekTime: Math.min(progressRef.current+15, durationRef.current) }))
    navigator.mediaSession.setActionHandler('seekbackward', () => doSeek({ seekTime: Math.max(progressRef.current-15, 0) }))
  }, [_updatePositionState])

  // Keep position state fresh every 5s
  useEffect(() => {
    const t = setInterval(_updatePositionState, 5000)
    return () => clearInterval(t)
  }, [_updatePositionState])

  // ── Public actions ───────────────────────────────────────────────────────
  const playTrack  = useCallback((t,q=[],i=0) => _play(t, q.length?q:[t], i), [_play])
  const togglePlay = useCallback(() => {
    if (activeSpeakerRef.current === 'local') {
      audio.paused ? audio.play() : audio.pause()
    } else {
      const base = window.ingressPath || ''
      const action = playing ? 'pause' : 'play'
      fetch(`${base}/api/ha/control`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ entity_id: activeSpeakerRef.current, action })
      }).catch(()=>{})
      setPlaying(p => !p)
      navigator.mediaSession && (navigator.mediaSession.playbackState = playing ? 'paused' : 'playing')
    }
  }, [playing])

  const seek = useCallback((s) => {
    if (activeSpeakerRef.current === 'local') {
      audio.currentTime = s
    } else {
      const base = window.ingressPath || ''
      fetch(`${base}/api/ha/control`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ entity_id: activeSpeakerRef.current, action:'seek', position: s })
      }).catch(()=>{})
      setProgress(s); progressRef.current = s
      _updatePositionState()
    }
  }, [_updatePositionState])

  const playNext = useCallback((songToInsert) => {
    if (songToInsert) {
      setQueue(q => { const n=[...q]; n.splice(qIdxRef.current+1,0,songToInsert); queueRef.current=n; return n })
    } else {
      const q=queueRef.current, i=qIdxRef.current
      if (i < q.length-1) _play(q[i+1], q, i+1)
    }
  }, [_play])

  const playPrev = useCallback(() => {
    if (audio.currentTime > 3 && activeSpeakerRef.current==='local') { seek(0); return }
    const q=queueRef.current, i=qIdxRef.current
    if (i > 0) _play(q[i-1], q, i-1)
  }, [_play, seek])

  const addToQueue = useCallback((song) => {
    setQueue(q => { const n=[...q,song]; queueRef.current=n; return n })
  }, [])

  // Called by CastModal after successful cast
  const setCastTarget = useCallback(async (entity_id, name, trackOverride) => {
    const t = trackOverride || trackRef.current
    setActiveSpeaker(entity_id || 'local')
    activeSpeakerRef.current = entity_id || 'local'
    setActiveSpeakerName(name || 'This Device')
    if (entity_id && entity_id !== 'local') {
      // Push metadata so WiiM app shows artwork + title
      await _pushCastMetadata(t, entity_id)
      // Sync volume
      applyVolume(volumeRef.current)
      // Start polling HA so remote controls come back to us
      _startHAPoller(entity_id)
    } else {
      _stopHAPoller()
    }
  }, [_pushCastMetadata, applyVolume, _startHAPoller, _stopHAPoller])

  // Hidden input for hw volume key capture on Android
  const HiddenVolumeInput = (
    <input ref={volInputRef} type="range" min="0" max="100" step="5" defaultValue="100"
      onChange={e => applyVolume(parseInt(e.target.value)/100)}
      style={{ position:'fixed', opacity:0, pointerEvents:'none', width:1, height:1, top:0, left:0, zIndex:-1 }}
      tabIndex={-1} aria-hidden="true" />
  )

  return (
    <Ctx.Provider value={{
      track, queue, qIdx, playing, progress, duration, loading,
      volume, activeSpeaker, activeSpeakerName,
      playTrack, togglePlay, seek, playNext, playPrev, addToQueue,
      applyVolume, setCastTarget,
    }}>
      {HiddenVolumeInput}
      {children}
    </Ctx.Provider>
  )
}

export const usePlayer = () => useContext(Ctx)
