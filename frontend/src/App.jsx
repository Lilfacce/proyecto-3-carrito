import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import LimiteError from './components/LimiteError.jsx'
import { RutaProtegida, SoloInvitados } from './components/Rutas.jsx'
import Catalogo from './pages/Catalogo.jsx'
import Producto from './pages/Producto.jsx'
import Login from './pages/Login.jsx'
import Registro from './pages/Registro.jsx'
import { Recuperar, Restablecer } from './pages/RecuperarPassword.jsx'
import Carrito from './pages/Carrito.jsx'
import Checkout from './pages/Checkout.jsx'
import MisPedidos from './pages/MisPedidos.jsx'
import PedidoDetalle from './pages/PedidoDetalle.jsx'
import Perfil from './pages/Perfil.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import AdminProductos from './pages/admin/Productos.jsx'
import Inventario from './pages/admin/Inventario.jsx'
import AdminPedidos from './pages/admin/Pedidos.jsx'
import Usuarios from './pages/admin/Usuarios.jsx'
import { Vacio } from './components/ui.jsx'

function NoEncontrado() {
  return (
    <Vacio
      titulo="Página no encontrada"
      accion={
        <Link to="/" className="btn-primario">
          Ir al catálogo
        </Link>
      }
    >
      La dirección que buscas no existe.
    </Vacio>
  )
}

// Al navegar a otra ruta la página empieza desde arriba; los filtros (?q=, ?categoria=) no la mueven.
function VolverArriba() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const { pathname } = useLocation()
  return (
    <LimiteError ruta={pathname}>
      <VolverArriba />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Catalogo />} />
          <Route path="productos/:id" element={<Producto />} />
          <Route path="carrito" element={<Carrito />} />

          <Route element={<SoloInvitados />}>
            <Route path="login" element={<Login />} />
            <Route path="registro" element={<Registro />} />
          </Route>
          <Route path="recuperar" element={<Recuperar />} />
          <Route path="restablecer" element={<Restablecer />} />

          <Route element={<RutaProtegida />}>
            <Route path="perfil" element={<Perfil />} />
          </Route>

          <Route element={<RutaProtegida rol="cliente" />}>
            <Route path="checkout" element={<Checkout />} />
            <Route path="mis-pedidos" element={<MisPedidos />} />
            <Route path="mis-pedidos/:id" element={<PedidoDetalle />} />
          </Route>

          <Route path="*" element={<NoEncontrado />} />
        </Route>

        <Route element={<RutaProtegida rol="admin" />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="productos" element={<AdminProductos />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="pedidos" element={<AdminPedidos />} />
            <Route path="usuarios" element={<Usuarios />} />
          </Route>
        </Route>
      </Routes>
    </LimiteError>
  )
}
