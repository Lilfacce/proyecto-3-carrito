import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ImagenProducto from '../components/ImagenProducto.jsx'
import { Alerta, Cantidad, Confirmar, Spinner, Vacio } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { formatoQ } from '../format.js'

export default function Carrito() {
  const { usuario, cargando: cargandoSesion } = useAuth()
  const { items, total, unidades, listo, cambiar, quitar, vaciar } = useCart()
  const notificar = useToast()
  const navigate = useNavigate()
  const [ocupado, setOcupado] = useState(null)
  const [confirmarVaciar, setConfirmarVaciar] = useState(false)

  if (cargandoSesion) return <Spinner />
  if (!usuario)
    return (
      <Vacio
        titulo="Inicia sesión para ver tu carrito"
        accion={
          <Link to="/login" state={{ desde: '/carrito' }} className="btn-primario">
            Iniciar sesión
          </Link>
        }
      >
        Tu carrito se guarda en tu cuenta para que no lo pierdas.
      </Vacio>
    )
  if (!listo) return <Spinner />
  if (items.length === 0)
    return (
      <Vacio titulo="Tu carrito está vacío" accion={<Link to="/" className="btn-primario">Ver productos</Link>}>
        Explora el catálogo y agrega lo que te guste.
      </Vacio>
    )

  const ejecutar = async (id, accion) => {
    setOcupado(id)
    try {
      await accion()
    } catch (err) {
      notificar(err.message, 'error')
    } finally {
      setOcupado(null)
    }
  }

  const hayProblemas = items.some((i) => i.sin_stock)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tu carrito</h1>
        <button className="btn-texto text-red-600 hover:bg-red-50" onClick={() => setConfirmarVaciar(true)}>
          Vaciar carrito
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="tarjeta divide-y divide-slate-100">
          {items.map((i) => (
            <li key={i.producto_id} className="flex gap-3 p-4 sm:gap-4">
              <Link to={`/productos/${i.producto_id}`} className="shrink-0">
                <ImagenProducto
                  producto={{ id: i.producto_id, nombre: i.nombre, imagen: i.imagen, categoria: i.categoria }}
                  className="h-20 w-20 rounded-lg sm:h-24 sm:w-24 [&_span]:text-3xl"
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/productos/${i.producto_id}`} className="line-clamp-2 font-semibold hover:text-marca-700">
                      {i.nombre}
                    </Link>
                    <p className="text-sm text-slate-500">{formatoQ(i.precio)} c/u</p>
                  </div>
                  <p className="shrink-0 font-bold">{formatoQ(i.subtotal)}</p>
                </div>
                {i.sin_stock && (
                  <p className="text-xs font-medium text-red-600">Solo quedan {i.stock} unidades. Ajusta la cantidad.</p>
                )}
                <div className="mt-auto flex items-center justify-between">
                  <Cantidad
                    valor={i.cantidad}
                    max={Math.max(i.stock, i.cantidad)}
                    deshabilitado={ocupado === i.producto_id}
                    onCambiar={(n) => ejecutar(i.producto_id, () => cambiar(i.producto_id, n))}
                  />
                  <button
                    className="btn-texto text-sm text-red-600 hover:bg-red-50"
                    disabled={ocupado === i.producto_id}
                    onClick={() => ejecutar(i.producto_id, () => quitar(i.producto_id))}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="tarjeta h-fit space-y-4 p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold">Resumen</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Productos ({unidades})</dt>
              <dd>{formatoQ(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Envío</dt>
              <dd className="text-emerald-600">Gratis</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatoQ(total)}</dd>
            </div>
          </dl>
          {hayProblemas && <Alerta tipo="aviso">Algunos productos superan el stock disponible.</Alerta>}
          <button className="btn-primario w-full py-3" disabled={hayProblemas} onClick={() => navigate('/checkout')}>
            Continuar con la compra
          </button>
          <Link to="/" className="btn-texto w-full">
            Seguir comprando
          </Link>
        </aside>
      </div>

      <Confirmar
        abierto={confirmarVaciar}
        titulo="Vaciar carrito"
        mensaje="¿Seguro que quieres quitar todos los productos del carrito?"
        textoBoton="Vaciar"
        peligro
        onCerrar={() => setConfirmarVaciar(false)}
        onConfirmar={() => {
          setConfirmarVaciar(false)
          ejecutar('todo', vaciar)
        }}
      />
    </div>
  )
}
