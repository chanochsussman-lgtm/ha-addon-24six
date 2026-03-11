import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useStore } from '../store';

function normalize(d) {
  return Array.isArray(d) ? d : (d?.content || d?.data || d?.songs || d?.tracks || []);
}

export default function Album() {
  const { id } = useParams();
  const [meta, setMeta] = useState(null);
  const [songs, setSongs] = useState([]);
  const { playTrack } = useStore();

  useEffect(() => {
    api.album(id).then(d => setMeta(d?.collection || d?.data || d));
    api.albumSongs(id).then(d => setSongs(normalize(d)));
  }, [id]);

  if (!meta) return <div className="flex items-center justify-center h-64 text-muted text-sm">Loading...</div>;

  const img = meta.img || meta.image;
  const withUrls = songs.map(s => ({ ...s, url: api.audioUrl(s.id) }));

  return (
    <div className="p-6">
      <div className="flex gap-6 mb-8">
        <div className="w-40 h-40 rounded-xl overflow-hidden bg-card flex-shrink-0">
          {img
            ? <img src={img} className="w-full h-full object-cover" alt={meta.title} />
            : <div className="w-full h-full flex items-center justify-center text-4xl text-muted">♪</div>
          }
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Album</p>
          <h1 className="text-text text-2xl font-bold mb-1">{meta.title || meta.name}</h1>
          {meta.artist_name && <p className="text-text-secondary">{meta.artist_name}</p>}
          <button
            onClick={() => withUrls.length && playTrack(withUrls[0], withUrls, 0)}
            className="mt-4 bg-accent hover:bg-accent-dim text-bg font-semibold rounded-full px-6 py-2 transition-colors w-fit text-sm"
          >▶ Play All</button>
        </div>
      </div>

      <div className="space-y-1">
        {withUrls.map((s, i) => (
          <div
            key={s.id || i}
            onClick={() => playTrack(s, withUrls, i)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-card cursor-pointer transition-colors group"
          >
            <span className="text-muted text-sm w-6 text-center group-hover:hidden">{i + 1}</span>
            <span className="text-accent text-sm hidden group-hover:block w-6 text-center">▶</span>
            <div className="flex-1 min-w-0">
              <p className="text-text text-sm truncate">{s.title || s.name}</p>
              {s.artist_name && <p className="text-text-secondary text-xs truncate">{s.artist_name}</p>}
            </div>
            {s.duration && (
              <span className="text-muted text-xs flex-shrink-0">
                {Math.floor(s.duration / 60)}:{String(s.duration % 60).padStart(2, '0')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
