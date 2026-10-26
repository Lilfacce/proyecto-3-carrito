import { useState } from 'react'
import { IconoCategoria } from './Iconos.jsx'

/** Muestra la imagen del producto o, si no tiene, un marcador con el ícono de su categoría. */
export default function ImagenProducto({ producto, className = '', nombreTransicion }) {
  // Con nombre de transición, la imagen "viaja" entre páginas (View Transitions API).
  const estilo = nombreTransicion ? { viewTransitionName: nombreTransicion } : undefined
  const [fallo, setFallo] = useState(false)
  if (producto.imagen && !fallo) {
    return (
      <img
        src={producto.imagen}
        alt={producto.nombre}
        loading="lazy"
        onError={() => setFallo(true)}
        style={estilo}
        className={`bg-canvas object-cover ${className}`}
      />
    )
  }
  return (
    <div className={`@container flex items-center justify-center bg-canvas text-slate-400 ${className}`} style={estilo} aria-hidden="true">
      <IconoCategoria categoria={producto.categoria} className="h-[34cqw] max-h-28 w-[34cqw] max-w-28 min-w-5 min-h-5" grosor={1.2} />
    </div>
  )
}
