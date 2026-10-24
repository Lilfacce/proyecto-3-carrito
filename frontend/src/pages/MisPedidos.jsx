import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { Alerta, EstadoBadge, Spinner, Vacio } from '../components/ui.jsx'
import { formatoFecha, formatoQ } from '../format.js'

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.misPedidos().then((r) => setPedidos(r.pedidos)).catch((e) => setError(e.message))
  }, [])

  if (error) return <Alerta>{error}</Alerta>
  if (!pedidos) return <Spinner />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mis pedidos</h1>
      {pedidos.length === 0 ? (
        <Vacio titulo="Aún no tienes pedidos" accion={<Link to="/" className="btn-primario">Ir a comprar</Link>} />
      ) : (
        <ul className="space-y-3">
          {pedidos.map((p) => (
            <li key={p.id}>
              <Link to={`/mis-pedidos/${p.id}`} className="tarjeta flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-marca-500">
                <div>
                  <p className="font-semibold">Pedido #{p.id}</p>
                  <p className="text-sm text-slate-500">
                    {formatoFecha(p.fecha)} · {p.unidades} {p.unidades === 1 ? 'producto' : 'productos'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <EstadoBadge estado={p.estado} />
                  <span className="font-bold">{formatoQ(p.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
