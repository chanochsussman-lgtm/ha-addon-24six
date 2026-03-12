import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const Ctx = createContext(null)

// ── Singleton audio element ──────────────────────────────────────────────────
// NO Web Audio API GainNode — it silences audio on many browsers/devices.
// Volume is controlled directly via audio.volume. Mute via a separate flag.
const audio = new Audio()
audio.preload = 'auto'

export function PlayerProvider({ children }) {
  const [track,             setTrack]             = useState(null)
  const [queue,             setQueue]             = useState([])
  const [qIdx,              setQIdx]              = useState(0)
  const [playing,           setPlaying]           = useState(false)
  const [progress,          setProgress]          = useState(0)
  const [duration,          setDuration]          = useState(0)
  const [loading,           setLoading]           = useState(false)
  const [volume,            setVolume]            = useState(1.0)
  const [muted,             setMuted]             = useState(false)
  const [activeSpeaker,     setActiveSpeaker]     = useState('local')
  const [activeSpeakerName, setActiveSpeakerName] = useState('This Device')

  const queueRef          = useRef([])
  const qIdxRef           = useRef(0)
  const _playRef          = useRef(null)
  const volumeRef         = useRef(1.0)
  const mutedRef          = useRef(false)
  const playingRef        = useRef(false)          // ← was missing, caused silent audio
  const activeSpeakerRef  = useRef('local')
  const trackRef          = useRef(null)
  const progressRef       = useRef(0)
  const durationRef       = useRef(0)
  const volDebounce       = useRef(null)
  const haWs              = useRef(null)
  const volInputRef       = useRef(null)

  useEffect(() => { queueRef.current         = queue   }, [queue])
  useEffect(() => { qIdxRef.current          = qIdx    }, [qIdx])
  useEffect(() => { volumeRef.current        = volume  }, [volume])
  useEffect(() => { mutedRef.current         = muted   }, [muted])
  useEffect(() => { playingRef.current       = playing }, [playing])   // ← keep in sync
  useEffect(() => { activeSpeakerRef.current = activeSpeaker }, [activeSpeaker])
  useEffect(() => { trackRef.current         = track   }, [track])
  useEffect(() => { progressRef.current      = progress }, [progress])
  useEffect(() => { durationRef.current      = duration }, [duration])

  // ── Audio events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onTime  = () => { setProgress(audio.currentTime); progressRef.current = audio.currentTime }
    const onDur   = () => { const d = isNaN(audio.duration)?0:audio.duration; setDuration(d); durationRef.current=d }
    const onPlay  = () => { setPlaying(true);  playingRef.current=true;  setLoading(false);  _updatePositionState() }
    const onPause = () => { setPlaying(false); playingRef.current=false; _updatePositionState() }
    const onWait  = () => setLoading(true)
    const onCan   = () => setLoading(false)
    const onEnd   = () => {
      const q=queueRef.current, i=qIdxRef.current
      if (i < q.length-1) _playRef.current?.(q[i+1], q, i+1)
    }
    audio.addEventListener('timeupdate',     onTime)
    audio.addEventListener('durationchange', onDur)
    audio.addEventListener('play',           onPlay)
    audio.addEventListener('pause',          onPause)
    audio.addEventListener('waiting',        onWait)
    audio.addEventListener('canplay',        onCan)
    audio.addEventListener('ended',          onEnd)
    return () => {
      audio.removeEventListener('timeupdate',     onTime)
      audio.removeEventListener('durationchange', onDur)
      audio.removeEventListener('play',           onPlay)
      audio.removeEventListener('pause',          onPause)
      audio.removeEventListener('waiting',        onWait)
      audio.removeEventListener('canplay',        onCan)
      audio.removeEventListener('ended',          onEnd)
    }
  }, [])

  // ── Keep audio alive when tab is hidden / screen locked ─────────────────
  useEffect(() => {
    const resume = async () => {
      if (playingRef.current && audio.paused && audio.src) {
        try { await audio.play() } catch {}
      }
    }
    const onVisible  = () => { if (document.visibilityState === 'visible') resume() }
    const onResume   = () => resume()
    document.addEventListener('visibilitychange', onVisible)
    document.addEventListener('resume',           onResume)
    // Don't auto-resume on every pause — only on visibility / resume events
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      document.removeEventListener('resume',           onResume)
    }
  }, [])

  // ── MediaSession position state ──────────────────────────────────────────
  const _updatePositionState = useCallback(() => {
    if (!('mediaSession' in navigator)) return
    try {
      if (durationRef.current > 0) {
        navigator.mediaSession.setPositionState({
          duration:     durationRef.current,
          playbackRate: 1,
          position:     Math.min(progressRef.current, durationRef.current),
        })
      }
    } catch {}
  }, [])

  // ── MediaSession metadata ────────────────────────────────────────────────
  const _pushMetadata = useCallback((t) => {
    if (!('mediaSession' in navigator) || !t) return
    const imgUrl = t.img ? `${window.ingressPath||''}/api/img?url=${encodeURIComponent(t.img)}` : null
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   t.title  || '',
      artist:  t.artist || '',
      album:   t.album  || '',
      artwork: imgUrl ? [
        { src:imgUrl, sizes:'96x96',   type:'image/jpeg' },
        { src:imgUrl, sizes:'256x256', type:'image/jpeg' },
        { src:imgUrl, sizes:'512x512', type:'image/jpeg' },
      ] : [],
    })
    navigator.mediaSession.playbackState = 'playing'
  }, [])

  // ── Push cast metadata to HA speaker ────────────────────────────────────
  const _pushCastMetadata = useCallback(async (t, entity_id) => {
    if (!entity_id || entity_id === 'local' || !t) return
    const base = window.ingressPath || ''
    try {
      await fetch(`${base}/api/ha/cast-metadata`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ entity_id, title:t.title||'', artist:t.artist||'', album:t.album||'', img:t.img||'' })
      })
    } catch {}
  }, [])

  // ── HA WebSocket (real-time speaker state) ───────────────────────────────
  const _startHAPoller = useCallback((entity_id) => {
    if (haWs.current) { haWs.current.onclose=null; haWs.current.close(); haWs.current=null }
    if (!entity_id || entity_id === 'local') return
    const base    = window.ingressPath || ''
    const proto   = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url     = `${proto}://${window.location.host}${base}/ws/player`
    const connect = () => {
      const ws = new WebSocket(url)
      haWs.current = ws
      ws.onclose = () => { if (activeSpeakerRef.current === entity_id) setTimeout(connect, 3000) }
      ws.onerror = () => {}
      ws.onmessage = (evt) => {
        let msg; try { msg = JSON.parse(evt.data) } catch { return }
        if (msg.type !== 'speaker_state' || msg.entity_id !== entity_id) return
        const { state, position, volume: vol } = msg
        if (state === 'playing') { setPlaying(true); playingRef.current=true }
        else if (state === 'paused' || state === 'idle') { setPlaying(false); playingRef.current=false }
        if (position != null && Math.abs(position - progressRef.current) > 3) {
          setProgress(position); progressRef.current = position; _updatePositionState()
        }
        if (vol != null && Math.abs(vol - volumeRef.current) > 0.02) {
          setVolume(vol); volumeRef.current = vol; audio.volume = mutedRef.current ? 0 : vol
        }
      }
    }
    connect()
  }, [_updatePositionState])

  const _stopHAPoller = useCallback(() => {
    if (haWs.current) { haWs.current.onclose=null; haWs.current.close(); haWs.current=null }
  }, [])

  // ── Volume ───────────────────────────────────────────────────────────────
  const applyVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v))
    setVolume(clamped)
    volumeRef.current = clamped
    if (activeSpeakerRef.current === 'local') {
      audio.volume = mutedRef.current ? 0 : clamped
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

  // Mute toggle — does NOT change volume slider position
  const toggleMute = useCallback(() => {
    const newMuted = !mutedRef.current
    setMuted(newMuted)
    mutedRef.current = newMuted
    if (activeSpeakerRef.current === 'local') {
      audio.volume = newMuted ? 0 : volumeRef.current
    }
  }, [])

  // Sync OS volume changes back to slider
  useEffect(() => {
    const onVC = () => {
      if (activeSpeakerRef.current !== 'local' || mutedRef.current) return
      const v = audio.volume
      if (Math.abs(v - volumeRef.current) > 0.01) {
        setVolume(v); volumeRef.current = v
      }
    }
    audio.addEventListener('volumechange', onVC)
    return () => audio.removeEventListener('volumechange', onVC)
  }, [])

  // Hardware volume keys
  useEffect(() => {
    const onKey = (e) => {
      if (e.key==='AudioVolumeUp'||e.code==='AudioVolumeUp')     { e.preventDefault(); applyVolume(volumeRef.current+0.05) }
      if (e.key==='AudioVolumeDown'||e.code==='AudioVolumeDown') { e.preventDefault(); applyVolume(volumeRef.current-0.05) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [applyVolume])

  useEffect(() => { if (volInputRef.current) volInputRef.current.value = String(Math.round(volume*100)) }, [volume])

  // ── Core play ─────────────────────────────────────────────────────────────
  const _play = useCallback(async (t, q, i) => {
    setTrack(t); setQueue(q); setQIdx(i)
    queueRef.current=q; qIdxRef.current=i
    trackRef.current=t
    setLoading(true); setProgress(0); setDuration(0)

    // Stay on current speaker — don't reset to local
    _pushMetadata(t)

    // Record to recent plays (fire-and-forget)
    const base = window.ingressPath || ''
    fetch(`${base}/api/browse/record-play`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id:t.id, title:t.title, artist:t.artist, img:t.img })
    }).catch(()=>{})

    if (activeSpeakerRef.current !== 'local') {
      // Cast to HA speaker
      try {
        const r = await fetch(`${base}/api/ha/play`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ entity_id:activeSpeakerRef.current, track_id:t.id, track_title:t.title })
        })
        const d = await r.json()
        if (d.ok) {
          setPlaying(true); playingRef.current=true; setLoading(false)
          await _pushCastMetadata(t, activeSpeakerRef.current)
        }
      } catch (e) { console.error('[cast] error:', e.message); setLoading(false) }
      return
    }

    try {
      const res  = await fetch(`${base}/api/audio/${t.id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const url  = typeof data === 'string' ? data : data?.url
      if (!url) throw new Error('No URL: ' + JSON.stringify(data))
      console.log('[play]', t.title, url.slice(0,60))
      audio.volume = mutedRef.current ? 0 : volumeRef.current
      audio.src    = url
      audio.load()
      await audio.play()
    } catch (e) {
      console.error('[play] error:', e.message)
      setLoading(false)
    }
  }, [_pushMetadata, _pushCastMetadata])

  useEffect(() => { _playRef.current = _play }, [_play])

  // ── Push state to server for Lovelace card ───────────────────────────────
  const _pushPlayerState = useCallback((overrides={}) => {
    const t = trackRef.current; if (!t) return
    const base = window.ingressPath || ''
    fetch(`${base}/api/player/update`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        title:    t.title   || '',
        artist:   t.artist  || '',
        img:      t.img     || '',
        playing:  overrides.playing  ?? !audio.paused,
        progress: overrides.progress ?? audio.currentTime,
        duration: overrides.duration ?? (isNaN(audio.duration)?0:audio.duration),
      })
    }).catch(()=>{})
  }, [])

  useEffect(() => {
    const onPlay  = () => _pushPlayerState({ playing:true })
    const onPause = () => _pushPlayerState({ playing:false })
    const onDur   = () => _pushPlayerState()
    audio.addEventListener('play',           onPlay)
    audio.addEventListener('pause',          onPause)
    audio.addEventListener('durationchange', onDur)
    return () => {
      audio.removeEventListener('play',           onPlay)
      audio.removeEventListener('pause',          onPause)
      audio.removeEventListener('durationchange', onDur)
    }
  }, [_pushPlayerState])

  useEffect(() => {
    const t = setInterval(() => { if (!audio.paused) _pushPlayerState() }, 5000)
    return () => clearInterval(t)
  }, [_pushPlayerState])

  // ── Card control WS ──────────────────────────────────────────────────────
  useEffect(() => {
    const base    = window.ingressPath || ''
    const proto   = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url     = `${proto}://${window.location.host}${base}/ws/player`
    let ws, timer
    const connect = () => {
      ws = new WebSocket(url)
      ws.onmessage = (evt) => {
        let msg; try { msg = JSON.parse(evt.data) } catch { return }
        if (msg.type !== 'player_control') return
        const q=queueRef.current, i=qIdxRef.current
        if (msg.action==='play')  audio.play().catch(()=>{})
        if (msg.action==='pause') audio.pause()
        if (msg.action==='next' && i<q.length-1) _playRef.current?.(q[i+1],q,i+1)
        if (msg.action==='prev' && i>0) _playRef.current?.(q[i-1],q,i-1)
      }
      ws.onclose = () => { timer = setTimeout(connect, 3000) }
      ws.onerror = () => {}
    }
    connect()
    return () => { ws?.close(); clearTimeout(timer) }
  }, [])

  // ── MediaSession action handlers ─────────────────────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const doPlay  = () => { if(activeSpeakerRef.current==='local') audio.play(); else _haControl('play') }
    const doPause = () => { if(activeSpeakerRef.current==='local') audio.pause(); else _haControl('pause') }
    const doNext  = () => { const q=queueRef.current,i=qIdxRef.current; if(i<q.length-1) _playRef.current?.(q[i+1],q,i+1) }
    const doPrev  = () => {
      if(audio.currentTime>3&&activeSpeakerRef.current==='local'){audio.currentTime=0;return}
      const q=queueRef.current,i=qIdxRef.current; if(i>0) _playRef.current?.(q[i-1],q,i-1)
    }
    const doSeek  = ({seekTime}) => {
      if(activeSpeakerRef.current==='local') audio.currentTime=seekTime
      else _haControl('seek', seekTime)
      setProgress(seekTime); progressRef.current=seekTime; _updatePositionState()
    }
    navigator.mediaSession.setActionHandler('play',          doPlay)
    navigator.mediaSession.setActionHandler('pause',         doPause)
    navigator.mediaSession.setActionHandler('stop',          doPause)
    navigator.mediaSession.setActionHandler('nexttrack',     doNext)
    navigator.mediaSession.setActionHandler('previoustrack', doPrev)
    navigator.mediaSession.setActionHandler('seekto',        doSeek)
    navigator.mediaSession.setActionHandler('seekforward',   ()=>doSeek({seekTime:Math.min(progressRef.current+15,durationRef.current)}))
    navigator.mediaSession.setActionHandler('seekbackward',  ()=>doSeek({seekTime:Math.max(progressRef.current-15,0)}))
  }, [_updatePositionState])

  useEffect(() => {
    const t = setInterval(_updatePositionState, 5000)
    return () => clearInterval(t)
  }, [_updatePositionState])

  const _haControl = (action, position) => {
    const base = window.ingressPath || ''
    fetch(`${base}/api/ha/control`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ entity_id:activeSpeakerRef.current, action, position })
    }).catch(()=>{})
  }

  // ── Public API ───────────────────────────────────────────────────────────
  const playTrack  = useCallback((t,q=[],i=0) => _play(t, q.length?q:[t], i), [_play])

  const togglePlay = useCallback(() => {
    if (activeSpeakerRef.current === 'local') {
      audio.paused ? audio.play() : audio.pause()
    } else {
      _haControl(playing ? 'pause' : 'play')
      setPlaying(p => !p); playingRef.current = !playingRef.current
    }
  }, [playing])

  const seek = useCallback((s) => {
    if (activeSpeakerRef.current === 'local') audio.currentTime = s
    else { _haControl('seek', s); setProgress(s); progressRef.current=s; _updatePositionState() }
  }, [_updatePositionState])

  const playNext = useCallback((songToInsert) => {
    if (songToInsert) {
      setQueue(q => { const n=[...q]; n.splice(qIdxRef.current+1,0,songToInsert); queueRef.current=n; return n })
    } else {
      const q=queueRef.current,i=qIdxRef.current
      if (i<q.length-1) _play(q[i+1],q,i+1)
    }
  }, [_play])

  const playPrev = useCallback(() => {
    if (audio.currentTime>3 && activeSpeakerRef.current==='local') { seek(0); return }
    const q=queueRef.current,i=qIdxRef.current
    if (i>0) _play(q[i-1],q,i-1)
  }, [_play, seek])

  const addToQueue = useCallback((song) => {
    setQueue(q => { const n=[...q,song]; queueRef.current=n; return n })
  }, [])

  const setCastTarget = useCallback(async (entity_id, name) => {
    const t = trackRef.current
    setActiveSpeaker(entity_id||'local')
    activeSpeakerRef.current = entity_id||'local'
    setActiveSpeakerName(name||'This Device')
    if (entity_id && entity_id !== 'local') {
      await _pushCastMetadata(t, entity_id)
      applyVolume(volumeRef.current)
      _startHAPoller(entity_id)
    } else {
      _stopHAPoller()
    }
  }, [_pushCastMetadata, applyVolume, _startHAPoller, _stopHAPoller])

  // Hidden input for Android hw volume capture
  const HiddenVolumeInput = (
    <input ref={volInputRef} type="range" min="0" max="100" step="5" defaultValue="100"
      onChange={e => applyVolume(parseInt(e.target.value)/100)}
      style={{ position:'fixed', opacity:0, pointerEvents:'none', width:1, height:1, top:0, left:0, zIndex:-1 }}
      tabIndex={-1} aria-hidden="true" />
  )

  return (
    <Ctx.Provider value={{
      track, queue, qIdx, playing, progress, duration, loading,
      volume, muted, activeSpeaker, activeSpeakerName,
      playTrack, togglePlay, seek, playNext, playPrev, addToQueue,
      applyVolume, toggleMute, setCastTarget,
    }}>
      {HiddenVolumeInput}
      {children}
    </Ctx.Provider>
  )
}

export const usePlayer = () => useContext(Ctx)
