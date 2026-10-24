import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import ImagenProducto from '../components/ImagenProducto.jsx'
import { Alerta, Spinner, Vacio } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatoQ } from '../format.js'
import { useAgregarAlCarrito } from '../hooks.js'

export default function Catalogo() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const categoria = params.get('categoria') ?? ''
  const orden = params.get('orden') ?? 'nombre'

  const [busqueda, setBusqueda] = useState(q)
  const [productos, setProductos] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [error, setError] = useState('')
  const { esAdmin } = useAuth()
  const { agregarProducto, agregando } = useAgregarAlCarrito()

  const cambiarFiltro = (clave, valor) => {
    const p = new URLSearchParams(params)
    if (valor) p.set(clave, valor)
    else p.delete(clave)
    setParams(p, { replace: true })
  }

  useEffect(() => {
    api.categorias().then((r) => setCategorias(r.categorias)).catch(() => {})
  }, [])

  // Espera a que el usuario deje de escribir antes de buscar.
  useEffect(() => {
    const t = setTimeout(() => {
      if (busqueda !== q) cambiarFiltro('q', busqueda.trim())
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  useEffect(() => {
    let vigente = true
    setError('')
    api
      .productos({ q, categoria, orden })
      .then((r) => vigente && setProductos(r.productos))
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [q, categoria, orden])

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-marca-600 to-marca-900 px-6 py-10 text-white sm:px-10">
        <h1 className="text-2xl font-bold sm:text-4xl">Tecnología al alcance de un clic</h1>
        <p className="mt-2 max-w-xl text-marca-100">
          Audífonos, accesorios, almacenamiento y más. Compra en línea y recibe en tu casa.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar productos</span>
          <input
            type="search"
            className="input pl-10"
            placeholder="Buscar productos…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <svg className="absolute top-2.5 left-3 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
        </label>
        <select
          className="input sm:w-56"
          value={orden}
          onChange={(e) => cambiarFiltro('orden', e.target.value === 'nombre' ? '' : e.target.value)}
          aria-label="Ordenar por"
        >
          <option value="nombre">Ordenar: nombre</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
          <option value="recientes">Más recientes</option>
        </select>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {['', ...categorias].map((c) => (
          <button
            key={c || 'todas'}
            onClick={() => cambiarFiltro('categoria', c)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              categoria === c
                ? 'border-marca-600 bg-marca-600 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
            }`}
          >
            {c || 'Todas'}
          </button>
        ))}
      </div>

      <Alerta>{error}</Alerta>

      {!productos && !error ? (
        <Spinner />
      ) : productos?.length === 0 ? (
        <Vacio titulo="No encontramos productos">Prueba con otra búsqueda o categoría.</Vacio>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {productos?.map((p) => (
            <article key={p.id} className="tarjeta group flex flex-col overflow-hidden">
              <Link to={`/productos/${p.id}`} className="block">
                <ImagenProducto producto={p} className="aspect-square w-full transition group-hover:scale-[1.02]" />
              </Link>
              <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
                <span className="text-xs font-medium text-marca-600">{p.categoria}</span>
                <Link to={`/productos/${p.id}`} className="line-clamp-2 text-sm font-semibold text-slate-800 hover:text-marca-700 sm:text-base">
                  {p.nombre}
                </Link>
                <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                  <div>
                    <p className="text-base font-bold sm:text-lg">{formatoQ(p.precio)}</p>
                    <p className={`text-xs ${p.stock === 0 ? 'text-red-600' : p.stock <= 5 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {p.stock === 0 ? 'Agotado' : p.stock <= 5 ? `¡Quedan ${p.stock}!` : 'Disponible'}
                    </p>
                  </div>
                </div>
                {!esAdmin && (
                  <button
                    className="btn-primario mt-2 w-full"
                    disabled={p.stock === 0 || agregando === p.id}
                    onClick={() => agregarProducto(p)}
                  >
                    {agregando === p.id ? 'Agregando…' : 'Agregar'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
