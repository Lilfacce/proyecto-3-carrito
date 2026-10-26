import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/Layout.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import Icono from '../../components/Iconos.jsx'

const SECCIONES = [
  ['/admin', 'Resumen', 'resumen'],
  ['/admin/productos', 'Productos', 'etiqueta'],
  ['/admin/inventario', 'Inventario', 'inventario'],
  ['/admin/pedidos', 'Pedidos', 'recibo'],
  ['/admin/usuarios', 'Usuarios', 'usuarios'],
]

export default function AdminLayout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const salir = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:shadow-suave">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-medium text-gris">Admin</span>
        </div>
        {/* En móvil el menú es una barra horizontal desplazable; en escritorio, una columna. */}
        <nav className="sin-barra flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
          {SECCIONES.map(([ruta, texto, icono]) => (
            <NavLink
              key={ruta}
              to={ruta}
              end={ruta === '/admin'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-[20px] px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-canvas text-tinta' : 'text-gris hover:bg-canvas/60 hover:text-tinta'
                }`
              }
            >
              <Icono nombre={icono} />
              {texto}
            </NavLink>
          ))}
        </nav>
        <div className="hidden space-y-2 border-t border-borde p-4 md:block">
          <p className="truncate text-sm font-medium">{usuario.nombre}</p>
          <p className="truncate text-xs text-slate-500">{usuario.email}</p>
          <div className="flex gap-2 pt-1">
            <Link to="/" className="btn-secundario flex-1 px-2 text-xs">Ver tienda</Link>
            <button onClick={salir} className="btn-secundario flex-1 px-2 text-xs">Salir</button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
        <Outlet />
        <div className="mt-8 flex gap-2 md:hidden">
          <Link to="/" className="btn-secundario flex-1">Ver tienda</Link>
          <button onClick={salir} className="btn-secundario flex-1">Cerrar sesión</button>
        </div>
      </main>
    </div>
  )
}
