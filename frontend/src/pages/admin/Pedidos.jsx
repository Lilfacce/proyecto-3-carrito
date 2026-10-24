import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import DetallePedido from '../../components/DetallePedido.jsx'
import { Alerta, EstadoBadge, Modal, Spinner } from '../../components/ui.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { ESTADOS, formatoFecha, formatoQ } from '../../format.js'

// Debe coincidir con TRANSICIONES del backend.
const SIGUIENTES = { pendiente: ['enviado', 'cancelado'], enviado: ['entregado'], entregado: [], cancelado: [] }
const ACCIONES = { enviado: 'Marcar como enviado', entregado: 'Marcar como entregado', cancelado: 'Cancelar pedido' }

export default function Pedidos() {
  const notificar = useToast()
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') ?? ''
  const [q, setQ] = useState('')
  const [pedidos, setPedidos] = useState(null)
  const [error, setError] = useState('')
  const [abierto, setAbierto] = useState(null)
  const [cambiando, setCambiando] = useState(false)

  const cargar = useCallback(() => {
    api.admin
      .pedidos({ estado, q: q.trim() })
      .then((r) => setPedidos(r.pedidos))
      .catch((e) => setError(e.message))
  }, [estado, q])

  useEffect(() => {
    const t = setTimeout(cargar, 250)
    return () => clearTimeout(t)
  }, [cargar])

  const abrir = async (id) => {
    try {
      setAbierto((await api.admin.pedido(id)).pedido)
    } catch (err) {
      notificar(err.message, 'error')
    }
  }

  const cambiarEstado = async (nuevo) => {
    if (nuevo === 'cancelado' && !window.confirm('¿Cancelar el pedido? El stock se devolverá al inventario.')) return
    setCambiando(true)
    try {
      const r = await api.admin.cambiarEstado(abierto.id, nuevo)
      setAbierto(r.pedido)
      notificar(`Pedido #${r.pedido.id}: ${ESTADOS[nuevo].texto.toLowerCase()}`)
      cargar()
    } catch (err) {
      notificar(err.message, 'error')
    } finally {
      setCambiando(false)
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Pedidos</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input type="search" className="input sm:max-w-xs" placeholder="Buscar por cliente o # de pedido" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {['', ...Object.keys(ESTADOS)].map((e) => (
            <button
              key={e || 'todos'}
              onClick={() => setParams(e ? { estado: e } : {}, { replace: true })}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                estado === e ? 'border-marca-600 bg-marca-600 text-white' : 'border-slate-300 bg-white text-slate-600'
              }`}
            >
              {e ? ESTADOS[e].texto : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      <Alerta>{error}</Alerta>
      {!pedidos ? (
        <Spinner />
      ) : (
        <div className="tarjeta overflow-x-auto">
          <table className="tabla w-full min-w-[640px]">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Pago</th>
                <th>Estado</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-slate-50" onClick={() => abrir(p.id)}>
                  <td>
                    <button className="font-semibold text-marca-600 hover:underline" aria-label={`Ver pedido ${p.id}`}>
                      #{p.id}
                    </button>
                  </td>
                  <td>
                    <p className="font-medium">{p.cliente_nombre}</p>
                    <p className="text-xs text-slate-500">{p.cliente_email}</p>
                  </td>
                  <td className="whitespace-nowrap text-slate-500">{formatoFecha(p.fecha)}</td>
                  <td className="text-slate-600">{p.metodo_pago === 'contra_entrega' ? 'Contra entrega' : 'Tarjeta'}</td>
                  <td><EstadoBadge estado={p.estado} /></td>
                  <td className="text-right font-semibold">{formatoQ(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pedidos.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No hay pedidos con esos filtros.</p>}
        </div>
      )}

      <Modal abierto={!!abierto} titulo="Detalle del pedido" onCerrar={() => setAbierto(null)} ancho="max-w-2xl">
        {abierto && (
          <>
            <DetallePedido pedido={abierto} mostrarCliente />
            {SIGUIENTES[abierto.estado].length > 0 && (
              <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                {SIGUIENTES[abierto.estado].map((s) => (
                  <button
                    key={s}
                    disabled={cambiando}
                    className={s === 'cancelado' ? 'btn-secundario text-red-600' : 'btn-primario'}
                    onClick={() => cambiarEstado(s)}
                  >
                    {ACCIONES[s]}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
