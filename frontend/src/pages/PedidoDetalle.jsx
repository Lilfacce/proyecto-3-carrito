import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api.js'
import DetallePedido from '../components/DetallePedido.jsx'
import { Alerta, Confirmar, Spinner } from '../components/ui.jsx'
import { useToast } from '../context/ToastContext.jsx'
import Icono from '../components/Iconos.jsx'

export default function PedidoDetalle() {
  const { id } = useParams()
  const { state } = useLocation()
  const notificar = useToast()
  const [pedido, setPedido] = useState(null)
  const [error, setError] = useState('')
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    api.miPedido(id).then((r) => setPedido(r.pedido)).catch((e) => setError(e.message))
  }, [id])

  const cancelar = async () => {
    setConfirmar(false)
    try {
      const r = await api.cancelarMiPedido(id)
      setPedido(r.pedido)
      notificar('Pedido cancelado')
    } catch (err) {
      notificar(err.message, 'error')
    }
  }

  if (error) return <Alerta>{error}</Alerta>
  if (!pedido) return <Spinner />

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/mis-pedidos" className="btn-texto -ml-3"><Icono nombre="flechaAtras" className="h-4 w-4" />Mis pedidos</Link>
      {state?.nuevo && (
        <div className="subir rounded-tarjeta border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
          <p className="flex items-center gap-3 text-lg font-semibold">
            {/* El círculo se traza y después el check: el momento de "listo" de la compra. */}
            <svg className="h-8 w-8 shrink-0" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="16" cy="16" r="13" pathLength="1" className="dibujar" style={{ '--dur': '600ms' }} transform="rotate(-90 16 16)" />
              <path d="m10.5 16.5 4 4 7-8" pathLength="1" className="dibujar" style={{ '--dur': '320ms', '--retraso': '480ms' }} />
            </svg>
            ¡Gracias por tu compra!
          </p>
          <p className="pl-11 text-sm">Recibimos tu pedido y te avisaremos cuando sea enviado.</p>
        </div>
      )}
      <div className="tarjeta p-6 sm:p-8">
        <DetallePedido pedido={pedido} />
        {pedido.estado === 'pendiente' && (
          <div className="mt-6 flex justify-end border-t border-borde pt-4">
            <button className="btn-secundario text-red-600" onClick={() => setConfirmar(true)}>
              Cancelar pedido
            </button>
          </div>
        )}
      </div>
      <Confirmar
        abierto={confirmar}
        titulo="Cancelar pedido"
        mensaje="El pedido se cancelará y los productos volverán al inventario. ¿Continuar?"
        textoBoton="Sí, cancelar"
        peligro
        onCerrar={() => setConfirmar(false)}
        onConfirmar={cancelar}
      />
    </div>
  )
}
