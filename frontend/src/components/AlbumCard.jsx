import { useNavigate } from 'react-router-dom'

export default function AlbumCard({ item, onClick }) {
  const navigate = useNavigate()

  function handleClick() {
    if (onClick) { onClick(item); return }
    if (item.type === 'collection') navigate(`/collection/${item.id}`)
    else if (item.type === 'artist') navigate(`/artist/${item.id}`)
  }

  return (
    <div className="album-card" onClick={handleClick}>
      <img
        src={item.img}
        alt={item.title}
        loading="lazy"
        onError={(e) => { e.target.style.background = 'var(--card)'; e.target.src = '' }}
      />
      <div className="title">{item.title}</div>
      <div className="subtitle">{item.subtitle}</div>
    </div>
  )
}
