import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'

const enlace = ({ isActive }) =>
  `rounded-full px-4 py-2 text-sm transition ${isActive ? 'bg-canvas text-tinta' : 'text-gris hover:text-tinta'}`

// El punto del logotipo cae solo en la primera carga, no en cada navegación.
let logoPresentado = false

export function Logo() {
  const [animar] = useState(() => !logoPresentado)
  useEffect(() => {
    logoPresentado = true
  }, [])
  return (
    <Link to="/" className="flex items-baseline text-xl font-semibold tracking-[-0.05em] text-tinta" aria-label="TecnoXela, inicio">
      tecnoxela
      <span className={`ml-0.5 h-2 w-2 rounded-full bg-violeta ${animar ? 'punto-cae' : ''}`} aria-hidden="true" />
    </Link>
  )
}

/** Sacude levemente el ícono del carrito cuando aumentan las unidades. */
function useReaccionCarrito(unidades) {
  const ref = useRef(null)
  const previas = useRef(unidades)
  useEffect(() => {
    const subio = unidades > previas.current
    previas.current = unidades
    if (!subio || !ref.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    ref.current.animate(
      [{ transform: 'none' }, { transform: 'scale(1.12) rotate(-8deg)' }, { transform: 'rotate(4deg)' }, { transform: 'none' }],
      { duration: 420, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    )
  }, [unidades])
  return ref
}

export default function Layout() {
  const { usuario, esAdmin, logout } = useAuth()
  const { unidades } = useCart()
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()
  const iconoCarrito = useReaccionCarrito(unidades)

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
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-1 md:flex">{enlaces}</nav>
          </div>

          <div className="flex items-center gap-2">
            {!esAdmin && (
              <Link
                to="/carrito"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-tinta transition hover:bg-canvas"
                aria-label={`Carrito, ${unidades} productos`}
              >
                <svg ref={iconoCarrito} className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6" />
                  <circle cx="10" cy="20.5" r="1.2" />
                  <circle cx="17" cy="20.5" r="1.2" />
                </svg>
                {unidades > 0 && (
                  <span key={unidades} className="saltar absolute top-0 right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-tinta px-1 text-[11px] font-medium text-white ring-2 ring-white">
                    {unidades}
                  </span>
                )}
              </Link>
            )}
            {usuario ? (
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  to="/perfil"
                  className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm text-tinta transition hover:bg-canvas"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-xs font-medium ring-1 ring-borde">
                    {usuario.nombre.charAt(0).toUpperCase()}
                  </span>
                  {usuario.nombre.split(' ')[0]}
                </Link>
                <button className="btn-secundario" onClick={salir}>
                  Salir
                </button>
              </div>
            ) : (
              <div className="hidden gap-2 md:flex">
                <Link to="/login" className="btn-texto">
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="btn-primario">
                  Crear cuenta
                </Link>
              </div>
            )}
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full text-tinta hover:bg-canvas md:hidden"
              onClick={() => setMenu((m) => !m)}
              aria-label="Abrir menú"
              aria-expanded={menu}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" d={menu ? 'M6 6l12 12M18 6 6 18' : 'M4 8h16M4 16h16'} />
              </svg>
            </button>
          </div>
        </div>

        {menu && (
          <nav className="flex flex-col gap-1 border-t border-borde px-4 py-3 md:hidden">
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

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>

      <footer className="mt-16 bg-tinta text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-12 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="flex items-baseline text-xl font-semibold tracking-[-0.05em]">
              tecnoxela
              <span className="ml-0.5 h-2 w-2 rounded-full bg-violeta" aria-hidden="true" />
            </p>
            <p className="mt-2 max-w-xs text-sm text-white/60">Tecnología y accesorios, con entrega a domicilio.</p>
          </div>
          <p className="text-xs text-white/50">Proyecto académico — los pagos son simulados.</p>
        </div>
      </footer>
    </div>
  )
}
