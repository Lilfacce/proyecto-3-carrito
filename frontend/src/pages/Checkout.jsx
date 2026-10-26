import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { Alerta, Spinner } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { formatoQ } from '../format.js'
import Icono from '../components/Iconos.jsx'

// Formatea mientras se escribe: "4242424242424242" -> "4242 4242 4242 4242"
const formatearNumero = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ')
const formatearVencimiento = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

export default function Checkout() {
  const { usuario } = useAuth()
  const { items, total, unidades, listo, recargar } = useCart()
  const navigate = useNavigate()
  const [metodo, setMetodo] = useState('tarjeta')
  const [direccion, setDireccion] = useState(usuario?.direccion ?? '')
  const [tarjeta, setTarjeta] = useState({ numero: '', titular: '', vencimiento: '', cvv: '' })
  const [error, setError] = useState('')
  const [problemas, setProblemas] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (!listo) return <Spinner />
  if (items.length === 0 && !enviando) return <Navigate to="/carrito" replace />

  const confirmar = async (e) => {
    e.preventDefault()
    setError('')
    setProblemas(null)
    setEnviando(true)
    try {
      const datos = { metodo, direccion_entrega: direccion }
      if (metodo === 'tarjeta') datos.tarjeta = tarjeta
      const { pedido } = await api.confirmarCompra(datos)
      // Se limpian los datos de la tarjeta de la memoria del componente.
      setTarjeta({ numero: '', titular: '', vencimiento: '', cvv: '' })
      await recargar()
      navigate(`/mis-pedidos/${pedido.id}`, { replace: true, state: { nuevo: true } })
    } catch (err) {
      setError(err.message)
      if (err.status === 409) setProblemas(err.details)
      setEnviando(false)
    }
  }

  const campoTarjeta = (k, formato = (v) => v) => ({
    value: tarjeta[k],
    onChange: (e) => setTarjeta({ ...tarjeta, [k]: formato(e.target.value) }),
  })

  return (
    <form onSubmit={confirmar} className="space-y-6">
      <div className="space-y-2">
        <Link to="/carrito" className="btn-texto -ml-3"><Icono nombre="flechaAtras" className="h-4 w-4" />Volver al carrito</Link>
        <h1 className="text-3xl font-semibold tracking-[-0.05em]">Finalizar compra</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="tarjeta space-y-3 p-6">
            <h2 className="font-semibold">1. Dirección de entrega</h2>
            <textarea
              className="input min-h-20"
              required
              minLength={5}
              placeholder="Calle, número, zona, ciudad"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              aria-label="Dirección de entrega"
            />
          </section>

          <section className="tarjeta space-y-4 p-6">
            <h2 className="font-semibold">2. Método de pago</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['tarjeta', 'Tarjeta de crédito/débito', 'Pago inmediato (simulado)'],
                ['contra_entrega', 'Pago contra entrega', 'Pagas en efectivo al recibir'],
              ].map(([valor, titulo, desc]) => (
                <label
                  key={valor}
                  className={`flex cursor-pointer gap-3 rounded-2xl border p-3 ${
                    metodo === valor ? 'border-tinta bg-canvas ring-1 ring-tinta' : 'border-borde'
                  }`}
                >
                  <input type="radio" name="metodo" value={valor} checked={metodo === valor} onChange={() => setMetodo(valor)} className="mt-1 accent-marca-600" />
                  <span>
                    <span className="block text-sm font-semibold">{titulo}</span>
                    <span className="text-xs text-slate-500">{desc}</span>
                  </span>
                </label>
              ))}
            </div>

            {metodo === 'tarjeta' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Alerta tipo="info">
                    <strong>Pago simulado.</strong> No uses una tarjeta real. Prueba con <code>4242 4242 4242 4242</code>{' '}
                    (aprobada) o <code>4000 0000 0000 0002</code> (rechazada), cualquier fecha futura y CVV.
                  </Alerta>
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="numero">Número de tarjeta</label>
                  <input id="numero" className="input tabular-nums tracking-wider" inputMode="numeric" autoComplete="off" required placeholder="0000 0000 0000 0000" {...campoTarjeta('numero', formatearNumero)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="titular">Nombre del titular</label>
                  <input id="titular" className="input" autoComplete="off" required {...campoTarjeta('titular')} />
                </div>
                <div>
                  <label className="label" htmlFor="vencimiento">Vencimiento (MM/AA)</label>
                  <input id="vencimiento" className="input tabular-nums" inputMode="numeric" autoComplete="off" required placeholder="MM/AA" {...campoTarjeta('vencimiento', formatearVencimiento)} />
                </div>
                <div>
                  <label className="label" htmlFor="cvv">CVV</label>
                  <input id="cvv" type="password" className="input tabular-nums" inputMode="numeric" autoComplete="off" required maxLength={4} placeholder="•••" {...campoTarjeta('cvv', (v) => v.replace(/\D/g, ''))} />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-slate-500 sm:col-span-2">
                  <Icono nombre="candado" className="h-4 w-4 shrink-0" /> Solo guardamos los últimos 4 dígitos. El número completo y el CVV nunca se almacenan.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="tarjeta h-fit space-y-4 p-6 lg:sticky lg:top-24">
          <h2 className="font-semibold">Tu pedido ({unidades})</h2>
          <ul className="space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.producto_id} className="flex justify-between gap-3">
                <span className="text-slate-600">
                  {i.cantidad} × {i.nombre}
                </span>
                <span className="shrink-0">{formatoQ(i.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-borde pt-3 text-lg font-semibold">
            <span>Total</span>
            <span>{formatoQ(total)}</span>
          </div>
          <Alerta>{error}</Alerta>
          {problemas && (
            <ul className="space-y-1 text-xs text-red-700">
              {problemas.map((p) => (
                <li key={p.producto_id}>
                  {p.nombre}: pediste {p.solicitado}, hay {p.disponible}.
                </li>
              ))}
              <li>
                <Link to="/carrito" className="font-semibold underline">Ajustar carrito</Link>
              </li>
            </ul>
          )}
          <button className="btn-primario w-full py-3" disabled={enviando}>
            {enviando ? 'Procesando pago…' : `Confirmar compra · ${formatoQ(total)}`}
          </button>
          <p className="text-center text-xs text-gris">El total final lo calcula el servidor con los precios vigentes.</p>
        </aside>
      </div>
    </form>
  )
}
