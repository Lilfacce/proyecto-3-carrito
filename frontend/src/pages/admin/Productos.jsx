import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../api.js'
import ImagenProducto from '../../components/ImagenProducto.jsx'
import { Alerta, Confirmar, Modal, Spinner } from '../../components/ui.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatoQ } from '../../format.js'

const VACIO = { nombre: '', descripcion: '', precio: '', stock: '', stock_minimo: 5, categoria: '', imagen: '', activo: true }

function FormProducto({ inicial, categorias, onGuardar, onCancelar }) {
  const nuevo = inicial.id === undefined
  const [form, setForm] = useState(inicial)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const campo = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm({ ...form, [k]: e.target.value }) })

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await onGuardar({
        ...form,
        precio: Number(form.precio),
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo),
        imagen: form.imagen || null,
      })
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Alerta>{error}</Alerta>
      <div>
        <label className="label" htmlFor="nombre">Nombre</label>
        <input id="nombre" className="input" required minLength={2} {...campo('nombre')} />
      </div>
      <div>
        <label className="label" htmlFor="descripcion">Descripción</label>
        <textarea id="descripcion" className="input min-h-20" {...campo('descripcion')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="precio">Precio (Q)</label>
          <input id="precio" type="number" min="0" step="0.01" className="input" required {...campo('precio')} />
        </div>
        <div>
          <label className="label" htmlFor="categoria">Categoría</label>
          <input id="categoria" className="input" required list="categorias" {...campo('categoria')} />
          <datalist id="categorias">
            {categorias.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="stock">{nuevo ? 'Stock inicial' : 'Stock'}</label>
          {nuevo ? (
            <input id="stock" type="number" min="0" step="1" className="input" required {...campo('stock')} />
          ) : (
            <>
              <input id="stock" className="input bg-slate-50" value={form.stock} readOnly aria-describedby="stock-ayuda" />
              <p id="stock-ayuda" className="mt-1 text-xs text-slate-500">Se ajusta desde Inventario.</p>
            </>
          )}
        </div>
        <div>
          <label className="label" htmlFor="stock_minimo">Stock mínimo</label>
          <input id="stock_minimo" type="number" min="0" step="1" className="input" required {...campo('stock_minimo')} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="imagen">URL de la imagen <span className="text-slate-400">(opcional)</span></label>
        <input id="imagen" type="url" className="input" placeholder="https://…" {...campo('imagen')} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-marca-600" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
        Visible en la tienda
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  )
}

export default function Productos() {
  const notificar = useToast()
  const [productos, setProductos] = useState(null)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null) // null | 'nuevo' | producto
  const [eliminando, setEliminando] = useState(null)

  const cargar = useCallback(() => {
    api.admin.productos().then((r) => setProductos(r.productos)).catch((e) => setError(e.message))
  }, [])
  useEffect(cargar, [cargar])

  const categorias = useMemo(() => [...new Set((productos ?? []).map((p) => p.categoria))].sort(), [productos])
  const filtrados = (productos ?? []).filter((p) =>
    `${p.nombre} ${p.categoria}`.toLowerCase().includes(busqueda.toLowerCase()),
  )

  const guardar = async (datos) => {
    const { id, nombre, descripcion, precio, stock, stock_minimo, categoria, imagen, activo } = datos
    const cuerpo = { nombre, descripcion, precio, stock, stock_minimo, categoria, imagen, activo }
    if (editando === 'nuevo') await api.admin.crearProducto(cuerpo)
    else await api.admin.editarProducto(id, cuerpo)
    notificar(editando === 'nuevo' ? 'Producto creado' : 'Producto actualizado')
    setEditando(null)
    cargar()
  }

  const eliminar = async () => {
    try {
      await api.admin.eliminarProducto(eliminando.id)
      notificar('Producto eliminado de la tienda')
      cargar()
    } catch (err) {
      notificar(err.message, 'error')
    }
    setEliminando(null)
  }

  if (error) return <Alerta>{error}</Alerta>
  if (!productos) return <Spinner />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Productos</h1>
        <button className="btn-primario" onClick={() => setEditando('nuevo')}>+ Nuevo producto</button>
      </div>
      <input type="search" className="input sm:max-w-sm" placeholder="Buscar por nombre o categoría…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />

      <div className="tarjeta overflow-x-auto">
        <table className="tabla w-full min-w-[640px]">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th className="text-right">Precio</th>
              <th className="text-right">Stock</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr key={p.id} className={p.activo ? '' : 'opacity-60'}>
                <td>
                  <div className="flex items-center gap-3">
                    <ImagenProducto producto={p} className="h-10 w-10 shrink-0 rounded-md [&_span]:text-lg" />
                    <span className="font-medium">{p.nombre}</span>
                  </div>
                </td>
                <td className="text-slate-600">{p.categoria}</td>
                <td className="text-right">{formatoQ(p.precio)}</td>
                <td className={`text-right font-semibold ${p.stock_bajo ? 'text-amber-600' : ''}`}>{p.stock}</td>
                <td>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="text-right whitespace-nowrap">
                  <button className="btn-texto text-xs" onClick={() => setEditando(p)}>Editar</button>
                  {p.activo && (
                    <button className="btn-texto text-xs text-red-600 hover:bg-red-50" onClick={() => setEliminando(p)}>
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No hay productos que coincidan.</p>}
      </div>

      <Modal abierto={!!editando} titulo={editando === 'nuevo' ? 'Nuevo producto' : 'Editar producto'} onCerrar={() => setEditando(null)}>
        {editando && (
          <FormProducto
            key={editando === 'nuevo' ? 'nuevo' : editando.id}
            inicial={editando === 'nuevo' ? VACIO : { ...editando, imagen: editando.imagen ?? '' }}
            categorias={categorias}
            onGuardar={guardar}
            onCancelar={() => setEditando(null)}
          />
        )}
      </Modal>

      <Confirmar
        abierto={!!eliminando}
        titulo="Eliminar producto"
        mensaje={`"${eliminando?.nombre}" dejará de mostrarse en la tienda y se quitará de los carritos. Los pedidos anteriores se conservan. Puedes reactivarlo editándolo.`}
        textoBoton="Eliminar"
        peligro
        onCerrar={() => setEliminando(null)}
        onConfirmar={eliminar}
      />
    </div>
  )
}
