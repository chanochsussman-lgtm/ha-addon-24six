import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Artist() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { api.artist(id).then(setData); }, [id]);

  if (!data) return <div className="flex items-center justify-center h-64 text-muted text-sm">Loading...</div>;

  const artist = data.artist || data.data || data;
  const collections = data.collections || data.albums || [];
  const img = artist.img || artist.image;

  return (
    <div className="p-6">
      <div className="flex gap-6 mb-8">
        <div className="w-40 h-40 rounded-full overflow-hidden bg-card flex-shrink-0">
          {img
            ? <img src={img} className="w-full h-full object-cover" alt={artist.name} />
            : <div className="w-full h-full flex items-center justify-center text-4xl text-muted">♪</div>
          }
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Artist</p>
          <h1 className="text-text text-2xl font-bold">{artist.name}</h1>
          {artist.collection_count != null && (
            <p className="text-text-secondary mt-1 text-sm">{artist.collection_count} albums</p>
          )}
        </div>
      </div>

      {collections.length > 0 && (
        <>
          <h2 className="text-text font-semibold mb-4">Albums</h2>
          <div className="grid grid-cols-3 gap-4">
            {collections.map((c, i) => (
              <div key={c.id || i} onClick={() => navigate(`/album/${c.id}`)} className="cursor-pointer group">
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-card mb-2">
                  {c.img
                    ? <img src={c.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={c.title} />
                    : <div className="w-full h-full flex items-center justify-center text-muted">♪</div>
                  }
                </div>
                <p className="text-text text-sm truncate">{c.title || c.name}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
