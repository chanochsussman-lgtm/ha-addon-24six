import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';

function normalize(d) {
  return Array.isArray(d) ? d : (d?.content || d?.data || d?.songs || []);
}

export default function Library() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useStore();

  useEffect(() => {
    api.favorites()
      .then(d => { setSongs(normalize(d)); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted text-sm">Loading...</div>;

  const withUrls = songs.map(s => ({ ...s, url: api.audioUrl(s.id) }));

  return (
    <div className="p-6">
      <h1 className="text-text text-2xl font-bold mb-6">Library</h1>
      {withUrls.length === 0 ? (
        <div className="text-muted text-center py-16 text-sm">No favorites yet</div>
      ) : (
        <div className="space-y-1">
          {withUrls.map((s, i) => (
            <div
              key={s.id || i}
              onClick={() => playTrack(s, withUrls, i)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-card cursor-pointer transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-card flex-shrink-0">
                {s.img
                  ? <img src={s.img} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center text-muted">♪</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text text-sm truncate">{s.title || s.name}</p>
                {s.artist_name && <p className="text-text-secondary text-xs truncate">{s.artist_name}</p>}
              </div>
              <span className="text-accent text-sm opacity-0 group-hover:opacity-100 transition-opacity">▶</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
