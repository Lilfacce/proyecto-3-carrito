import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api.js'
import DetallePedido from '../../components/DetallePedido.jsx'
import { Alerta, Confirmar, EstadoBadge, Modal, Spinner, VerMas } from '../../components/ui.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { ESTADOS, formatoFecha, formatoQ } from '../../format.js'
import { usePorPartes } from '../../hooks.js'

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
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const { parte, restantes, total, verMas } = usePorPartes(pedidos)

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
      <h1 className="text-3xl font-semibold tracking-[-0.05em]">Pedidos</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input type="search" className="input sm:max-w-xs" placeholder="Buscar por cliente o # de pedido" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="sin-barra -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {['', ...Object.keys(ESTADOS)].map((e) => (
            <button
              key={e || 'todos'}
              onClick={() => setParams(e ? { estado: e } : {}, { replace: true })}
              className={`chip ${estado === e ? 'chip-activo' : ''}`}
              aria-pressed={estado === e}
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
          <table className="tabla tabla-movil w-full sm:min-w-[640px]">
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
              {parte.map((p) => (
                <tr key={p.id} className="cursor-pointer transition-colors hover:bg-canvas/70" onClick={() => abrir(p.id)}>
                  <td data-etiqueta="Pedido">
                    <button className="font-semibold tabular-nums hover:underline" aria-label={`Ver pedido ${p.id}`}>
                      #{p.id}
                    </button>
                  </td>
                  <td data-etiqueta="Cliente">
                    <p className="font-medium">{p.cliente_nombre}</p>
                    <p className="text-xs text-slate-500">{p.cliente_email}</p>
                  </td>
                  <td data-etiqueta="Fecha" className="whitespace-nowrap text-slate-500">{formatoFecha(p.fecha)}</td>
                  <td data-etiqueta="Pago" className="text-slate-600">{p.metodo_pago === 'contra_entrega' ? 'Contra entrega' : 'Tarjeta'}</td>
                  <td data-etiqueta="Estado"><EstadoBadge estado={p.estado} /></td>
                  <td data-etiqueta="Total" className="text-right font-semibold">{formatoQ(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pedidos.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No hay pedidos con esos filtros.</p>}
          <VerMas restantes={restantes} mostrados={parte.length} total={total} onClick={verMas} />
        </div>
      )}

      <Modal abierto={!!abierto} titulo="Detalle del pedido" onCerrar={() => setAbierto(null)} ancho="max-w-2xl">
        {abierto && (
          <>
            <DetallePedido pedido={abierto} mostrarCliente />
            {SIGUIENTES[abierto.estado].length > 0 && (
              <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-borde pt-4">
                {SIGUIENTES[abierto.estado].map((s) => (
                  <button
                    key={s}
                    disabled={cambiando}
                    className={s === 'cancelado' ? 'btn-secundario text-red-600' : 'btn-primario'}
                    onClick={() => (s === 'cancelado' ? setConfirmarCancelar(true) : cambiarEstado(s))}
                  >
                    {ACCIONES[s]}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>

      <Confirmar
        abierto={confirmarCancelar}
        titulo="Cancelar pedido"
        mensaje="El pedido se cancelará y el stock volverá al inventario. ¿Continuar?"
        textoBoton="Sí, cancelar"
        peligro
        onCerrar={() => setConfirmarCancelar(false)}
        onConfirmar={() => {
          setConfirmarCancelar(false)
          cambiarEstado('cancelado')
        }}
      />
    </div>
  )
}
