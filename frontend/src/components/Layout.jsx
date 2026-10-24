import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'

const enlace = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-marca-50 text-marca-700' : 'text-slate-600 hover:bg-slate-100'}`

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-marca-600 text-white">T</span>
      TecnoXela
    </Link>
  )
}

export default function Layout() {
  const { usuario, esAdmin, logout } = useAuth()
  const { unidades } = useCart()
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()

  const salir = async () => {
    await logout()
    setMenu(false)
    navigate('/')
  }

  const enlaces = (
    <>
      <NavLink to="/" end className={enlace} onClick={() => setMenu(false)}>
        Catálogo
      </NavLink>
      {usuario && !esAdmin && (
        <NavLink to="/mis-pedidos" className={enlace} onClick={() => setMenu(false)}>
          Mis pedidos
        </NavLink>
      )}
      {esAdmin && (
        <NavLink to="/admin" className={enlace} onClick={() => setMenu(false)}>
          Panel de administración
        </NavLink>
      )}
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">{enlaces}</nav>

          <div className="flex items-center gap-2">
            {!esAdmin && (
              <Link
                to="/carrito"
                className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100"
                aria-label={`Carrito, ${unidades} productos`}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6" />
                  <circle cx="10" cy="20.5" r="1.2" />
                  <circle cx="17" cy="20.5" r="1.2" />
                </svg>
                {unidades > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-marca-600 px-1 text-xs font-bold text-white">
                    {unidades}
                  </span>
                )}
              </Link>
            )}
            {usuario ? (
              <div className="hidden items-center gap-2 md:flex">
                <Link to="/perfil" className="text-sm text-slate-600 hover:text-slate-900">
                  Hola, <span className="font-semibold">{usuario.nombre.split(' ')[0]}</span>
                </Link>
                <button className="btn-secundario" onClick={salir}>
                  Salir
                </button>
              </div>
            ) : (
              <div className="hidden gap-2 md:flex">
                <Link to="/login" className="btn-secundario">
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="btn-primario">
                  Crear cuenta
                </Link>
              </div>
            )}
            <button
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
              onClick={() => setMenu((m) => !m)}
              aria-label="Abrir menú"
              aria-expanded={menu}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d={menu ? 'M6 6l12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h16'} />
              </svg>
            </button>
          </div>
        </div>

        {menu && (
          <nav className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 md:hidden">
            {enlaces}
            {usuario ? (
              <>
                <NavLink to="/perfil" className={enlace} onClick={() => setMenu(false)}>
                  Mi perfil
                </NavLink>
                <button className="btn-secundario mt-2" onClick={salir}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/login" className="btn-secundario" onClick={() => setMenu(false)}>
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="btn-primario" onClick={() => setMenu(false)}>
                  Crear cuenta
                </Link>
              </div>
            )}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        TecnoXela · Proyecto académico — los pagos son simulados.
      </footer>
    </div>
  )
}
