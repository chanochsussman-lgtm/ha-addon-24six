import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { usePlayer } from '../store/index.jsx'
import ContextMenu from '../components/ContextMenu'

export default function PlaylistPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [menu, setMenu] = useState(null)
  const { playTrack, track: cur, playing } = usePlayer()

  useEffect(() => {
    setLoading(true)
    api.playlist(id).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  const playlist = data?.playlist || data?.data || data
  const songs = data?.songs || data?.content || playlist?.songs || playlist?.content || []
  const imgUrl = playlist?.img ? api.imgUrl(playlist.img) : null

  const toTrack = s => ({
    id: s.id,
    title: s.title || s.name,
    artist: s.artists?.map(a => a.name).join(', ') || '',
    img: s.img || playlist?.img
  })

  const allTracks = Array.isArray(songs) ? songs.map(toTrack) : []

  const playAll = () => { if (!allTracks.length) return; playTrack(allTracks[0], allTracks, 0) }
  const playSong = (i) => playTrack(allTracks[i], allTracks, i)

  const holdTimers = useRef({})
  const onPointerDown = (s, i) => () => {
    holdTimers.current[i] = setTimeout(() => setMenu({ song: toTrack(s), queue: allTracks, idx: i }), 500)
  }
  const onPointerUp = (i) => () => clearTimeout(holdTimers.current[i])

  return (
    <div>
      <div style={{ background: 'linear-gradient(180deg, #2a2b3299 0%, var(--bg) 100%)', padding: '14px 16px 28px' }}>
        <button onClick={() => nav(-1)} style={{ background: 'rgba(0,0,0,0.35)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 14, gap: 12 }}>
          <div style={{ width: 140, height: 140, borderRadius: 12, overflow: 'hidden', background: 'var(--card)', boxShadow: '0 6px 24px rgba(0,0,0,0.5)' }}>
            {imgUrl && <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{playlist?.title || playlist?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{allTracks.length} tracks</div>
          </div>
          <button onClick={playAll} style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 14, padding: '11px 32px', borderRadius: 30, display: 'flex', alignItems: 'center', gap: 7, border: 'none', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z"/></svg>
            Play All
          </button>
        </div>
      </div>

      <div>
        {allTracks.map((t, i) => {
          const s = songs[i]
          const isActive = cur?.id === t.id && playing
          return (
            <div
              key={t.id || i}
              className="tappable"
              onClick={() => playSong(i)}
              onPointerDown={onPointerDown(s, i)}
              onPointerUp={onPointerUp(i)}
              onPointerCancel={onPointerUp(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', background: isActive ? 'rgba(200,168,75,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', userSelect: 'none' }}
            >
              <div style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>
                {isActive ? <span style={{ color: 'var(--accent)', fontSize: 16 }}>♪</span> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>{i + 1}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                {t.artist && <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.artist}</div>}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={isActive ? 'var(--accent)' : 'var(--muted)'}><path d="M8 5v14l11-7z"/></svg>
            </div>
          )
        })}
        {allTracks.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>No tracks found</div>}
      </div>

      {menu && (
        <ContextMenu
          song={menu.song}
          queue={menu.queue}
          queueIndex={menu.idx}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}
