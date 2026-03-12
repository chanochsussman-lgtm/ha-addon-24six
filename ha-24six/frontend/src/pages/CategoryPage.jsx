import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { normItem } from '../extract.js'
import SectionRow from '../components/SectionRow'

export default function CategoryPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [title, setTitle] = useState('')
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.category(id).catch(() => null).then(d => {
      if (!d) { setLoading(false); return }
      console.log('[Category] keys:', Object.keys(d))

      // Title from category metadata
      const cat = d.category || d
      setTitle(cat.title || cat.name || 'Category')

      // Build sections from all array keys
      const secs = []
      Object.entries(d).forEach(([k, v]) => {
        if (!Array.isArray(v) || !v.length || !v[0]?.id) return
        if (k === 'category') return
        const sample = v[0]
        const looksLikeArtist = !!(sample.name && !sample.title)
        const type = looksLikeArtist ? 'artist' : 'collection'
        const label = k.replace(/([A-Z0-9]+)/g, ' $1').replace(/^./, c => c.toUpperCase()).trim()
        secs.push({ title: label, items: v.map(i => normItem(i, type)).filter(Boolean) })
      })
      setSections(secs)
      setLoading(false)
    })
  }, [id])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ width:28, height:28, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 16px 10px' }}>
        <button onClick={() => nav(-1)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', fontSize:20, padding:0, lineHeight:1 }}>‹</button>
        <div style={{ fontSize:20, fontWeight:700, color:'var(--text)' }}>{title}</div>
      </div>
      {sections.length === 0 && (
        <div style={{ padding:32, color:'var(--muted)', textAlign:'center', fontSize:13 }}>No content found</div>
      )}
      {sections.map(({ title, items }) => (
        <SectionRow key={title} title={title} items={items} cardSize={130} />
      ))}
      <div style={{ height:16 }} />
    </div>
  )
}
