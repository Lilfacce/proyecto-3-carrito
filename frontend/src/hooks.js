import { useCallback, useEffect, useRef, useState } from 'react'
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
  // Último producto agregado con éxito: el botón muestra un check durante un momento.
  const [agregado, setAgregado] = useState(null)
  const temporizador = useRef(null)
  useEffect(() => () => clearTimeout(temporizador.current), [])

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
        setAgregado(producto.id)
        clearTimeout(temporizador.current)
        temporizador.current = setTimeout(() => setAgregado(null), 1400)
      } catch (err) {
        notificar(err.message, 'error')
      } finally {
        setAgregando(null)
      }
    },
    [usuario, agregar, notificar, navigate, location.pathname],
  )

  return { agregarProducto, agregando, agregado }
}

/** Muestra una lista larga por partes ("ver más"); vuelve al inicio cuando cambia la lista. */
export function usePorPartes(lista, tamano = 15) {
  const [visibles, setVisibles] = useState(tamano)
  const [listaPrevia, setListaPrevia] = useState(lista)
  if (lista !== listaPrevia) {
    setListaPrevia(lista)
    setVisibles(tamano)
  }
  const total = lista?.length ?? 0
  return {
    parte: (lista ?? []).slice(0, visibles),
    restantes: Math.max(0, total - visibles),
    total,
    verMas: () => setVisibles((v) => v + tamano),
  }
}
