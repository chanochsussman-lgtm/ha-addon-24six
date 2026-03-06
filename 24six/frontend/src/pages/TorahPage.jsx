import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { api, getArtwork, getSongTitle, getArtistName } from '../api'
import { AlbumCard, CardSkeleton } from '../components/Cards'
import SongRow, { SongRowSkeleton } from '../components/SongRow'

const TABS = ['All', 'Daf Yomi', 'Parsha', 'Shiurim', 'Series']

export default function TorahPage() {
  const [tab, setTab] = useState('All')
  const navigate = useNavigate()

  const { data: homeData, isLoading: loadingHome } = useQuery('torahHome', () =>
    fetch('/api/torah/home').then(r => r.json())
  )
  const { data: dafData, isLoading: loadingDaf } = useQuery('dafYomi', () =>
    fetch('/api/torah/daf-yomi').then(r => r.json()),
    { enabled: tab === 'Daf Yomi' || tab === 'All' }
  )
  const { data: parshaData, isLoading: loadingParsha } = useQuery('parsha', () =>
    fetch('/api/torah/parsha').then(r => r.json()),
    { enabled: tab === 'Parsha' || tab === 'All' }
  )
  const { data: shiurimData, isLoading: loadingShiurim } = useQuery('shiurim', () =>
    fetch('/api/torah/shiurim').then(r => r.json()),
    { enabled: tab === 'Shiurim' || tab === 'All' }
  )

  const sections = homeData?.sections || homeData?.data || []
  const dafItems = dafData?.data || dafData?.items || dafData || []
  const parshaItems = parshaData?.data || parshaData?.items || parshaData || []
  const shiurimItems = shiurimData?.data || shiurimData?.items || shiurimData || []

  return (
    <div className="pt-8 pb-6 fade-in">
      <div className="px-6 mb-5">
        <h1 className="font-display text-3xl" style={{ color: 'var(--text)' }}>Torah</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={{
              background: tab === t ? 'var(--accent)' : 'var(--card)',
              color: tab === t ? '#0d0d0f' : 'var(--text-secondary)',
            }}
          >{t}</button>
        ))}
      </div>

      {/* All / Home view */}
      {tab === 'All' && (
        <>
          {/* Daf Yomi section */}
          <div className="mb-6">
            <div className="flex items-center justify-between px-6 mb-3">
              <h2 className="font-display text-xl" style={{ color: 'var(--text)' }}>Daf Yomi</h2>
              <button className="text-sm" style={{ color: 'var(--accent)' }} onClick={() => setTab('Daf Yomi')}>See all</button>
            </div>
            {loadingDaf
              ? <div className="flex gap-4 px-6">{Array.from({length:4}).map((_,i)=><CardSkeleton key={i}/>)}</div>
              : <div className="flex gap-4 px-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                  {dafItems.slice(0, 8).map((item, i) => <AlbumCard key={item.id || i} item={item} />)}
                </div>
            }
          </div>

          {/* Parsha section */}
          <div className="mb-6">
            <div className="flex items-center justify-between px-6 mb-3">
              <h2 className="font-display text-xl" style={{ color: 'var(--text)' }}>Parsha</h2>
              <button className="text-sm" style={{ color: 'var(--accent)' }} onClick={() => setTab('Parsha')}>See all</button>
            </div>
            {loadingParsha
              ? <div className="flex gap-4 px-6">{Array.from({length:4}).map((_,i)=><CardSkeleton key={i}/>)}</div>
              : <div className="flex gap-4 px-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                  {parshaItems.slice(0, 8).map((item, i) => <AlbumCard key={item.id || i} item={item} />)}
                </div>
            }
          </div>

          {/* Shiurim */}
          <div className="mb-6">
            <div className="flex items-center justify-between px-6 mb-3">
              <h2 className="font-display text-xl" style={{ color: 'var(--text)' }}>Shiurim</h2>
              <button className="text-sm" style={{ color: 'var(--accent)' }} onClick={() => setTab('Shiurim')}>See all</button>
            </div>
            {loadingShiurim
              ? <SongRowSkeleton count={5} />
              : shiurimItems.slice(0, 10).map((song, i) => (
                  <SongRow key={song.id || i} song={song} index={i} queue={shiurimItems} showIndex />
                ))
            }
          </div>
        </>
      )}

      {/* Daf Yomi tab */}
      {tab === 'Daf Yomi' && (
        <div className="px-6">
          {loadingDaf
            ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({length:8}).map((_,i)=><CardSkeleton key={i}/>)}</div>
            : <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {dafItems.map((item, i) => <AlbumCard key={item.id || i} item={item} />)}
              </div>
          }
          {!loadingDaf && !dafItems.length && <p className="text-sm" style={{color:'var(--muted)'}}>No Daf Yomi content available.</p>}
        </div>
      )}

      {/* Parsha tab */}
      {tab === 'Parsha' && (
        <div className="px-6">
          {loadingParsha
            ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({length:8}).map((_,i)=><CardSkeleton key={i}/>)}</div>
            : <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {parshaItems.map((item, i) => <AlbumCard key={item.id || i} item={item} />)}
              </div>
          }
          {!loadingParsha && !parshaItems.length && <p className="text-sm" style={{color:'var(--muted)'}}>No Parsha content available.</p>}
        </div>
      )}

      {/* Shiurim tab */}
      {tab === 'Shiurim' && (
        <div>
          {loadingShiurim
            ? <SongRowSkeleton count={8} />
            : shiurimItems.map((song, i) => (
                <SongRow key={song.id || i} song={song} index={i} queue={shiurimItems} showIndex />
              ))
          }
          {!loadingShiurim && !shiurimItems.length && <p className="px-6 text-sm" style={{color:'var(--muted)'}}>No shiurim available.</p>}
        </div>
      )}
    </div>
  )
}
