import { formatoFecha, formatoQ } from '../format.js'
import { EstadoBadge } from './ui.jsx'
import ImagenProducto from './ImagenProducto.jsx'

const PASOS = ['pendiente', 'enviado', 'entregado']

export function LineaDeTiempo({ estado }) {
  if (estado === 'cancelado') {
    return <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">Este pedido fue cancelado.</p>
  }
  // "entregado" es el último paso: se marca como completado también.
  const actual = estado === 'entregado' ? PASOS.length : PASOS.indexOf(estado)
  return (
    <ol className="flex items-center">
      {PASOS.map((paso, i) => (
        <li key={paso} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                i <= actual ? 'bg-marca-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {i < actual ? '✓' : i + 1}
            </span>
            <span className={`text-xs capitalize ${i <= actual ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>{paso}</span>
          </div>
          {i < PASOS.length - 1 && <span className={`mx-2 mb-5 h-0.5 flex-1 ${i < actual ? 'bg-marca-600' : 'bg-slate-200'}`} />}
        </li>
      ))}
    </ol>
  )
}

const METODOS = { tarjeta: 'Tarjeta', contra_entrega: 'Contra entrega' }

export default function DetallePedido({ pedido, mostrarCliente = false }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Pedido #{pedido.id}</h2>
          <p className="text-sm text-slate-500">{formatoFecha(pedido.fecha)}</p>
        </div>
        <EstadoBadge estado={pedido.estado} />
      </div>

      <LineaDeTiempo estado={pedido.estado} />

      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {pedido.items.map((i) => (
          <li key={i.producto_id} className="flex items-center gap-3 p-3">
            <ImagenProducto
              producto={{ id: i.producto_id, nombre: i.nombre_producto, imagen: i.imagen, categoria: i.categoria }}
              className="h-12 w-12 shrink-0 rounded-md [&_span]:text-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{i.nombre_producto}</p>
              <p className="text-xs text-slate-500">
                {i.cantidad} × {formatoQ(i.precio_unitario)}
              </p>
            </div>
            <span className="text-sm font-semibold">{formatoQ(i.subtotal)}</span>
          </li>
        ))}
        <li className="flex justify-between p-3 font-bold">
          <span>Total</span>
          <span>{formatoQ(pedido.total)}</span>
        </li>
      </ul>

      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="mb-1 font-semibold">Entrega</p>
          {mostrarCliente && (
            <p className="text-slate-700">
              {pedido.cliente_nombre} · {pedido.cliente_email}
              {pedido.cliente_telefono && ` · ${pedido.cliente_telefono}`}
            </p>
          )}
          <p className="text-slate-600">{pedido.direccion_entrega}</p>
        </div>
        {pedido.pago && (
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="mb-1 font-semibold">Pago</p>
            <p className="text-slate-600">
              {METODOS[pedido.pago.metodo]}
              {pedido.pago.ultimos4 && ` · ${pedido.pago.marca} •••• ${pedido.pago.ultimos4}`}
            </p>
            <p className="text-slate-600">
              Estado: <span className="font-medium">{pedido.pago.estado}</span> · Ref. {pedido.pago.referencia}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
