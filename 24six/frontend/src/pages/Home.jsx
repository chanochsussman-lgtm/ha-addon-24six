import React from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { api, getArtwork } from '../api'
import { AlbumCard, ArtistCard, PlaylistCard, CardSkeleton } from '../components/Cards'
import SongRow from '../components/SongRow'

const SECTION_CONFIG = {
  yourTopSongs:    { label: 'Your Top Songs',    type: 'songs' },
  yourTopArtists:  { label: 'Your Top Artists',  type: 'artists' },
  trending:        { label: 'Trending',           type: 'albums' },
  trendingSongs:   { label: 'Trending Songs',     type: 'songs' },
  newAlbums:       { label: 'New Albums',         type: 'albums' },
  newSingles:      { label: 'New Singles',        type: 'albums' },
  newArtists:      { label: 'New Artists',        type: 'artists' },
  newStories:      { label: 'Stories',            type: 'stories', more: '/stories' },
  playlists:       { label: 'Featured Playlists', type: 'playlists' },
  myPlaylists:     { label: 'My Playlists',       type: 'playlists', more: '/library' },
  by24Six:         { label: 'By 24Six',           type: 'playlists' },
  popular:         { label: 'Popular',            type: 'albums' },
  newestTorah:     { label: 'Torah',              type: 'albums' },
  newestDafYomi:   { label: 'Daf Yomi',           type: 'albums' },
  recent:          { label: 'Recently Played',    type: 'songs',  more: '/recent' },
  rewind:          { label: 'Rewind',             type: 'albums', more: '/rewind' },
}

function extractItems(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data.data || data.items || data.results || data.songs || data.albums || data.artists || data.playlists || []
}

function SectionContent({ type, items }) {
  const navigate = useNavigate()

  if (!items?.length) return null

  if (type === 'songs') {
    return (
      <div className="px-6">
        {items.slice(0, 6).map((song, i) => (
          <SongRow key={song.id || i} song={song} index={i} queue={items} showIndex />
        ))}
      </div>
    )
  }

  if (type === 'artists') {
    return (
      <div className="flex gap-4 overflow-x-auto px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
        {items.slice(0, 12).map((item, i) => (
          <ArtistCard key={item.id || i} item={item} />
        ))}
      </div>
    )
  }

  if (type === 'playlists') {
    return (
      <div className="flex gap-4 overflow-x-auto px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
        {items.slice(0, 10).map((item, i) => (
          <PlaylistCard key={item.id || i} item={item} />
        ))}
      </div>
    )
  }

  if (type === 'stories') {
    return (
      <div className="flex gap-4 overflow-x-auto px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
        {items.slice(0, 10).map((item, i) => {
          const art = getArtwork(item, 80)
          return (
            <button
              key={item.id || i}
              className="flex-shrink-0 flex flex-col items-center gap-1.5"
              onClick={() => navigate('/stories')}
            >
              <div className="p-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, var(--accent), #e07b39)' }}>
                <div className="w-14 h-14 rounded-full overflow-hidden" style={{ background: 'var(--card)', padding: 2 }}>
                  {art
                    ? <img src={art} alt={item.title} className="w-full h-full rounded-full object-cover" />
                    : <div className="w-full h-full rounded-full flex items-center justify-center text-xl">🎵</div>
                  }
                </div>
              </div>
              <p className="text-xs truncate font-medium" style={{ color: 'var(--text)', maxWidth: 64 }}>
                {item.title || item.name}
              </p>
            </button>
          )
        })}
      </div>
    )
  }

  // albums / default
  return (
    <div className="flex gap-4 overflow-x-auto px-6 pb-2" style={{ scrollbarWidth: 'none' }}>
      {items.slice(0, 10).map((item, i) => (
        <AlbumCard key={item.id || i} item={item} />
      ))}
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { data: home, isLoading } = useQuery('home', api.home, { staleTime: 60000 })

  return (
    <div className="pt-8 pb-6 fade-in">
      <div className="px-6 mb-8">
        <h1 className="font-display text-3xl" style={{ color: 'var(--text)' }}>Good Music</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Enjoy Jewish music curated for you</p>
      </div>

      {isLoading ? (
        Object.entries(SECTION_CONFIG).slice(0, 4).map(([key]) => (
          <div key={key} className="mb-8">
            <div className="px-6 mb-3 h-5 w-32 rounded shimmer" />
            <div className="flex gap-4 px-6">
              <CardSkeleton count={5} />
            </div>
          </div>
        ))
      ) : (
        home && Object.entries(SECTION_CONFIG).map(([key, config]) => {
          const items = extractItems(home[key])
          if (!items.length) return null
          return (
            <div key={key} className="mb-8">
              <div className="flex items-center justify-between px-6 mb-3">
                <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>{config.label}</h2>
                {config.more && (
                  <button
                    className="text-xs font-medium hover:opacity-80"
                    style={{ color: 'var(--accent)' }}
                    onClick={() => navigate(config.more)}
                  >See all</button>
                )}
              </div>
              <SectionContent type={config.type} items={items} />
            </div>
          )
        })
      )}
    </div>
  )
}
