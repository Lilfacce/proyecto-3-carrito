import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/Layout.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const SECCIONES = [
  ['/admin', 'Resumen', '📊'],
  ['/admin/productos', 'Productos', '🏷️'],
  ['/admin/inventario', 'Inventario', '📦'],
  ['/admin/pedidos', 'Pedidos', '🧾'],
  ['/admin/usuarios', 'Usuarios', '👥'],
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
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <div className="flex h-16 items-center justify-between px-4">
          <Logo />
          <span className="rounded bg-marca-50 px-2 py-0.5 text-xs font-semibold text-marca-700">Admin</span>
        </div>
        {/* En móvil el menú es una barra horizontal desplazable; en escritorio, una columna. */}
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
          {SECCIONES.map(([ruta, texto, icono]) => (
            <NavLink
              key={ruta}
              to={ruta}
              end={ruta === '/admin'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-marca-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span aria-hidden="true">{icono}</span>
              {texto}
            </NavLink>
          ))}
        </nav>
        <div className="hidden space-y-2 border-t border-slate-100 p-4 md:block">
          <p className="truncate text-sm font-medium">{usuario.nombre}</p>
          <p className="truncate text-xs text-slate-500">{usuario.email}</p>
          <div className="flex gap-2 pt-1">
            <Link to="/" className="btn-secundario flex-1 px-2 text-xs">Ver tienda</Link>
            <button onClick={salir} className="btn-secundario flex-1 px-2 text-xs">Salir</button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
        <div className="mt-8 flex gap-2 md:hidden">
          <Link to="/" className="btn-secundario flex-1">Ver tienda</Link>
          <button onClick={salir} className="btn-secundario flex-1">Cerrar sesión</button>
        </div>
      </main>
    </div>
  )
}
