import { useState } from 'react'
import { api } from '../api.js'
import { Alerta } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { ReglasPassword } from './Registro.jsx'

export default function Perfil() {
  const { usuario, setUsuario } = useAuth()
  const notificar = useToast()
  const [perfil, setPerfil] = useState({
    nombre: usuario.nombre,
    telefono: usuario.telefono ?? '',
    direccion: usuario.direccion ?? '',
  })
  const [pass, setPass] = useState({ actual: '', nueva: '' })
  const [errorPerfil, setErrorPerfil] = useState('')
  const [errorPass, setErrorPass] = useState('')

  const guardarPerfil = async (e) => {
    e.preventDefault()
    setErrorPerfil('')
    try {
      const r = await api.actualizarPerfil(perfil)
      setUsuario(r.usuario)
      notificar('Perfil actualizado')
    } catch (err) {
      setErrorPerfil(err.message)
    }
  }

  const cambiarPassword = async (e) => {
    e.preventDefault()
    setErrorPass('')
    try {
      await api.cambiarPassword(pass)
      setPass({ actual: '', nueva: '' })
      notificar('Contraseña actualizada')
    } catch (err) {
      setErrorPass(err.message)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Mi perfil</h1>
      <form onSubmit={guardarPerfil} className="tarjeta space-y-4 p-5">
        <h2 className="font-semibold">Datos personales</h2>
        <Alerta>{errorPerfil}</Alerta>
        <div>
          <label className="label">Correo electrónico</label>
          <input className="input bg-slate-100" value={usuario.email} disabled />
        </div>
        <div>
          <label className="label" htmlFor="nombre">Nombre</label>
          <input id="nombre" className="input" required value={perfil.nombre} onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="telefono">Teléfono</label>
            <input id="telefono" className="input" value={perfil.telefono} onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="direccion">Dirección</label>
            <input id="direccion" className="input" value={perfil.direccion} onChange={(e) => setPerfil({ ...perfil, direccion: e.target.value })} />
          </div>
        </div>
        <button className="btn-primario">Guardar cambios</button>
      </form>

      <form onSubmit={cambiarPassword} className="tarjeta space-y-4 p-5">
        <h2 className="font-semibold">Cambiar contraseña</h2>
        <Alerta>{errorPass}</Alerta>
        <div>
          <label className="label" htmlFor="actual">Contraseña actual</label>
          <input id="actual" type="password" className="input" required autoComplete="current-password" value={pass.actual} onChange={(e) => setPass({ ...pass, actual: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="nueva">Nueva contraseña</label>
          <input id="nueva" type="password" className="input" required autoComplete="new-password" value={pass.nueva} onChange={(e) => setPass({ ...pass, nueva: e.target.value })} />
          <ReglasPassword password={pass.nueva} />
        </div>
        <button className="btn-primario">Actualizar contraseña</button>
      </form>
    </div>
  )
}
