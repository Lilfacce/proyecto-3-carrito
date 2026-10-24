import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api.js'
import DetallePedido from '../components/DetallePedido.jsx'
import { Alerta, Confirmar, Spinner } from '../components/ui.jsx'
import { useToast } from '../context/ToastContext.jsx'

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
      <Link to="/mis-pedidos" className="btn-texto -ml-2">← Mis pedidos</Link>
      {state?.nuevo && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
          <p className="text-lg font-semibold">¡Gracias por tu compra! 🎉</p>
          <p className="text-sm">Recibimos tu pedido y te avisaremos cuando sea enviado.</p>
        </div>
      )}
      <div className="tarjeta p-5 sm:p-6">
        <DetallePedido pedido={pedido} />
        {pedido.estado === 'pendiente' && (
          <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
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
