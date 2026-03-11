import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { api } from '../api';

export default function Card({ item, type, queue, index }) {
  const navigate = useNavigate();
  const { playTrack } = useStore();

  const img = item.img || item.image || item.artwork || item.cover;
  const title = item.title || item.name;
  const sub = item.artist_name || item.artist || item.description || '';

  function handleClick() {
    if (type === 'content') {
      const withUrl = { ...item, url: api.audioUrl(item.id) };
      const q = (queue || [item]).map(x => ({ ...x, url: api.audioUrl(x.id) }));
      playTrack(withUrl, q, index ?? 0);
    } else if (type === 'collection') {
      navigate(`/album/${item.id}`);
    } else if (type === 'artist') {
      navigate(`/artist/${item.id}`);
    } else if (type === 'playlist') {
      navigate(`/playlist/${item.id}`);
    }
  }

  return (
    <div onClick={handleClick} className="flex-shrink-0 w-36 cursor-pointer group">
      <div className="relative w-36 h-36 rounded-xl overflow-hidden bg-card mb-2">
        {img
          ? <img src={img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-3xl text-muted">♪</div>
        }
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-accent text-bg rounded-full w-10 h-10 flex items-center justify-center text-base font-bold">▶</div>
        </div>
      </div>
      <p className="text-text text-xs font-medium truncate">{title}</p>
      {sub && <p className="text-text-secondary text-xs truncate mt-0.5">{sub}</p>}
    </div>
  );
}
