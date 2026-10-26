import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Alerta } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { TarjetaFormulario } from './Login.jsx'
import ReglasPassword, { cumpleReglas } from '../components/ReglasPassword.jsx'

export default function Registro() {
  const { registro } = useAuth()
  const notificar = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', direccion: '', password: '', confirmar: '' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const campo = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) })
  const passwordValida = cumpleReglas(form.password)

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmar) return setError('Las contraseñas no coinciden')
    setEnviando(true)
    try {
      const { confirmar: _, ...datos } = form
      await registro({ ...datos, telefono: datos.telefono || undefined, direccion: datos.direccion || undefined })
      notificar('¡Bienvenido! Tu cuenta fue creada.')
      navigate(location.state?.desde ?? '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <TarjetaFormulario titulo="Crear cuenta" subtitulo="Regístrate para comprar y dar seguimiento a tus pedidos.">
      <form onSubmit={enviar} className="space-y-4">
        <Alerta>{error}</Alerta>
        <div>
          <label className="label" htmlFor="nombre">Nombre completo</label>
          <input id="nombre" className="input" required minLength={2} autoComplete="name" {...campo('nombre')} />
        </div>
        <div>
          <label className="label" htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" className="input" required autoComplete="email" {...campo('email')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="telefono">Teléfono <span className="text-gris">(opcional)</span></label>
            <input id="telefono" type="tel" className="input" autoComplete="tel" {...campo('telefono')} />
          </div>
          <div>
            <label className="label" htmlFor="direccion">Dirección <span className="text-gris">(opcional)</span></label>
            <input id="direccion" className="input" autoComplete="street-address" {...campo('direccion')} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" type="password" className="input" required autoComplete="new-password" {...campo('password')} />
          <ReglasPassword password={form.password} />
        </div>
        <div>
          <label className="label" htmlFor="confirmar">Confirmar contraseña</label>
          <input id="confirmar" type="password" className="input" required autoComplete="new-password" {...campo('confirmar')} />
        </div>
        <button className="btn-primario w-full py-2.5" disabled={enviando || !passwordValida}>
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
        <p className="text-center text-sm text-gris">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" state={location.state} className="font-medium text-tinta underline underline-offset-2">
            Inicia sesión
          </Link>
        </p>
      </form>
    </TarjetaFormulario>
  )
}
