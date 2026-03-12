import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../store/index.jsx'
import { api } from '../api'

export default function ContextMenu({ song, queue, queueIndex, onClose }) {
  const { playTrack, playNext, addToQueue } = usePlayer()
  const nav = useNavigate()
  const [favState, setFavState] = useState('idle') // idle | loading | done | error
  const imgUrl = song?.img ? api.imgUrl(song.img) : null

  // Close on backdrop tap
  useEffect(() => {
    const t = setTimeout(() => {
      const handler = (e) => {
        if (!e.target.closest('[data-ctxmenu]')) onClose()
      }
      document.addEventListener('pointerdown', handler)
      return () => document.removeEventListener('pointerdown', handler)
    }, 80)
    return () => clearTimeout(t)
  }, [onClose])

  if (!song) return null

  const doFavorite = async () => {
    setFavState('loading')
    try {
      await api.addFavorite(song.id)
      setFavState('done')
    } catch { setFavState('error') }
  }

  const actions = [
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--accent)"><path d="M8 5v14l11-7z"/></svg>,
      label: 'Play now',
      action: () => { playTrack(song, queue||[song], queueIndex||0); onClose() }
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>,
      label: 'Play next',
      action: () => { playNext(song); onClose() }
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
      label: 'Add to queue',
      action: () => { addToQueue(song); onClose() }
    },
    {
      icon: favState === 'done'
        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="#e05"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
      label: favState==='done' ? '♥ Favorited' : favState==='loading' ? 'Adding...' : favState==='error' ? 'Error — retry' : 'Add to favorites',
      action: favState==='idle'||favState==='error' ? doFavorite : null,
      noClose: true,
    },
    // Go to artist (if we have artist info)
    song.artistId || song.artist_id ? {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
      label: `Go to artist: ${song.artist}`,
      action: () => { nav(`/artist/${song.artistId||song.artist_id}`); onClose() }
    } : null,
    // Go to album
    song.collectionId || song.collection_id ? {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>,
      label: 'Go to album',
      action: () => { nav(`/collection/${song.collectionId||song.collection_id}`); onClose() }
    } : null,
  ].filter(Boolean)

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'flex-end' }}>
      <div data-ctxmenu="1"
        style={{ background:'var(--surface)', borderRadius:'20px 20px 0 0', width:'100%', paddingBottom:'max(28px,env(safe-area-inset-bottom))', animation:'slideUp 0.22s ease' }}>
        {/* Song info header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 20px 14px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ width:46, height:46, borderRadius:8, overflow:'hidden', background:'var(--card)', flexShrink:0 }}>
            {imgUrl
              ? <img src={imgUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🎵</div>
            }
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{song.title}</div>
            {song.artist && <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>{song.artist}</div>}
          </div>
        </div>

        {actions.map(({ icon, label, action, noClose }) => (
          <div key={label} className="tappable"
            onClick={() => { if (action) { action(); if (!noClose) {} } }}
            style={{ display:'flex', alignItems:'center', gap:16, padding:'15px 24px', cursor: action?'pointer':'default', fontSize:15, color: action?'var(--text)':'var(--muted)', opacity: action?1:0.5 }}>
            <span style={{ width:24, display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</span>
            {label}
          </div>
        ))}

        <div className="tappable" onClick={onClose}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'14px 24px', marginTop:4, cursor:'pointer', fontSize:15, color:'var(--muted)', borderTop:'1px solid var(--border)' }}>
          Cancel
        </div>
      </div>
    </div>
  )
}
