import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const Ctx = createContext(null)

const audio = new Audio()
audio.preload = 'auto'
audio.setAttribute('playsinline', '')

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

  // Refs — always safe to read/write from any closure
  const queueRef         = useRef([])
  const qIdxRef          = useRef(0)
  const playingRef       = useRef(false)
  const volumeRef        = useRef(1.0)
  const mutedRef         = useRef(false)
  const activeSpeakerRef = useRef('local')
  const trackRef         = useRef(null)
  const progressRef      = useRef(0)
  const durationRef      = useRef(0)
  const volDebounce      = useRef(null)
  const haWs             = useRef(null)
  const volInputRef      = useRef(null)

  // Indirection refs — lets useEffects call functions declared later
  const _playRef               = useRef(null)
  const _haControlRef          = useRef(null)
  const _updatePositionRef     = useRef(null)
  const _pushPlayerStateRef    = useRef(null)

  // Keep state refs in sync
  useEffect(() => { queueRef.current         = queue        }, [queue])
  useEffect(() => { qIdxRef.current          = qIdx         }, [qIdx])
  useEffect(() => { volumeRef.current        = volume       }, [volume])
  useEffect(() => { mutedRef.current         = muted        }, [muted])
  useEffect(() => { playingRef.current       = playing      }, [playing])
  useEffect(() => { activeSpeakerRef.current = activeSpeaker}, [activeSpeaker])
  useEffect(() => { trackRef.current         = track        }, [track])
  useEffect(() => { progressRef.current      = progress     }, [progress])
  useEffect(() => { durationRef.current      = duration     }, [duration])

  // ── Audio events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onTime  = () => { setProgress(audio.currentTime); progressRef.current = audio.currentTime }
    const onDur   = () => { const dur = isNaN(audio.duration)?0:audio.duration; setDuration(dur); durationRef.current=dur }
    const onPlay  = () => {
      setPlaying(true); playingRef.current=true; setLoading(false)
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
      window.__resumeAudioIfPlaying = () => audio.play().catch(() => {})
    }
    const onPause = () => {
      setPlaying(false); playingRef.current=false
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
    }
    const onWait  = () => setLoading(true)
    const onCan   = () => setLoading(false)
    const onEnd   = () => {
      const q=queueRef.current, i=qIdxRef.current
      if (i < q.length-1) {
        _playRef.current?.(q[i+1], q, i+1)
      } else {
        const t = trackRef.current
        const artistId = t?.artistId || t?.artist_id
        if (!artistId) return
        const base = window.ingressPath || ''
        fetch(`${base}/api/artists/${artistId}`)
          .then(r => r.json())
          .then(artistData => {
            const topSongs   = Array.isArray(artistData.top_songs) ? artistData.top_songs : []
            const albums     = Array.isArray(artistData.albums)    ? artistData.albums    : []
            const artistImg  = artistData.artist?.img  || artistData.img  || t.img
            const artistName = artistData.artist?.name || artistData.name || t.artist
            const nextTracks = topSongs
              .filter(s => s.id !== t.id)
              .map(s => ({ id:s.id, title:s.title||s.name||'', artist:s.artists?.map(a=>a.name).join(', ')||artistName, img:s.img||artistImg, artistId:s.artist_id||artistId, collectionId:s.collection_id||null }))
            if (nextTracks.length > 0) {
              _playRef.current?.(nextTracks[0], nextTracks, 0)
            } else if (albums.length > 0) {
              const nextAlbum = albums.find(a => a.id !== t.collectionId) || albums[0]
              fetch(`${base}/api/collections/${nextAlbum.id}`)
                .then(r => r.json())
                .then(albumData => {
                  const songs = Array.isArray(albumData.collection?.contents) ? albumData.collection.contents : []
                  const tracks = songs.map(s => ({ id:s.id, title:s.title||s.name||'', artist:s.artists?.map(a=>a.name).join(', ')||artistName, img:s.img||albumData.collection?.img||artistImg, artistId, collectionId:nextAlbum.id }))
                  if (tracks.length > 0) _playRef.current?.(tracks[0], tracks, 0)
                }).catch(() => {})
            }
          }).catch(() => {})
      }
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

  // ── Tab visibility — resume audio ────────────────────────────────────────
  useEffect(() => {
    const resume = () => { if (playingRef.current && audio.paused && audio.src) audio.play().catch(()=>{}) }
    const onVis  = () => { if (document.visibilityState === 'visible') resume() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // ── MediaSession position state ──────────────────────────────────────────
  const _updatePositionState = useCallback(() => {
    if (!('mediaSession' in navigator)) return
    try {
      if (durationRef.current > 0) {
        navigator.mediaSession.setPositionState({ duration:durationRef.current, playbackRate:1, position:Math.min(progressRef.current, durationRef.current) })
      }
    } catch {}
  }, [])
  useEffect(() => { _updatePositionRef.current = _updatePositionState }, [_updatePositionState])

  // ── MediaSession metadata ────────────────────────────────────────────────
  const _pushMetadata = useCallback((t) => {
    if (!('mediaSession' in navigator) || !t) return
    const imgUrl = t.img ? `${window.ingressPath||''}/api/img?url=${encodeURIComponent(t.img)}` : null
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title||'', artist: t.artist||'', album: t.album||'',
      artwork: imgUrl ? [{ src:imgUrl, sizes:'512x512', type:'image/jpeg' }] : [],
    })
    navigator.mediaSession.playbackState = 'playing'
  }, [])

  // ── Push cast metadata ───────────────────────────────────────────────────
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

  // ── HA speaker poller ────────────────────────────────────────────────────
  const _startHAPoller = useCallback((entity_id) => {
    if (haWs.current) { haWs.current.onclose=null; haWs.current.close(); haWs.current=null }
    if (!entity_id || entity_id === 'local') return
    const base  = window.ingressPath || ''
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url   = `${proto}://${window.location.host}${base}/ws/player`
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
          setProgress(position); progressRef.current=position; _updatePositionRef.current?.()
        }
        if (vol != null && Math.abs(vol - volumeRef.current) > 0.02) {
          setVolume(vol); volumeRef.current=vol; audio.volume = mutedRef.current ? 0 : vol
        }
      }
    }
    connect()
  }, [])

  const _stopHAPoller = useCallback(() => {
    if (haWs.current) { haWs.current.onclose=null; haWs.current.close(); haWs.current=null }
  }, [])

  // ── Volume ───────────────────────────────────────────────────────────────
  const applyVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v))
    setVolume(clamped); volumeRef.current = clamped
    if (activeSpeakerRef.current === 'local') {
      audio.volume = mutedRef.current ? 0 : clamped
    } else {
      clearTimeout(volDebounce.current)
      volDebounce.current = setTimeout(() => {
        const base = window.ingressPath || ''
        fetch(`${base}/api/ha/volume`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ entity_id:activeSpeakerRef.current, volume:clamped }) }).catch(()=>{})
      }, 80)
    }
  }, [])

  const toggleMute = useCallback(() => {
    const nm = !mutedRef.current
    setMuted(nm); mutedRef.current=nm
    if (activeSpeakerRef.current === 'local') audio.volume = nm ? 0 : volumeRef.current
  }, [])

  useEffect(() => {
    const onVC = () => {
      if (activeSpeakerRef.current !== 'local' || mutedRef.current) return
      const v = audio.volume
      if (Math.abs(v - volumeRef.current) > 0.01) { setVolume(v); volumeRef.current=v }
    }
    audio.addEventListener('volumechange', onVC)
    return () => audio.removeEventListener('volumechange', onVC)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key==='AudioVolumeUp'||e.code==='AudioVolumeUp')     { e.preventDefault(); applyVolume(volumeRef.current+0.05) }
      if (e.key==='AudioVolumeDown'||e.code==='AudioVolumeDown') { e.preventDefault(); applyVolume(volumeRef.current-0.05) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [applyVolume])

  // ── HA control ───────────────────────────────────────────────────────────
  const _haControl = useCallback((action, position) => {
    const base = window.ingressPath || ''
    fetch(`${base}/api/ha/control`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ entity_id:activeSpeakerRef.current, action, position }) }).catch(()=>{})
  }, [])
  useEffect(() => { _haControlRef.current = _haControl }, [_haControl])

  // ── Core play ─────────────────────────────────────────────────────────────
  const _play = useCallback(async (t, q, i) => {
    setTrack(t); setQueue(q); setQIdx(i)
    queueRef.current=q; qIdxRef.current=i; trackRef.current=t
    setLoading(true); setProgress(0); setDuration(0)
    _pushMetadata(t)
    const base = window.ingressPath || ''
    fetch(`${base}/api/browse/record-play`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:t.id, title:t.title, artist:t.artist, img:t.img }) }).catch(()=>{})
    if (activeSpeakerRef.current !== 'local') {
      try {
        const r = await fetch(`${base}/api/ha/play`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ entity_id:activeSpeakerRef.current, track_id:t.id, track_title:t.title }) })
        const castResp = await r.json()
        if (castResp.ok) { setPlaying(true); playingRef.current=true; setLoading(false); await _pushCastMetadata(t, activeSpeakerRef.current) }
      } catch (e) { console.error('[cast]', e.message); setLoading(false) }
      return
    }
    try {
      const res  = await fetch(`${base}/api/audio/${t.id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const url  = typeof data === 'string' ? data : data?.url
      if (!url) throw new Error('No URL')
      audio.volume = mutedRef.current ? 0 : volumeRef.current
      audio.src = url; audio.load(); await audio.play()
    } catch (e) { console.error('[play]', e.message); setLoading(false) }
  }, [_pushMetadata, _pushCastMetadata])
  useEffect(() => { _playRef.current = _play }, [_play])

  // ── Push state to Lovelace card ──────────────────────────────────────────
  const _pushPlayerState = useCallback((overrides={}) => {
    const t = trackRef.current; if (!t) return
    const base = window.ingressPath || ''
    fetch(`${base}/api/player/update`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title:t.title||'', artist:t.artist||'', img:t.img||'', playing:overrides.playing??!audio.paused, progress:overrides.progress??audio.currentTime, duration:overrides.duration??(isNaN(audio.duration)?0:audio.duration) }) }).catch(()=>{})
  }, [])
  useEffect(() => { _pushPlayerStateRef.current = _pushPlayerState }, [_pushPlayerState])

  useEffect(() => {
    const onPlay  = () => _pushPlayerStateRef.current?.({ playing:true })
    const onPause = () => _pushPlayerStateRef.current?.({ playing:false })
    const onDur   = () => _pushPlayerStateRef.current?.()
    audio.addEventListener('play',           onPlay)
    audio.addEventListener('pause',          onPause)
    audio.addEventListener('durationchange', onDur)
    return () => {
      audio.removeEventListener('play',           onPlay)
      audio.removeEventListener('pause',          onPause)
      audio.removeEventListener('durationchange', onDur)
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => { if (!audio.paused) _pushPlayerStateRef.current?.() }, 5000)
    return () => clearInterval(t)
  }, [])

  // ── Card control WS ──────────────────────────────────────────────────────
  useEffect(() => {
    const base  = window.ingressPath || ''
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url   = `${proto}://${window.location.host}${base}/ws/player`
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
        if (msg.action==='prev' && i>0)          _playRef.current?.(q[i-1],q,i-1)
      }
      ws.onclose = () => { timer = setTimeout(connect, 3000) }
      ws.onerror = () => {}
    }
    connect()
    return () => { ws?.close(); clearTimeout(timer) }
  }, [])

  // ── MediaSession actions ─────────────────────────────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play',          () => { if(activeSpeakerRef.current==='local') audio.play(); else _haControlRef.current?.('play') })
    navigator.mediaSession.setActionHandler('pause',         () => { if(activeSpeakerRef.current==='local') audio.pause(); else _haControlRef.current?.('pause') })
    navigator.mediaSession.setActionHandler('stop',          () => { if(activeSpeakerRef.current==='local') audio.pause(); else _haControlRef.current?.('pause') })
    navigator.mediaSession.setActionHandler('nexttrack',     () => { const q=queueRef.current,i=qIdxRef.current; if(i<q.length-1) _playRef.current?.(q[i+1],q,i+1) })
    navigator.mediaSession.setActionHandler('previoustrack', () => { const q=queueRef.current,i=qIdxRef.current; if(i>0) _playRef.current?.(q[i-1],q,i-1) })
    navigator.mediaSession.setActionHandler('seekto',        ({seekTime}) => {
      if(activeSpeakerRef.current==='local') audio.currentTime=seekTime; else _haControlRef.current?.('seek', seekTime)
      setProgress(seekTime); progressRef.current=seekTime; _updatePositionRef.current?.()
    })
    navigator.mediaSession.setActionHandler('seekforward',  () => { const t=Math.min(progressRef.current+15,durationRef.current); audio.currentTime=t; _updatePositionRef.current?.() })
    navigator.mediaSession.setActionHandler('seekbackward', () => { const t=Math.max(progressRef.current-15,0);                   audio.currentTime=t; _updatePositionRef.current?.() })
  }, [])

  useEffect(() => {
    const t = setInterval(() => _updatePositionRef.current?.(), 5000)
    return () => clearInterval(t)
  }, [])

  // ── Public API ───────────────────────────────────────────────────────────
  const playTrack  = useCallback((t,q=[],i=0) => _play(t, q.length?q:[t], i), [_play])

  const togglePlay = useCallback(() => {
    if (activeSpeakerRef.current === 'local') {
      audio.paused ? audio.play() : audio.pause()
    } else {
      _haControlRef.current?.(playingRef.current ? 'pause' : 'play')
      setPlaying(p => !p); playingRef.current = !playingRef.current
    }
  }, [])

  const seek = useCallback((s) => {
    if (activeSpeakerRef.current === 'local') audio.currentTime = s
    else { _haControlRef.current?.('seek', s); setProgress(s); progressRef.current=s; _updatePositionRef.current?.() }
  }, [])

  const playNext = useCallback((songToInsert) => {
    if (songToInsert) {
      setQueue(q => { const n=[...q]; n.splice(qIdxRef.current+1,0,songToInsert); queueRef.current=n; return n })
    } else {
      const q=queueRef.current, i=qIdxRef.current
      if (i<q.length-1) _play(q[i+1],q,i+1)
    }
  }, [_play])

  const playPrev = useCallback(() => {
    if (audio.currentTime>3 && activeSpeakerRef.current==='local') { audio.currentTime=0; return }
    const q=queueRef.current, i=qIdxRef.current
    if (i>0) _play(q[i-1],q,i-1)
  }, [_play])

  const addToQueue = useCallback((song) => {
    setQueue(q => { const n=[...q,song]; queueRef.current=n; return n })
  }, [])

  const setCastTarget = useCallback(async (entity_id, name) => {
    setActiveSpeaker(entity_id||'local'); activeSpeakerRef.current=entity_id||'local'
    setActiveSpeakerName(name||'This Device')
    if (entity_id && entity_id !== 'local') {
      await _pushCastMetadata(trackRef.current, entity_id)
      applyVolume(volumeRef.current)
      _startHAPoller(entity_id)
    } else {
      _stopHAPoller()
    }
  }, [_pushCastMetadata, applyVolume, _startHAPoller, _stopHAPoller])

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
