import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api.js'
import { Alerta, Confirmar, EstadoBadge, Modal, Spinner, VerMas } from '../../components/ui.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatoFecha, formatoQ } from '../../format.js'
import { usePorPartes } from '../../hooks.js'
import ReglasPassword from '../../components/ReglasPassword.jsx'

function NuevoUsuario({ onCreado, onCancelar }) {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'admin' })
  const [error, setError] = useState('')
  const campo = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) })

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.admin.crearUsuario(form)
      onCreado()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Alerta>{error}</Alerta>
      <div>
        <label className="label" htmlFor="u-nombre">Nombre</label>
        <input id="u-nombre" className="input" required {...campo('nombre')} />
      </div>
      <div>
        <label className="label" htmlFor="u-email">Correo</label>
        <input id="u-email" type="email" className="input" required {...campo('email')} />
      </div>
      <div>
        <label className="label" htmlFor="u-pass">Contraseña temporal</label>
        <input id="u-pass" type="password" className="input" required autoComplete="new-password" {...campo('password')} />
        <ReglasPassword password={form.password} />
      </div>
      <div>
        <label className="label" htmlFor="u-rol">Rol</label>
        <select id="u-rol" className="input" {...campo('rol')}>
          <option value="admin">Administrador</option>
          <option value="cliente">Cliente</option>
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primario">Crear usuario</button>
      </div>
    </form>
  )
}

export default function Usuarios() {
  const { usuario: yo } = useAuth()
  const notificar = useToast()
  const [usuarios, setUsuarios] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [rol, setRol] = useState('')
  const [creando, setCreando] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [confirmar, setConfirmar] = useState(null) // { usuario, cambios, mensaje }
  const { parte, restantes, total, verMas } = usePorPartes(usuarios)

  const cargar = useCallback(() => {
    api.admin
      .usuarios({ q: q.trim(), rol })
      .then((r) => setUsuarios(r.usuarios))
      .catch((e) => setError(e.message))
  }, [q, rol])

  useEffect(() => {
    const t = setTimeout(cargar, 250)
    return () => clearTimeout(t)
  }, [cargar])

  const aplicar = async () => {
    const { usuario, cambios } = confirmar
    setConfirmar(null)
    try {
      await api.admin.editarUsuario(usuario.id, cambios)
      notificar('Usuario actualizado')
      cargar()
    } catch (err) {
      notificar(err.message, 'error')
    }
  }

  const verDetalle = async (u) => {
    try {
      setDetalle(await api.admin.usuario(u.id))
    } catch (err) {
      notificar(err.message, 'error')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-[-0.05em]">Usuarios y clientes</h1>
        <button className="btn-primario" onClick={() => setCreando(true)}>+ Nuevo usuario</button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input type="search" className="input sm:max-w-xs" placeholder="Buscar por nombre o correo" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input sm:w-48" value={rol} onChange={(e) => setRol(e.target.value)} aria-label="Filtrar por rol">
          <option value="">Todos los roles</option>
          <option value="cliente">Clientes</option>
          <option value="admin">Administradores</option>
        </select>
      </div>

      <Alerta>{error}</Alerta>
      {!usuarios ? (
        <Spinner />
      ) : (
        <div className="tarjeta overflow-x-auto">
          <table className="tabla tabla-movil w-full sm:min-w-[760px]">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th className="text-right">Pedidos</th>
                <th className="text-right">Total comprado</th>
                <th>Registro</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {parte.map((u) => {
                const esYo = u.id === yo.id
                return (
                  <tr key={u.id} className={u.activo ? '' : 'opacity-60'}>
                    <td data-etiqueta="Usuario">
                      <button className="text-left hover:underline" onClick={() => verDetalle(u)}>
                        <p className="font-medium">{u.nombre} {esYo && <span className="text-xs text-gris">(tú)</span>}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </button>
                    </td>
                    <td data-etiqueta="Rol" className="capitalize">{u.rol}</td>
                    <td data-etiqueta="Pedidos" className="text-right">{u.pedidos}</td>
                    <td data-etiqueta="Total comprado" className="text-right">{formatoQ(u.total_comprado)}</td>
                    <td data-etiqueta="Registro" className="whitespace-nowrap text-slate-500">{formatoFecha(u.creado_en)}</td>
                    <td data-etiqueta="Estado">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {u.activo ? 'Activo' : 'Desactivado'}
                      </span>
                    </td>
                    <td data-etiqueta="Acciones" className="text-right whitespace-nowrap">
                      {!esYo && (
                        <>
                          <button
                            className="btn-texto text-xs"
                            onClick={() =>
                              setConfirmar({
                                usuario: u,
                                cambios: { rol: u.rol === 'admin' ? 'cliente' : 'admin' },
                                mensaje: `${u.nombre} pasará a ser ${u.rol === 'admin' ? 'cliente' : 'administrador'}.`,
                              })
                            }
                          >
                            {u.rol === 'admin' ? 'Hacer cliente' : 'Hacer admin'}
                          </button>
                          <button
                            className={`btn-texto text-xs ${u.activo ? 'text-red-600 hover:bg-red-50' : ''}`}
                            onClick={() =>
                              setConfirmar({
                                usuario: u,
                                cambios: { activo: !u.activo },
                                mensaje: u.activo
                                  ? `${u.nombre} no podrá iniciar sesión y su sesión actual se cerrará.`
                                  : `${u.nombre} podrá volver a iniciar sesión.`,
                              })
                            }
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <VerMas restantes={restantes} mostrados={parte.length} total={total} onClick={verMas} />
        </div>
      )}

      <Modal abierto={creando} titulo="Nuevo usuario" onCerrar={() => setCreando(false)} ancho="max-w-md">
        {creando && (
          <NuevoUsuario
            onCancelar={() => setCreando(false)}
            onCreado={() => {
              setCreando(false)
              notificar('Usuario creado')
              cargar()
            }}
          />
        )}
      </Modal>

      <Modal abierto={!!detalle} titulo="Detalle del cliente" onCerrar={() => setDetalle(null)}>
        {detalle && (
          <div className="space-y-4 text-sm">
            <div className="rounded-imagen bg-canvas p-4">
              <p className="text-base font-semibold">{detalle.usuario.nombre}</p>
              <p className="text-slate-600">{detalle.usuario.email}</p>
              {detalle.usuario.telefono && <p className="text-slate-600">Tel. {detalle.usuario.telefono}</p>}
              {detalle.usuario.direccion && <p className="text-slate-600">{detalle.usuario.direccion}</p>}
            </div>
            <h3 className="font-semibold">Historial de pedidos ({detalle.pedidos.length})</h3>
            {detalle.pedidos.length === 0 ? (
              <p className="text-slate-500">Sin pedidos.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {detalle.pedidos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                    <span>#{p.id} · {formatoFecha(p.fecha)}</span>
                    <span className="flex items-center gap-2">
                      <EstadoBadge estado={p.estado} />
                      <span className="font-semibold">{formatoQ(p.total)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>

      <Confirmar
        abierto={!!confirmar}
        titulo="Confirmar cambio"
        mensaje={confirmar?.mensaje}
        peligro={confirmar?.cambios.activo === false}
        onCerrar={() => setConfirmar(null)}
        onConfirmar={aplicar}
      />
    </div>
  )
}
