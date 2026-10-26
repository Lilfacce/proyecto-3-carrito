import { useEffect, useId, useRef } from 'react'
import { ESTADOS } from '../format.js'
import Icono from './Iconos.jsx'

export function Spinner({ texto = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-600" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-borde border-t-tinta" />
      {texto}
    </div>
  )
}

export function Alerta({ children, tipo = 'error' }) {
  const estilos = {
    error: 'border-red-200 bg-red-50 text-red-700',
    aviso: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-borde bg-canvas text-tinta',
  }
  if (!children) return null
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${estilos[tipo]}`} role="alert">
      {children}
    </div>
  )
}

export function Vacio({ titulo, children, accion }) {
  return (
    <div className="tarjeta flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="text-xl font-semibold tracking-[-0.05em]">{titulo}</p>
      {children && <p className="mb-2 max-w-md text-sm text-gris">{children}</p>}
      {accion}
    </div>
  )
}

export function EstadoBadge({ estado }) {
  const e = ESTADOS[estado] ?? { texto: estado, clase: 'bg-slate-100' }
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${e.clase}`}>{e.texto}</span>
}

// Pila de modales abiertos: Escape y Tab solo actúan sobre el de arriba.
const pilaModales = []
const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

export function Modal({ abierto, titulo, onCerrar, children, ancho = 'max-w-lg' }) {
  const id = useId()
  const dialogo = useRef(null)
  // onCerrar suele ser una función nueva en cada render; se guarda aparte para no reabrir el efecto.
  const cerrar = useRef(onCerrar)
  useEffect(() => {
    cerrar.current = onCerrar
  })

  useEffect(() => {
    if (!abierto) return
    const anterior = document.activeElement
    pilaModales.push(id)
    document.body.style.overflow = 'hidden'
    dialogo.current?.focus()

    const teclado = (e) => {
      if (pilaModales.at(-1) !== id) return
      if (e.key === 'Escape') return cerrar.current()
      if (e.key !== 'Tab' || !dialogo.current) return
      const nodos = [...dialogo.current.querySelectorAll(ENFOCABLES)]
      if (nodos.length === 0) return
      const [primero, ultimo] = [nodos[0], nodos.at(-1)]
      if (e.shiftKey && (document.activeElement === primero || document.activeElement === dialogo.current)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
    window.addEventListener('keydown', teclado)
    return () => {
      window.removeEventListener('keydown', teclado)
      pilaModales.splice(pilaModales.indexOf(id), 1)
      if (pilaModales.length === 0) document.body.style.overflow = ''
      anterior?.focus?.()
    }
  }, [abierto, id])

  if (!abierto) return null
  return (
    <div className="aparecer fixed inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={`subir max-h-[92vh] w-full ${ancho} overflow-y-auto rounded-t-tarjeta bg-white shadow-flotante outline-none sm:rounded-tarjeta`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between bg-white px-6 pt-5 pb-3">
          <h2 className="text-xl font-semibold tracking-[-0.05em]">{titulo}</h2>
          <button onClick={onCerrar} className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-sm text-tinta hover:bg-borde" aria-label="Cerrar">
            <Icono nombre="cerrar" className="h-4 w-4" grosor={2} />
          </button>
        </div>
        <div className="px-6 pt-2 pb-6">{children}</div>
      </div>
    </div>
  )
}

export function Confirmar({ abierto, titulo, mensaje, textoBoton = 'Confirmar', peligro, onConfirmar, onCerrar }) {
  return (
    <Modal abierto={abierto} titulo={titulo} onCerrar={onCerrar} ancho="max-w-md">
      <p className="text-sm text-slate-600">{mensaje}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secundario" onClick={onCerrar}>
          Cancelar
        </button>
        <button className={peligro ? 'btn-peligro' : 'btn-primario'} onClick={onConfirmar}>
          {textoBoton}
        </button>
      </div>
    </Modal>
  )
}

export function Cantidad({ valor, max, onCambiar, deshabilitado }) {
  return (
    <div className="inline-flex items-center rounded-full border border-borde bg-white shadow-suave">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none text-tinta hover:bg-canvas disabled:opacity-30"
        onClick={() => onCambiar(valor - 1)}
        disabled={deshabilitado || valor <= 1}
        aria-label="Disminuir cantidad"
      >
        <Icono nombre="menos" className="h-4 w-4" grosor={2} />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {valor}
      </span>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none text-tinta hover:bg-canvas disabled:opacity-30"
        onClick={() => onCambiar(valor + 1)}
        disabled={deshabilitado || valor >= max}
        aria-label="Aumentar cantidad"
      >
        <Icono nombre="mas" className="h-4 w-4" grosor={2} />
      </button>
    </div>
  )
}

export function EsqueletoTarjetas({ cantidad = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4" role="status" aria-label="Cargando productos">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="tarjeta p-2" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="esqueleto aspect-square w-full" style={{ animationDelay: `${i * 80}ms` }} />
          <div className="space-y-2 px-2 pt-4 pb-3">
            <div className="esqueleto h-2.5 w-1/3 rounded-full" />
            <div className="esqueleto h-3 w-3/4 rounded-full" />
            <div className="esqueleto mt-4 h-4 w-1/3 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Botón "Ver más" al pie de una tabla o lista paginada en el cliente. */
export function VerMas({ restantes, mostrados, total, onClick, tamano = 15 }) {
  if (restantes <= 0) return null
  return (
    <div className="flex flex-col items-center gap-1.5 border-t border-borde p-4">
      <button className="btn-secundario" onClick={onClick}>
        Ver {Math.min(restantes, tamano)} más
      </button>
      <p className="text-xs text-gris tabular-nums">
        Mostrando {mostrados} de {total}
      </p>
    </div>
  )
}
