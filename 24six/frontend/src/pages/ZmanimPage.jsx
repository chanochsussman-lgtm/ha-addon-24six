import React, { useState, useEffect } from 'react'
import { useQuery } from 'react-query'

const ZMAN_LABELS = {
  alotHaShachar: 'Alot HaShachar (Dawn)',
  misheyakir: "Misheyakir (Earliest Tallit)",
  sunrise: 'Sunrise (Netz)',
  sofZmanShmaMGA: 'Sof Zman Shma (MGA)',
  sofZmanShma: 'Sof Zman Shma (GRA)',
  sofZmanTfillaMGA: 'Sof Zman Tfilla (MGA)',
  sofZmanTfilla: 'Sof Zman Tfilla (GRA)',
  chatzot: 'Chatzot (Midday)',
  minchaGedola: 'Mincha Gedola',
  minchaKetana: 'Mincha Ketana',
  plagHaMincha: 'Plag HaMincha',
  sunset: 'Shkia (Sunset)',
  bainHaShmashos: 'Bein HaShmashot',
  tzeit7083deg: 'Tzet HaKochavim',
  tzeit85deg: "Tzeit R'T (Stringent)",
  candleLighting: 'Candle Lighting 🕯️',
  havdalah: 'Havdalah ✨',
}

function formatTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch { return '—' }
}

function isNow(iso, nextIso) {
  if (!iso) return false
  const now = Date.now()
  const t = new Date(iso).getTime()
  const n = nextIso ? new Date(nextIso).getTime() : t + 3600000
  return now >= t && now < n
}

export default function ZmanimPage() {
  const [location, setLocation] = useState(null)
  const [locError, setLocError] = useState(null)
  const [city, setCity] = useState('')

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocError('Location access denied. Enter city manually.')
      )
    } else {
      setLocError('Geolocation not supported.')
    }
  }, [])

  const { data, isLoading, refetch } = useQuery(
    ['zmanim', location?.lat, location?.lng, city],
    async () => {
      const params = location
        ? `lat=${location.lat}&lng=${location.lng}`
        : `city=${encodeURIComponent(city)}`
      const r = await fetch(`/api/zmanim?${params}`)
      return r.json()
    },
    { enabled: !!(location || city), staleTime: 3600000 }
  )

  const zmanim = data?.times || {}
  const date = data?.date || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const hebrewDate = data?.hebrew
  const parasha = data?.parasha
  const isShabbat = data?.isShabbat
  const zmanimKeys = Object.keys(ZMAN_LABELS).filter(k => zmanim[k])

  return (
    <div className="pt-8 pb-6 fade-in">
      {/* Header */}
      <div className="px-6 mb-6">
        <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text)' }}>Zmanim</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{date}</p>
        {hebrewDate && <p className="text-sm mt-0.5" style={{ color: 'var(--accent)' }}>{hebrewDate}</p>}
        {parasha && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Parshat {parasha}</p>}
        {isShabbat && (
          <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: 'rgba(200,168,75,0.15)', color: 'var(--accent)' }}>
            🕯️ Shabbat
          </div>
        )}
      </div>

      {/* Manual city input if no location */}
      {locError && (
        <div className="px-6 mb-6">
          <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>{locError}</p>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="City name (e.g. New York)"
              value={city}
              onChange={e => setCity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && refetch()}
            />
            <button
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#0d0d0f' }}
              onClick={() => refetch()}
            >Search</button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="px-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="h-3.5 w-40 rounded shimmer" />
              <div className="h-3.5 w-16 rounded shimmer" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && zmanimKeys.length > 0 && (
        <div className="mx-6 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {zmanimKeys.map((key, i) => {
            const nextKey = zmanimKeys[i + 1]
            const active = isNow(zmanim[key], zmanim[nextKey])
            return (
              <div
                key={key}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background: active ? 'rgba(200,168,75,0.12)' : i % 2 === 0 ? 'var(--surface)' : 'var(--card)',
                  borderBottom: i < zmanimKeys.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div className="flex items-center gap-2">
                  {active && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}
                  <span className={`text-sm ${active ? 'font-semibold' : 'font-normal'}`}
                    style={{ color: active ? 'var(--text)' : 'var(--text-secondary)' }}>
                    {ZMAN_LABELS[key]}
                  </span>
                </div>
                <span className="text-sm tabular-nums font-medium"
                  style={{ color: active ? 'var(--accent)' : 'var(--text)' }}>
                  {formatTime(zmanim[key])}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {!isLoading && !zmanimKeys.length && !locError && (
        <p className="px-6 text-sm" style={{ color: 'var(--muted)' }}>Waiting for location…</p>
      )}
    </div>
  )
}
