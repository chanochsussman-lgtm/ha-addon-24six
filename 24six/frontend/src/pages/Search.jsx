import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useStore } from '../store';

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export default function Search() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const { playTrack } = useStore();
  const navigate = useNavigate();

  const doSearch = useCallback(debounce(async (query) => {
    if (!query.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const d = await api.search(query);
      setResults(d.results || d);
    } finally { setLoading(false); }
  }, 400), []);

  function handleChange(e) { setQ(e.target.value); doSearch(e.target.value); }

  function clickResult(item) {
    if (item.type === 'content') playTrack({ ...item, url: api.audioUrl(item.id) }, [item], 0);
    else if (item.type === 'collection') navigate(`/album/${item.id}`);
    else if (item.type === 'artist') navigate(`/artist/${item.id}`);
    else if (item.type === 'playlist') navigate(`/playlist/${item.id}`);
  }

  // Normalize: API may return flat array or {artists, collections, content}
  const flat = results ? (Array.isArray(results) ? results : [
    ...(results.artists || []).map(x => ({ ...x, type: 'artist' })),
    ...(results.collections || []).map(x => ({ ...x, type: 'collection' })),
    ...(results.content || results.tracks || []).map(x => ({ ...x, type: 'content' })),
  ]) : [];

  return (
    <div className="p-6">
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-lg">⌕</span>
        <input
          className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
          placeholder="Search songs, albums, artists..."
          value={q} onChange={handleChange}
          autoFocus
        />
      </div>

      {loading && <div className="text-muted text-center py-8 text-sm">Searching...</div>}

      <div className="space-y-1">
        {flat.map((item, i) => {
          const img = item.img || item.image;
          const title = item.title || item.name;
          const sub = item.artist_name || item.artist || '';
          return (
            <div
              key={item.id || i}
              onClick={() => clickResult(item)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-card cursor-pointer transition-colors"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-card flex-shrink-0">
                {img
                  ? <img src={img} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center text-muted text-sm">♪</div>
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-text text-sm font-medium truncate">{title}</p>
                {sub && <p className="text-text-secondary text-xs truncate">{sub}</p>}
              </div>
              <span className="text-muted text-xs capitalize flex-shrink-0">{item.type}</span>
            </div>
          );
        })}
      </div>

      {results && flat.length === 0 && !loading && (
        <div className="text-muted text-center py-8 text-sm">No results for "{q}"</div>
      )}
    </div>
  );
}
