import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import EnlaceTransicion from '../components/EnlaceTransicion.jsx'
import { api } from '../api.js'
import ImagenProducto from '../components/ImagenProducto.jsx'
import { Cantidad, Vacio } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatoQ } from '../format.js'
import { useAgregarAlCarrito } from '../hooks.js'
import Icono from '../components/Iconos.jsx'

export default function Producto() {
  const { id } = useParams()
  const { state } = useLocation()
  // Si se llega desde una tarjeta, se muestra de inmediato con sus datos (así la imagen puede
  // "viajar" en la transición) y luego se actualiza con la respuesta del servidor.
  const previo = state?.producto?.id === Number(id) ? state.producto : undefined
  const [producto, setProducto] = useState(previo)
  const [cantidad, setCantidad] = useState(1)
  const { esAdmin } = useAuth()
  const { agregarProducto, agregando } = useAgregarAlCarrito()

  useEffect(() => {
    api
      .producto(id)
      .then((r) => setProducto(r.producto))
      .catch(() => setProducto(null))
  }, [id])

  if (producto === undefined)
    return (
      <div className="space-y-6" role="status" aria-label="Cargando producto">
        <div className="esqueleto h-9 w-44 rounded-full" />
        <div className="tarjeta grid gap-2 p-2 md:grid-cols-2 md:gap-6">
          <div className="esqueleto aspect-square w-full" />
          <div className="space-y-4 p-4 md:p-8">
            <div className="esqueleto h-3 w-20 rounded-full" />
            <div className="esqueleto h-9 w-4/5 rounded-full" />
            <div className="esqueleto h-6 w-28 rounded-full" />
            <div className="esqueleto h-16 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    )
  if (producto === null)
    return (
      <Vacio titulo="Producto no disponible" accion={<Link to="/" className="btn-primario">Volver al catálogo</Link>}>
        Es posible que ya no esté a la venta.
      </Vacio>
    )

  return (
    <div className="space-y-6">
      <EnlaceTransicion to="/" className="btn-texto -ml-3">
        <Icono nombre="flechaAtras" className="h-4 w-4" />Volver al catálogo
      </EnlaceTransicion>
      <div className="tarjeta grid gap-2 p-2 md:grid-cols-2 md:gap-6">
        <ImagenProducto producto={producto} className="aspect-square w-full rounded-imagen" nombreTransicion={`producto-${producto.id}`} />
        <div className="flex flex-col gap-4 p-4 md:p-8">
          <span className="text-sm text-gris">{producto.categoria}</span>
          <h1 className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{producto.nombre}</h1>
          <p className="text-2xl font-semibold tracking-[-0.03em]">{formatoQ(producto.precio)}</p>
          <p className="leading-relaxed text-slate-600">{producto.descripcion}</p>
          <p className={`inline-flex items-center gap-2 text-sm ${producto.stock === 0 ? 'text-red-600' : 'text-gris'}`}>
            <span className={`h-2 w-2 rounded-full ${producto.stock === 0 ? 'bg-red-500' : 'bg-emerald-500'}`} aria-hidden="true" />
            {producto.stock === 0 ? 'Agotado' : `${producto.stock} unidades disponibles`}
          </p>
          {!esAdmin && producto.stock > 0 && (
            <div className="mt-auto flex flex-wrap items-center gap-3">
              <Cantidad valor={cantidad} max={producto.stock} onCambiar={setCantidad} />
              <button
                className="btn-primario flex-1 py-3"
                disabled={agregando === producto.id}
                onClick={() => agregarProducto(producto, cantidad)}
              >
                Agregar al carrito
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
