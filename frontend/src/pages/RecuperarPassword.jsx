import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import Icono from '../components/Iconos.jsx'
import ReglasPassword, { cumpleReglas } from '../components/ReglasPassword.jsx'
import { Alerta } from '../components/ui.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { TarjetaFormulario } from './Login.jsx'

/** Paso 1: pedir el enlace por correo. */
export function Recuperar() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await api.recuperarPassword(email)
      setEnviado(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (enviado)
    return (
      <TarjetaFormulario titulo="Revisa tu correo" subtitulo={`Si ${email} pertenece a una cuenta activa, te enviamos un enlace para elegir una contraseña nueva.`}>
        <div className="subir space-y-5">
          <div className="flex items-center gap-3 rounded-imagen bg-canvas p-4 text-sm">
            <Icono nombre="correo" className="h-6 w-6 shrink-0" />
            <p>
              El enlace vence en 30 minutos. <span className="text-gris">En este proyecto el correo es simulado: aparece en la consola del backend.</span>
            </p>
          </div>
          <Link to="/login" className="btn-primario w-full py-2.5">
            Volver a iniciar sesión
          </Link>
          <button type="button" className="btn-texto w-full" onClick={() => setEnviado(false)}>
            Usar otro correo
          </button>
        </div>
      </TarjetaFormulario>
    )

  return (
    <TarjetaFormulario titulo="Recuperar contraseña" subtitulo="Escribe el correo de tu cuenta y te enviaremos un enlace.">
      <form onSubmit={enviar} className="space-y-4">
        <Alerta>{error}</Alerta>
        <div>
          <label className="label" htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" autoComplete="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="btn-primario w-full py-2.5" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar enlace'}
        </button>
        <p className="text-center text-sm text-gris">
          ¿Ya la recordaste?{' '}
          <Link to="/login" className="font-medium text-tinta underline underline-offset-2">
            Inicia sesión
          </Link>
        </p>
      </form>
    </TarjetaFormulario>
  )
}

/** Paso 2: elegir la contraseña nueva desde el enlace (?token=…). */
export function Restablecer() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const notificar = useToast()
  const [form, setForm] = useState({ password: '', confirmar: '' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!/^[a-f0-9]{64}$/.test(token))
    return (
      <TarjetaFormulario titulo="Enlace no válido" subtitulo="El enlace está incompleto o fue copiado mal.">
        <Link to="/recuperar" className="btn-primario w-full py-2.5">
          Pedir un enlace nuevo
        </Link>
      </TarjetaFormulario>
    )

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmar) return setError('Las contraseñas no coinciden')
    setEnviando(true)
    try {
      await api.restablecerPassword(token, form.password)
      notificar('Contraseña actualizada. Ya puedes iniciar sesión.')
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <TarjetaFormulario titulo="Nueva contraseña" subtitulo="Elige una contraseña que no uses en otros sitios.">
      <form onSubmit={enviar} className="space-y-4">
        <Alerta>
          {error}
          {error && (
            <>
              {' '}
              <Link to="/recuperar" className="font-medium underline">
                Pedir otro enlace
              </Link>
            </>
          )}
        </Alerta>
        <div>
          <label className="label" htmlFor="password">Contraseña nueva</label>
          <input id="password" type="password" autoComplete="new-password" className="input" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <ReglasPassword password={form.password} />
        </div>
        <div>
          <label className="label" htmlFor="confirmar">Confirmar contraseña</label>
          <input id="confirmar" type="password" autoComplete="new-password" className="input" required value={form.confirmar} onChange={(e) => setForm({ ...form, confirmar: e.target.value })} />
        </div>
        <button className="btn-primario w-full py-2.5" disabled={enviando || !cumpleReglas(form.password)}>
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </TarjetaFormulario>
  )
}
