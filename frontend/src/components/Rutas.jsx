import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Spinner } from './ui.jsx'

/** Exige sesión. Si `rol` se indica, también exige ese rol. */
export function RutaProtegida({ rol }) {
  const { usuario, cargando } = useAuth()
  const location = useLocation()
  if (cargando) return <Spinner />
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  if (rol && usuario.rol !== rol) return <Navigate to={usuario.rol === 'admin' ? '/admin' : '/'} replace />
  return <Outlet />
}

/** Para login/registro: si ya hay sesión, redirige. */
export function SoloInvitados() {
  const { usuario, cargando } = useAuth()
  if (cargando) return <Spinner />
  if (usuario) return <Navigate to={usuario.rol === 'admin' ? '/admin' : '/'} replace />
  return <Outlet />
}
