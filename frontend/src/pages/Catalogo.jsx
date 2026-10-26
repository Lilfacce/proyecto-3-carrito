import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import EnlaceTransicion from '../components/EnlaceTransicion.jsx'
import Icono from '../components/Iconos.jsx'
import ImagenProducto from '../components/ImagenProducto.jsx'
import { Alerta, EsqueletoTarjetas, Vacio } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatoQ } from '../format.js'
import { useAgregarAlCarrito } from '../hooks.js'

const POR_PAGINA = 12

// Posición, giro y ritmo de cada tarjeta flotante del hero (solo en pantallas anchas).
const CONSTELACION = [
  { lugar: 'left-0 top-6', giro: '-7deg', periodo: '6.5s', retraso: '150ms' },
  { lugar: 'left-16 bottom-0', giro: '5deg', periodo: '7.5s', retraso: '260ms' },
  { lugar: 'right-0 top-0', giro: '6deg', periodo: '7s', retraso: '200ms' },
  { lugar: 'right-14 bottom-4', giro: '-4deg', periodo: '8s', retraso: '320ms' },
]

function HeroFlotante({ productos }) {
  return (
    <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
      {productos.slice(0, CONSTELACION.length).map((p, i) => {
        const c = CONSTELACION[i]
        return (
          <div
            key={p.id}
            className={`flotante absolute ${c.lugar}`}
            style={{ '--giro': c.giro, '--periodo': c.periodo, '--retraso': c.retraso }}
          >
            <EnlaceTransicion
              to={`/productos/${p.id}`}
              state={{ producto: p }}
              tabIndex={-1}
              className="pointer-events-auto block w-36 rounded-[22px] bg-white p-1.5 shadow-flotante transition-shadow duration-300 hover:shadow-tarjeta"
            >
              <ImagenProducto producto={p} className="aspect-square w-full rounded-2xl" />
              <p className="truncate px-1.5 pt-2 text-xs font-semibold tracking-[-0.014em]">{p.nombre}</p>
              <p className="px-1.5 pb-1 text-xs text-gris tabular-nums">{formatoQ(p.precio)}</p>
            </EnlaceTransicion>
          </div>
        )
      })}
    </div>
  )
}

function BotonAgregar({ producto, estado, onAgregar }) {
  const agotado = producto.stock === 0
  return (
    <button
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-[background-color,transform] duration-200 ease-(--ease-out) active:scale-90 disabled:cursor-not-allowed ${
        estado === 'listo' ? 'bg-emerald-600' : 'bg-tinta hover:bg-pizarra disabled:bg-slate-300'
      }`}
      disabled={agotado || estado === 'cargando'}
      onClick={onAgregar}
      aria-label={estado === 'listo' ? `${producto.nombre} agregado al carrito` : `Agregar ${producto.nombre} al carrito`}
      title="Agregar al carrito"
    >
      {estado === 'cargando' && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {estado === 'listo' && (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" pathLength="1" className="dibujar" style={{ '--dur': '260ms' }} />
        </svg>
      )}
      {estado === 'normal' && <Icono nombre="mas" className="h-4 w-4" grosor={2.2} />}
    </button>
  )
}

function TarjetaProducto({ producto: p, indice, esAdmin, agregando, agregado, onAgregar }) {
  const estado = agregando === p.id ? 'cargando' : agregado === p.id ? 'listo' : 'normal'
  return (
    <article
      className="entrar tarjeta group flex flex-col p-2 transition-[translate,box-shadow] duration-300 ease-(--ease-out) hover:-translate-y-1 hover:shadow-flotante"
      style={{ '--i': indice }}
    >
      <EnlaceTransicion to={`/productos/${p.id}`} state={{ producto: p }} className="relative block overflow-hidden rounded-imagen">
        <ImagenProducto
          producto={p}
          className="aspect-square w-full transition-transform duration-500 ease-(--ease-out) group-hover:scale-[1.04]"
          nombreTransicion={`producto-${p.id}`}
        />
        {p.stock > 0 && p.stock <= 5 && (
          <span className="absolute bottom-2 left-2 rounded-xl bg-white/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
            ¡Quedan {p.stock}!
          </span>
        )}
        {p.stock === 0 && (
          <span className="absolute bottom-2 left-2 rounded-xl bg-white/90 px-2.5 py-1 text-xs font-medium text-red-600 backdrop-blur">
            Agotado
          </span>
        )}
      </EnlaceTransicion>
      <div className="flex flex-1 flex-col gap-0.5 px-2 pt-3 pb-2">
        <span className="text-xs text-gris">{p.categoria}</span>
        <EnlaceTransicion
          to={`/productos/${p.id}`}
          state={{ producto: p }}
          className="line-clamp-2 text-sm font-semibold tracking-[-0.014em] hover:underline"
        >
          {p.nombre}
        </EnlaceTransicion>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <p className="text-base font-semibold tracking-[-0.03em] tabular-nums">{formatoQ(p.precio)}</p>
          {!esAdmin && <BotonAgregar producto={p} estado={estado} onAgregar={() => onAgregar(p)} />}
        </div>
      </div>
    </article>
  )
}

export default function Catalogo() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const categoria = params.get('categoria') ?? ''
  const orden = params.get('orden') ?? 'nombre'

  const [busqueda, setBusqueda] = useState(q)
  const [resultado, setResultado] = useState(null) // { productos, total, pagina, paginas }
  const [cargandoMas, setCargandoMas] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [destacados, setDestacados] = useState([])
  const [error, setError] = useState('')
  const { esAdmin } = useAuth()
  const { agregarProducto, agregando, agregado } = useAgregarAlCarrito()

  const cambiarFiltro = (clave, valor) => {
    const p = new URLSearchParams(params)
    if (valor) p.set(clave, valor)
    else p.delete(clave)
    setParams(p, { replace: true })
  }

  useEffect(() => {
    api.categorias().then((r) => setCategorias(r.categorias)).catch(() => {})
    // Los más recientes con existencias flotan en el hero.
    api
      .productos({ orden: 'recientes', limite: 8 })
      .then((r) => setDestacados(r.productos.filter((p) => p.stock > 0)))
      .catch(() => {})
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
    setResultado(null)
    api
      .productos({ q, categoria, orden, limite: POR_PAGINA })
      .then((r) => vigente && setResultado(r))
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [q, categoria, orden])

  const cargarMas = async () => {
    setCargandoMas(true)
    try {
      const r = await api.productos({ q, categoria, orden, limite: POR_PAGINA, pagina: resultado.pagina + 1 })
      setResultado((prev) => ({ ...r, productos: [...prev.productos, ...r.productos] }))
    } catch (e) {
      setError(e.message)
    } finally {
      setCargandoMas(false)
    }
  }

  const buscarYa = (e) => {
    e.preventDefault()
    cambiarFiltro('q', busqueda.trim())
  }

  const productos = resultado?.productos
  const restantes = resultado ? resultado.total - productos.length : 0

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="relative">
        <HeroFlotante productos={destacados} />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center pt-4 text-center sm:pt-10 xl:py-16">
          <h1 className="text-4xl font-semibold tracking-[-0.05em] text-balance sm:text-6xl">
            Tecnología al alcance de un clic
          </h1>
          <p className="mt-4 max-w-md text-base text-slate-600">
            Audífonos, accesorios, almacenamiento y más. Compra en línea y recibe en tu casa.
          </p>

          <form onSubmit={buscarYa} role="search" className="mt-8 w-full max-w-xl">
            <label className="group/busqueda flex items-center rounded-full border border-black/10 bg-white py-1 pr-1 pl-5 shadow-suave transition-[border-color,box-shadow] duration-200 focus-within:border-black/25 focus-within:shadow-flotante">
              <span className="sr-only">Buscar productos</span>
              <input
                type="search"
                className="min-w-0 flex-1 bg-transparent py-2 text-base placeholder:text-gris focus:outline-none"
                placeholder="¿Qué estás buscando hoy?"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <button
                type="submit"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violeta text-white shadow-violeta transition-[filter,transform] duration-150 ease-(--ease-out) hover:brightness-110 active:scale-90"
                aria-label="Buscar"
              >
                <Icono
                  nombre="flecha"
                  className="h-5 w-5 transition-transform duration-200 ease-(--ease-out) group-focus-within/busqueda:translate-x-0.5"
                  grosor={2}
                />
              </button>
            </label>
          </form>

          <div className="sin-barra mt-6 flex max-w-full gap-2 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:justify-center">
            {['', ...categorias].map((c) => (
              <button
                key={c || 'todas'}
                onClick={() => cambiarFiltro('categoria', c)}
                className={`chip active:scale-95 ${categoria === c ? 'chip-activo' : ''}`}
                aria-pressed={categoria === c}
              >
                {c || 'Todas'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-1.5 text-xl font-semibold tracking-[-0.05em]">
            {q ? `Resultados para “${q}”` : categoria || 'Todos los productos'}
            {resultado && <span className="text-base font-normal tracking-normal text-slate-600">· {resultado.total}</span>}
          </h2>
          <select
            className="input w-auto py-2 pr-9 shadow-suave"
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

        <Alerta>{error}</Alerta>

        {!productos && !error ? (
          <EsqueletoTarjetas />
        ) : productos?.length === 0 ? (
          <Vacio
            titulo="No encontramos productos"
            accion={
              (q || categoria) && (
                <button
                  className="btn-secundario"
                  onClick={() => {
                    setBusqueda('')
                    setParams(orden !== 'nombre' ? { orden } : {}, { replace: true })
                  }}
                >
                  Ver todos los productos
                </button>
              )
            }
          >
            Prueba con otra búsqueda o categoría.
          </Vacio>
        ) : (
          productos && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {productos.map((p, i) => (
                  <TarjetaProducto
                    key={p.id}
                    producto={p}
                    // Las tarjetas de "cargar más" se escalonan desde cero, no desde su posición.
                    indice={i % POR_PAGINA}
                    esAdmin={esAdmin}
                    agregando={agregando}
                    agregado={agregado}
                    onAgregar={agregarProducto}
                  />
                ))}
              </div>
              {restantes > 0 && (
                <div className="flex flex-col items-center gap-2 pt-2">
                  <button className="btn-secundario px-6" onClick={cargarMas} disabled={cargandoMas}>
                    {cargandoMas ? 'Cargando…' : `Ver ${Math.min(restantes, POR_PAGINA)} productos más`}
                  </button>
                  <p className="text-xs text-slate-600 tabular-nums">
                    Mostrando {productos.length} de {resultado.total}
                  </p>
                </div>
              )}
            </>
          )
        )}
      </section>
    </div>
  )
}
