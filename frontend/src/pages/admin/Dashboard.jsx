import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api.js'
import { Alerta, EstadoBadge, Spinner } from '../../components/ui.jsx'
import { formatoFecha, formatoQ } from '../../format.js'

function Indicador({ titulo, valor, detalle }) {
  return (
    <div className="tarjeta p-4 sm:p-5">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{titulo}</p>
      <p className="mt-1 text-2xl font-bold sm:text-3xl">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
    </div>
  )
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

function GraficoVentas({ datos }) {
  const max = Math.max(...datos.map((d) => d.total), 1)
  return (
    <div className="flex h-44 items-end gap-2">
      {datos.map((d) => {
        const dia = DIAS[new Date(`${d.dia}T12:00:00`).getDay()]
        return (
          <div key={d.dia} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] text-slate-500">{d.total > 0 ? formatoQ(d.total).replace('.00', '') : ''}</span>
            <div
              className="w-full rounded-t-md bg-marca-500"
              style={{ height: `${Math.max((d.total / max) * 100, d.total > 0 ? 4 : 1)}%` }}
              title={`${d.dia}: ${formatoQ(d.total)}`}
            />
            <span className="text-xs text-slate-500">{dia}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const [d, setD] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.admin.dashboard().then(setD).catch((e) => setError(e.message))
  }, [])

  if (error) return <Alerta>{error}</Alerta>
  if (!d) return <Spinner />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Resumen del negocio</h1>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Indicador titulo="Ventas totales" valor={formatoQ(d.ventas_total)} detalle={`Este mes: ${formatoQ(d.ventas_mes)}`} />
        <Indicador titulo="Pedidos" valor={d.pedidos_total} detalle={`${d.pedidos_por_estado.pendiente} pendientes`} />
        <Indicador titulo="Clientes" valor={d.clientes.total} detalle={`${d.clientes.activos} activos`} />
        <Indicador titulo="Stock bajo" valor={d.stock_bajo.length} detalle="productos por reabastecer" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="tarjeta p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Ventas de los últimos 7 días</h2>
          <GraficoVentas datos={d.ventas_ultimos_7_dias} />
        </section>

        <section className="tarjeta p-5">
          <h2 className="mb-4 font-semibold">Pedidos por estado</h2>
          <ul className="space-y-3">
            {Object.entries(d.pedidos_por_estado).map(([estado, n]) => (
              <li key={estado} className="flex items-center justify-between">
                <EstadoBadge estado={estado} />
                <Link to={`/admin/pedidos?estado=${estado}`} className="font-semibold hover:text-marca-600">
                  {n}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="tarjeta p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">⚠️ Alertas de stock bajo</h2>
            <Link to="/admin/inventario" className="btn-texto text-xs">Ir a inventario</Link>
          </div>
          {d.stock_bajo.length === 0 ? (
            <p className="text-sm text-slate-500">Todo el inventario está en niveles saludables.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.stock_bajo.map((p) => (
                <li key={p.id} className="flex justify-between py-2 text-sm">
                  <span>{p.nombre}</span>
                  <span className={`font-semibold ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {p.stock} / mín. {p.stock_minimo}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tarjeta p-5">
          <h2 className="mb-3 font-semibold">Productos más vendidos</h2>
          {d.productos_top.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no hay ventas.</p>
          ) : (
            <ol className="divide-y divide-slate-100">
              {d.productos_top.map((p, i) => (
                <li key={p.producto_id} className="flex justify-between gap-2 py-2 text-sm">
                  <span>
                    <span className="mr-2 text-slate-400">{i + 1}.</span>
                    {p.nombre_producto}
                  </span>
                  <span className="shrink-0 text-slate-600">
                    {p.unidades} u · {formatoQ(p.ingresos)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="tarjeta overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-semibold">Pedidos recientes</h2>
          <Link to="/admin/pedidos" className="btn-texto text-xs">Ver todos</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="tabla w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {d.pedidos_recientes.map((p) => (
                <tr key={p.id}>
                  <td className="font-semibold">{p.id}</td>
                  <td>{p.cliente_nombre}</td>
                  <td className="whitespace-nowrap text-slate-500">{formatoFecha(p.fecha)}</td>
                  <td><EstadoBadge estado={p.estado} /></td>
                  <td className="text-right font-semibold">{formatoQ(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
