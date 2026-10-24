import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Alerta } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export function TarjetaFormulario({ titulo, subtitulo, children }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="tarjeta p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">{subtitulo}</p>
        {children}
      </div>
    </div>
  )
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const usuario = await login(form.email, form.password)
      navigate(usuario.rol === 'admin' ? '/admin' : (location.state?.desde ?? '/'), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <TarjetaFormulario titulo="Iniciar sesión" subtitulo="Ingresa con tu correo y contraseña.">
      <form onSubmit={enviar} className="space-y-4">
        <Alerta>{error}</Alerta>
        <div>
          <label className="label" htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <button className="btn-primario w-full py-2.5" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="text-center text-sm text-slate-500">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" state={location.state} className="font-semibold text-marca-600 hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </TarjetaFormulario>
  )
}
