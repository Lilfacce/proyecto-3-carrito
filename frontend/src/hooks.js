import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { useCart } from './context/CartContext.jsx'
import { useToast } from './context/ToastContext.jsx'

/** Agrega al carrito; si no hay sesión, lleva a iniciar sesión y vuelve después. */
export function useAgregarAlCarrito() {
  const { usuario } = useAuth()
  const { agregar } = useCart()
  const notificar = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [agregando, setAgregando] = useState(null)

  const agregarProducto = useCallback(
    async (producto, cantidad = 1) => {
      if (!usuario) {
        notificar('Inicia sesión para agregar productos al carrito', 'error')
        return navigate('/login', { state: { desde: location.pathname } })
      }
      setAgregando(producto.id)
      try {
        await agregar(producto.id, cantidad)
        notificar(`${producto.nombre} se agregó al carrito`)
      } catch (err) {
        notificar(err.message, 'error')
      } finally {
        setAgregando(null)
      }
    },
    [usuario, agregar, notificar, navigate, location.pathname],
  )

  return { agregarProducto, agregando }
}
