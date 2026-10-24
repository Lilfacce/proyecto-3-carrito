import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import ImagenProducto from '../components/ImagenProducto.jsx'
import { Cantidad, Spinner, Vacio } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatoQ } from '../format.js'
import { useAgregarAlCarrito } from '../hooks.js'

export default function Producto() {
  const { id } = useParams()
  const [producto, setProducto] = useState(undefined)
  const [cantidad, setCantidad] = useState(1)
  const { esAdmin } = useAuth()
  const { agregarProducto, agregando } = useAgregarAlCarrito()

  useEffect(() => {
    api
      .producto(id)
      .then((r) => setProducto(r.producto))
      .catch(() => setProducto(null))
  }, [id])

  if (producto === undefined) return <Spinner />
  if (producto === null)
    return (
      <Vacio titulo="Producto no disponible" accion={<Link to="/" className="btn-primario">Volver al catálogo</Link>}>
        Es posible que ya no esté a la venta.
      </Vacio>
    )

  return (
    <div className="space-y-4">
      <Link to="/" className="btn-texto -ml-2">
        ← Volver al catálogo
      </Link>
      <div className="tarjeta grid gap-6 overflow-hidden md:grid-cols-2">
        <ImagenProducto producto={producto} className="aspect-square w-full" />
        <div className="flex flex-col gap-4 p-5 md:p-8">
          <span className="text-sm font-medium text-marca-600">{producto.categoria}</span>
          <h1 className="text-2xl font-bold sm:text-3xl">{producto.nombre}</h1>
          <p className="text-3xl font-bold text-slate-900">{formatoQ(producto.precio)}</p>
          <p className="leading-relaxed text-slate-600">{producto.descripcion}</p>
          <p className={`text-sm font-medium ${producto.stock === 0 ? 'text-red-600' : 'text-emerald-700'}`}>
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
