import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api
      .me()
      .then((r) => setUsuario(r.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const r = await api.login({ email, password })
    setUsuario(r.usuario)
    return r.usuario
  }, [])

  const registro = useCallback(async (datos) => {
    const r = await api.registro(datos)
    setUsuario(r.usuario)
    return r.usuario
  }, [])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setUsuario(null)
  }, [])

  const valor = useMemo(
    () => ({ usuario, cargando, login, registro, logout, setUsuario, esAdmin: usuario?.rol === 'admin' }),
    [usuario, cargando, login, registro, logout],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
