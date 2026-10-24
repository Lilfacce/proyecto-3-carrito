import { useState } from 'react'

const ICONOS = {
  Audio: '🎧',
  Computación: '💻',
  Almacenamiento: '💾',
  Accesorios: '🔌',
  Wearables: '⌚',
}
const FONDOS = [
  'from-sky-100 to-indigo-200',
  'from-emerald-100 to-teal-200',
  'from-amber-100 to-orange-200',
  'from-rose-100 to-pink-200',
  'from-violet-100 to-purple-200',
]

/** Muestra la imagen del producto o, si no tiene, un marcador con el ícono de su categoría. */
export default function ImagenProducto({ producto, className = '' }) {
  const [fallo, setFallo] = useState(false)
  if (producto.imagen && !fallo) {
    return (
      <img
        src={producto.imagen}
        alt={producto.nombre}
        loading="lazy"
        onError={() => setFallo(true)}
        className={`object-cover ${className}`}
      />
    )
  }
  const fondo = FONDOS[producto.id % FONDOS.length] ?? FONDOS[0]
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${fondo} ${className}`} aria-hidden="true">
      <span className="text-5xl">{ICONOS[producto.categoria] ?? '📦'}</span>
    </div>
  )
}
