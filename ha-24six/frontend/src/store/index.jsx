import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const Ctx = createContext(null)

// ── Per-session audio elements (keyed by session id) ─────────────────────────
const audioElements = {}
function getAudio(sid) {
  if (!audioElements[sid]) {
    const el = new Audio()
    el.preload = 'auto'
    el.setAttribute('playsinline', '')
    audioElements[sid] = el
  }
  return audioElements[sid]
}

let _sessionIdCounter = 1
function newSessionId() { return `s${_sessionIdCounter++}` }

function makeSession(overrides = {}) {
  return {
    id:          overrides.id || newSessionId(),
    label:       overrides.label || 'Player',
    track:       null,
    queue:       [],
    qIdx:        0,
    playing:     false,
    progress:    0,
    duration:    0,
    loading:     false,
    volume:      1.0,
    muted:       false,
    speaker:     'local',
    speakerName: 'This Device',
    ...overrides,
  }
}

// ── Context value shape ───────────────────────────────────────────────────────
// Exposes: sessions[], activeId, activeSession, and all player actions
// Actions that take no sessionId operate on the active session
// switchSession(id), createSession(), removeSession(id), renameSession(id, label)

export function PlayerProvider({ children }) {
  const [sessions,  setSessions]  = useState(() => [makeSession({ id:'s0', label:'Player 1' })])
  const [activeId,  setActiveId]  = useState('s0')

  // Refs for active session values (safe to use in closures)
  const sessionsRef  = useRef(sessions)
  const activeIdRef  = useRef(activeId)
  useEffect(() => { sessionsRef.current = sessions }, [sessions])
  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  // Per-session refs for values that must be current inside async closures
  const sessionRefs = useRef({}) // { [id]: { queue, qIdx, playing, track, progress, duration, speaker, muted, volume, haWs, volDebounce, _playRef, _haControlRef } }

  function getRef(sid) {
    if (!sessionRefs.current[sid]) {
      sessionRefs.current[sid] = {
        queue: [], qIdx: 0, playing: false, track: null,
        progress: 0, duration: 0, speaker: 'local', muted: false, volume: 1.0,
        haWs: null, volDebounce: null,
        _playRef: { current: null },
        _haControlRef: { current: null },
        _pushStateRef: { current: null },
      }
    }
    return sessionRefs.current[sid]
  }

  // Sync session state into refs whenever sessions changes
  useEffect(() => {
    sessions.forEach(sess => {
      const ref = getRef(sess.id)
      ref.queue    = sess.queue
      ref.qIdx     = sess.qIdx
      ref.playing  = sess.playing
      ref.track    = sess.track
      ref.progress = sess.progress
      ref.duration = sess.duration
      ref.speaker  = sess.speaker
      ref.muted    = sess.muted
      ref.volume   = sess.volume
    })
  }, [sessions])

  // ── Update one session field ─────────────────────────────────────────────
  const updateSession = useCallback((sid, patch) => {
    setSessions(prev => prev.map(s => s.id === sid ? { ...s, ...patch } : s))
  }, [])

  // ── Audio event wiring (called once per session, on first play) ──────────
  const wiredSessions = useRef(new Set())

  const wireAudio = useCallback((sid) => {
    if (wiredSessions.current.has(sid)) return
    wiredSessions.current.add(sid)
    const audio = getAudio(sid)
    const ref   = getRef(sid)

    audio.addEventListener('timeupdate',     () => {
      ref.progress = audio.currentTime
      updateSession(sid, { progress: audio.currentTime })
    })
    audio.addEventListener('durationchange', () => {
      const dur = isNaN(audio.duration) ? 0 : audio.duration
      ref.duration = dur
      updateSession(sid, { duration: dur })
    })
    audio.addEventListener('play',  () => {
      ref.playing = true
      updateSession(sid, { playing: true, loading: false })
      if (sid === activeIdRef.current && 'mediaSession' in navigator)
        navigator.mediaSession.playbackState = 'playing'
    })
    audio.addEventListener('pause', () => {
      ref.playing = false
      updateSession(sid, { playing: false })
      if (sid === activeIdRef.current && 'mediaSession' in navigator)
        navigator.mediaSession.playbackState = 'paused'
    })
    audio.addEventListener('waiting', () => updateSession(sid, { loading: true }))
    audio.addEventListener('canplay', () => updateSession(sid, { loading: false }))
    audio.addEventListener('ended',   () => {
      const q = ref.queue, i = ref.qIdx, t = ref.track
      if (i < q.length - 1) {
        ref._playRef.current?.(sid, q[i+1], q, i+1)
        return
      }
      // Auto-queue from artist
      const artistId = t?.artistId || t?.artist_id
      if (!artistId) return
      const base = window.ingressPath || ''
      fetch(`${base}/api/artists/${artistId}`)
        .then(r => r.json())
        .then(artistData => {
          const topSongs   = Array.isArray(artistData.top_songs) ? artistData.top_songs : []
          const albums     = Array.isArray(artistData.albums)    ? artistData.albums    : []
          const artistImg  = artistData.artist?.img  || t.img
          const artistName = artistData.artist?.name || t.artist
          const nextTracks = topSongs
            .filter(s => s.id !== t.id)
            .map(s => ({ id:s.id, title:s.title||s.name||'', artist:s.artists?.map(a=>a.name).join(', ')||artistName, img:s.img||artistImg, artistId:s.artist_id||artistId, collectionId:s.collection_id||null }))
          if (nextTracks.length > 0) {
            ref._playRef.current?.(sid, nextTracks[0], nextTracks, 0)
          } else if (albums.length > 0) {
            const nextAlbum = albums.find(a => a.id !== t.collectionId) || albums[0]
            fetch(`${base}/api/collections/${nextAlbum.id}`)
              .then(r => r.json())
              .then(albumData => {
                const songs  = Array.isArray(albumData.collection?.contents) ? albumData.collection.contents : []
                const tracks = songs.map(s => ({ id:s.id, title:s.title||s.name||'', artist:s.artists?.map(a=>a.name).join(', ')||artistName, img:s.img||albumData.collection?.img||artistImg, artistId, collectionId:nextAlbum.id }))
                if (tracks.length > 0) ref._playRef.current?.(sid, tracks[0], tracks, 0)
              }).catch(() => {})
          }
        }).catch(() => {})
    })
  }, [updateSession])

  // ── Tab visibility ────────────────────────────────────────────────────────
  useEffect(() => {
    const resume = () => {
      sessions.forEach(sess => {
        if (sess.speaker === 'local') {
          const audio = getAudio(sess.id)
          const ref   = getRef(sess.id)
          if (ref.playing && audio.paused && audio.src) audio.play().catch(() => {})
        }
      })
    }
    const onVis = () => { if (document.visibilityState === 'visible') resume() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [sessions])

  // ── MediaSession (only for active session) ────────────────────────────────
  const pushMetadata = useCallback((sess) => {
    if (!('mediaSession' in navigator) || !sess?.track) return
    const t = sess.track
    const imgUrl = t.img ? `${window.ingressPath||''}/api/img?url=${encodeURIComponent(t.img)}` : null
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title||'', artist: t.artist||'', album: t.album||'',
      artwork: imgUrl ? [{ src:imgUrl, sizes:'512x512', type:'image/jpeg' }] : [],
    })
    navigator.mediaSession.playbackState = sess.playing ? 'playing' : 'paused'
  }, [])

  // Re-push metadata when active session changes
  useEffect(() => {
    const sess = sessions.find(s => s.id === activeId)
    if (sess) pushMetadata(sess)
  }, [activeId]) // eslint-disable-line

  // ── MediaSession action handlers ──────────────────────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const getActive = () => {
      const sid  = activeIdRef.current
      const ref  = getRef(sid)
      const audio = getAudio(sid)
      return { sid, ref, audio }
    }
    navigator.mediaSession.setActionHandler('play',          () => { const {sid,ref,audio}=getActive(); ref.speaker==='local'?audio.play():ref._haControlRef.current?.('play') })
    navigator.mediaSession.setActionHandler('pause',         () => { const {sid,ref,audio}=getActive(); ref.speaker==='local'?audio.pause():ref._haControlRef.current?.('pause') })
    navigator.mediaSession.setActionHandler('stop',          () => { const {sid,ref,audio}=getActive(); ref.speaker==='local'?audio.pause():ref._haControlRef.current?.('pause') })
    navigator.mediaSession.setActionHandler('nexttrack',     () => { const {sid,ref}=getActive(); const q=ref.queue,i=ref.qIdx; if(i<q.length-1) ref._playRef.current?.(sid,q[i+1],q,i+1) })
    navigator.mediaSession.setActionHandler('previoustrack', () => { const {sid,ref}=getActive(); const q=ref.queue,i=ref.qIdx; if(i>0) ref._playRef.current?.(sid,q[i-1],q,i-1) })
    navigator.mediaSession.setActionHandler('seekto',        ({seekTime}) => {
      const {sid,ref,audio}=getActive()
      if (ref.speaker==='local') audio.currentTime=seekTime; else ref._haControlRef.current?.('seek',seekTime)
      ref.progress=seekTime; updateSession(sid,{progress:seekTime})
    })
    navigator.mediaSession.setActionHandler('seekforward',  () => { const {ref,audio}=getActive(); const t=Math.min(ref.progress+15,ref.duration); if(ref.speaker==='local') audio.currentTime=t })
    navigator.mediaSession.setActionHandler('seekbackward', () => { const {ref,audio}=getActive(); const t=Math.max(ref.progress-15,0);              if(ref.speaker==='local') audio.currentTime=t })
  }, [updateSession])

  // ── Lovelace card WS ──────────────────────────────────────────────────────
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
        const sid   = activeIdRef.current
        const ref   = getRef(sid)
        const audio = getAudio(sid)
        const q=ref.queue, i=ref.qIdx
        if (msg.action==='play')  audio.play().catch(()=>{})
        if (msg.action==='pause') audio.pause()
        if (msg.action==='stop')  { audio.pause(); audio.currentTime=0 }
        if (msg.action==='next' && i<q.length-1) ref._playRef.current?.(sid,q[i+1],q,i+1)
        if (msg.action==='prev' && i>0)          ref._playRef.current?.(sid,q[i-1],q,i-1)
        if (msg.action==='seek' && msg.position!=null) {
          audio.currentTime = msg.position
          ref.progress = msg.position
          updateSession(sid, { progress: msg.position })
        }
        if (msg.action==='volume' && msg.volume!=null) {
          const v = Math.max(0, Math.min(1, msg.volume))
          ref.volume = v; audio.volume = ref.muted ? 0 : v
          updateSession(sid, { volume: v })
        }
        if (msg.action==='mute') {
          ref.muted = !!msg.mute; audio.volume = ref.muted ? 0 : ref.volume
          updateSession(sid, { muted: ref.muted })
        }
        if (msg.action==='set_speaker') {
          const eid = msg.entity_id || 'local'
          ref.speaker = eid
          ref.speakerName = eid === 'local' ? 'This Device' : eid
          updateSession(sid, { speaker: eid, speakerName: ref.speakerName })
          if (eid !== 'local') startHAPoller(sid, eid)
        }
        if (msg.action==='play_track' && msg.track_id) {
          // Build minimal track object and play it
          // Full metadata will come from the API
          const base = window.ingressPath || ''
          fetch(`${base}/api/audio/${msg.track_id}`)
            .then(r => r.json())
            .then(data => {
              const track = { id: msg.track_id, title: msg.track_title || 'Track', artist: '', img: '' }
              const queue = msg.queue && msg.queue.length > 0
                ? msg.queue.map((tid, idx) => ({ id: tid, title: '', artist: '', img: '' }))
                : [track]
              ref._playRef.current?.(sid, track, queue, 0)
            }).catch(() => {})
        }
      }
      ws.onclose = () => { timer = setTimeout(connect, 3000) }
      ws.onerror = () => {}
    }
    connect()
    return () => { ws?.close(); clearTimeout(timer) }
  }, [])

  // ── Lovelace state push (active session only) ─────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      const sid   = activeIdRef.current
      const ref   = getRef(sid)
      const audio = getAudio(sid)
      const track = ref.track; if (!track) return
      const base  = window.ingressPath || ''
      fetch(`${base}/api/player/update`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ title:track.title||'', artist:track.artist||'', img:track.img||'', playing:ref.playing, progress:ref.progress, duration:ref.duration })
      }).catch(() => {})
    }, 5000)
    return () => clearInterval(t)
  }, [])

  // ── Core _play (per session) ──────────────────────────────────────────────
  const _play = useCallback(async (sid, t, q, i) => {
    wireAudio(sid)
    const ref   = getRef(sid)
    const audio = getAudio(sid)

    ref.queue = q; ref.qIdx = i; ref.track = t
    updateSession(sid, { track:t, queue:q, qIdx:i, loading:true, progress:0, duration:0 })

    if (sid === activeIdRef.current) pushMetadata({ ...t, track:t, playing:true })

    const base = window.ingressPath || ''
    fetch(`${base}/api/browse/record-play`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:t.id, title:t.title, artist:t.artist, img:t.img }) }).catch(() => {})

    if (ref.speaker !== 'local') {
      try {
        const r = await fetch(`${base}/api/ha/play`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ entity_id:ref.speaker, track_id:t.id, track_title:t.title }) })
        const resp = await r.json()
        if (resp.ok) {
          ref.playing = true
          updateSession(sid, { playing:true, loading:false })
          // push cast metadata
          fetch(`${base}/api/ha/cast-metadata`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ entity_id:ref.speaker, title:t.title||'', artist:t.artist||'', img:t.img||'' }) }).catch(()=>{})
        }
      } catch (e) { console.error('[cast]', e.message); updateSession(sid, { loading:false }) }
      return
    }

    try {
      const res  = await fetch(`${base}/api/audio/${t.id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const url  = typeof data === 'string' ? data : data?.url
      if (!url) throw new Error('No URL')
      audio.volume = ref.muted ? 0 : ref.volume
      audio.src = url; audio.load(); await audio.play()
    } catch (e) { console.error('[play]', e.message); updateSession(sid, { loading:false }) }
  }, [wireAudio, updateSession, pushMetadata])

  // Wire _playRef per session so audio.ended callbacks can call it
  useEffect(() => {
    sessions.forEach(sess => {
      const ref = getRef(sess.id)
      ref._playRef.current = _play
    })
  }, [sessions, _play])

  // ── HA speaker poller (per session) ──────────────────────────────────────
  const startHAPoller = useCallback((sid, entity_id) => {
    const ref = getRef(sid)
    if (ref.haWs) { ref.haWs.onclose=null; ref.haWs.close(); ref.haWs=null }
    if (!entity_id || entity_id === 'local') return
    const base  = window.ingressPath || ''
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url   = `${proto}://${window.location.host}${base}/ws/player`
    const connect = () => {
      const ws = new WebSocket(url)
      ref.haWs = ws
      ws.onclose = () => { if (ref.speaker === entity_id) setTimeout(connect, 3000) }
      ws.onerror = () => {}
      ws.onmessage = (evt) => {
        let msg; try { msg = JSON.parse(evt.data) } catch { return }
        if (msg.type !== 'speaker_state' || msg.entity_id !== entity_id) return
        const { state, position, volume: vol } = msg
        if (state === 'playing') { ref.playing=true; updateSession(sid, { playing:true }) }
        else if (state === 'paused' || state === 'idle') { ref.playing=false; updateSession(sid, { playing:false }) }
        if (position != null && Math.abs(position - ref.progress) > 3) {
          ref.progress=position; updateSession(sid, { progress:position })
        }
        if (vol != null && Math.abs(vol - ref.volume) > 0.02) {
          ref.volume=vol; updateSession(sid, { volume:vol })
          getAudio(sid).volume = ref.muted ? 0 : vol
        }
      }
    }
    connect()
  }, [updateSession])

  // ── Public actions ────────────────────────────────────────────────────────

  // Play on a specific session (or active session if sid omitted)
  const playTrack = useCallback((t, q=[], i=0, sid=null) => {
    const target = sid || activeIdRef.current
    _play(target, t, q.length ? q : [t], i)
  }, [_play])

  const togglePlay = useCallback((sid=null) => {
    const target = sid || activeIdRef.current
    const ref    = getRef(target)
    const audio  = getAudio(target)
    if (ref.speaker === 'local') {
      audio.paused ? audio.play() : audio.pause()
    } else {
      const action = ref.playing ? 'pause' : 'play'
      fetch(`${window.ingressPath||''}/api/ha/control`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ entity_id:ref.speaker, action }) }).catch(()=>{})
      ref.playing = !ref.playing
      updateSession(target, { playing: ref.playing })
    }
  }, [updateSession])

  const seek = useCallback((s, sid=null) => {
    const target = sid || activeIdRef.current
    const ref    = getRef(target)
    const audio  = getAudio(target)
    if (ref.speaker === 'local') { audio.currentTime = s }
    else {
      fetch(`${window.ingressPath||''}/api/ha/control`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ entity_id:ref.speaker, action:'seek', position:s }) }).catch(()=>{})
    }
    ref.progress = s; updateSession(target, { progress:s })
  }, [updateSession])

  const playNext = useCallback((songToInsert=null, sid=null) => {
    const target = sid || activeIdRef.current
    const ref    = getRef(target)
    if (songToInsert) {
      const q = [...ref.queue]; q.splice(ref.qIdx+1, 0, songToInsert)
      ref.queue = q; updateSession(target, { queue:q })
    } else {
      const q=ref.queue, i=ref.qIdx
      if (i < q.length-1) _play(target, q[i+1], q, i+1)
    }
  }, [_play, updateSession])

  const playPrev = useCallback((sid=null) => {
    const target = sid || activeIdRef.current
    const ref    = getRef(target)
    const audio  = getAudio(target)
    if (audio.currentTime > 3 && ref.speaker==='local') { audio.currentTime=0; return }
    const q=ref.queue, i=ref.qIdx
    if (i > 0) _play(target, q[i-1], q, i-1)
  }, [_play])

  const addToQueue = useCallback((song, sid=null) => {
    const target = sid || activeIdRef.current
    const ref    = getRef(target)
    const q      = [...ref.queue, song]
    ref.queue    = q; updateSession(target, { queue:q })
  }, [updateSession])

  const applyVolume = useCallback((v, sid=null) => {
    const target  = sid || activeIdRef.current
    const ref     = getRef(target)
    const audio   = getAudio(target)
    const clamped = Math.max(0, Math.min(1, v))
    ref.volume = clamped; updateSession(target, { volume:clamped })
    if (ref.speaker === 'local') {
      audio.volume = ref.muted ? 0 : clamped
    } else {
      clearTimeout(ref.volDebounce)
      ref.volDebounce = setTimeout(() => {
        fetch(`${window.ingressPath||''}/api/ha/volume`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ entity_id:ref.speaker, volume_level:clamped }) }).catch(()=>{})
      }, 80)
    }
  }, [updateSession])

  const toggleMute = useCallback((sid=null) => {
    const target = sid || activeIdRef.current
    const ref    = getRef(target)
    const audio  = getAudio(target)
    const nm     = !ref.muted
    ref.muted    = nm; updateSession(target, { muted:nm })
    if (ref.speaker === 'local') audio.volume = nm ? 0 : ref.volume
  }, [updateSession])

  const setCastTarget = useCallback(async (entity_id, name, sid=null) => {
    const target = sid || activeIdRef.current
    const ref    = getRef(target)
    ref.speaker     = entity_id || 'local'
    ref.speakerName = name || 'This Device'
    updateSession(target, { speaker: ref.speaker, speakerName: ref.speakerName })
    if (entity_id && entity_id !== 'local') {
      const t = ref.track
      if (t) fetch(`${window.ingressPath||''}/api/ha/cast-metadata`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ entity_id, title:t.title||'', artist:t.artist||'', img:t.img||'' }) }).catch(()=>{})
      startHAPoller(target, entity_id)
    } else {
      if (ref.haWs) { ref.haWs.onclose=null; ref.haWs.close(); ref.haWs=null }
    }
  }, [updateSession, startHAPoller])

  // ── Session management ─────────────────────────────────────────────────────
  const createSession = useCallback(() => {
    const count = sessionsRef.current.length + 1
    const sess  = makeSession({ label: `Player ${count}` })
    setSessions(prev => [...prev, sess])
    setActiveId(sess.id)
    return sess.id
  }, [])

  const removeSession = useCallback((sid) => {
    // Pause and clean up audio
    const audio = getAudio(sid)
    audio.pause(); audio.src = ''
    const ref = getRef(sid)
    if (ref.haWs) { ref.haWs.onclose=null; ref.haWs.close() }
    delete sessionRefs.current[sid]
    delete audioElements[sid]
    setSessions(prev => {
      const next = prev.filter(s => s.id !== sid)
      if (next.length === 0) {
        const fresh = makeSession({ label: 'Player 1' })
        setActiveId(fresh.id)
        return [fresh]
      }
      if (activeIdRef.current === sid) setActiveId(next[next.length-1].id)
      return next
    })
  }, [])

  const renameSession = useCallback((sid, label) => {
    updateSession(sid, { label })
  }, [updateSession])

  const switchSession = useCallback((sid) => {
    setActiveId(sid)
    // Re-push MediaSession metadata for the newly active session
    const sess = sessionsRef.current.find(s => s.id === sid)
    if (sess) pushMetadata(sess)
  }, [pushMetadata])

  // ── Derive active session ─────────────────────────────────────────────────
  const activeSession = sessions.find(s => s.id === activeId) || sessions[0]

  // Convenience: expose active session fields at top level (backwards compat)
  const { track, queue, qIdx, playing, progress, duration, loading, volume, muted, speaker: activeSpeaker, speakerName: activeSpeakerName } = activeSession

  return (
    <Ctx.Provider value={{
      // Active session fields (backwards compat)
      track, queue, qIdx, playing, progress, duration, loading,
      volume, muted, activeSpeaker, activeSpeakerName,
      // Session management
      sessions, activeId, activeSession,
      switchSession, createSession, removeSession, renameSession,
      // Actions (all operate on active session by default)
      playTrack, togglePlay, seek, playNext, playPrev, addToQueue,
      applyVolume, toggleMute, setCastTarget,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const usePlayer = () => useContext(Ctx)
