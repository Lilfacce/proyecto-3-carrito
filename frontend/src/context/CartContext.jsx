import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from './AuthContext.jsx'

const VACIO = { items: [], total: 0, unidades: 0 }
const CartContext = createContext(null)

/** Estado del carrito. La fuente de verdad es el servidor: cada acción devuelve el carrito actualizado. */
export function CartProvider({ children }) {
  const { usuario } = useAuth()
  const [carrito, setCarrito] = useState(VACIO)
  const [cargando, setCargando] = useState(false)
  // Id del usuario cuyo carrito ya se cargó; evita mostrar "carrito vacío" antes de la primera respuesta.
  const [cargadoPara, setCargadoPara] = useState(null)
  const esCliente = usuario?.rol === 'cliente'
  const listo = !esCliente || cargadoPara === usuario.id

  const recargar = useCallback(async () => {
    if (!usuario || usuario.rol !== 'cliente') return
    setCargando(true)
    try {
      setCarrito(await api.carrito())
    } finally {
      setCargando(false)
      setCargadoPara(usuario.id)
    }
  }, [usuario])

  // Carga inicial al cambiar de usuario. Solo actualiza el estado cuando llega la respuesta.
  const usuarioId = usuario?.id
  useEffect(() => {
    if (!esCliente) return
    let vigente = true
    api
      .carrito()
      .then((c) => vigente && setCarrito(c))
      .catch(() => vigente && setCarrito(VACIO))
      .finally(() => vigente && setCargadoPara(usuarioId))
    return () => {
      vigente = false
    }
  }, [esCliente, usuarioId])

  const acciones = useMemo(
    () => ({
      agregar: async (id, cantidad) => setCarrito(await api.agregarAlCarrito(id, cantidad)),
      cambiar: async (id, cantidad) => setCarrito(await api.cambiarCantidad(id, cantidad)),
      quitar: async (id) => setCarrito(await api.quitarDelCarrito(id)),
      vaciar: async () => setCarrito(await api.vaciarCarrito()),
    }),
    [],
  )

  const valor = useMemo(
    // Admins e invitados no tienen carrito: se deriva en lugar de vaciarlo con un efecto.
    () => ({ ...(esCliente ? carrito : VACIO), cargando, listo, recargar, ...acciones }),
    [carrito, esCliente, cargando, listo, recargar, acciones],
  )
  return <CartContext.Provider value={valor}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext)
