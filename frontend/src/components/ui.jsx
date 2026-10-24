import { useEffect } from 'react'
import { ESTADOS } from '../format.js'

export function Spinner({ texto = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-marca-600" />
      {texto}
    </div>
  )
}

export function Alerta({ children, tipo = 'error' }) {
  const estilos = {
    error: 'border-red-200 bg-red-50 text-red-700',
    aviso: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-marca-100 bg-marca-50 text-marca-900',
  }
  if (!children) return null
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${estilos[tipo]}`} role="alert">
      {children}
    </div>
  )
}

export function Vacio({ titulo, children, accion }) {
  return (
    <div className="tarjeta flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="text-lg font-semibold text-slate-700">{titulo}</p>
      {children && <p className="max-w-md text-sm text-slate-500">{children}</p>}
      {accion}
    </div>
  )
}

export function EstadoBadge({ estado }) {
  const e = ESTADOS[estado] ?? { texto: estado, clase: 'bg-slate-100' }
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${e.clase}`}>{e.texto}</span>
}

export function Modal({ abierto, titulo, onCerrar, children, ancho = 'max-w-lg' }) {
  useEffect(() => {
    if (!abierto) return
    const esc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [abierto, onCerrar])

  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`max-h-[92vh] w-full ${ancho} overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button onClick={onCerrar} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
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
    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
      <button
        type="button"
        className="px-3 py-1.5 text-lg leading-none text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        onClick={() => onCambiar(valor - 1)}
        disabled={deshabilitado || valor <= 1}
        aria-label="Disminuir cantidad"
      >
        −
      </button>
      <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite">
        {valor}
      </span>
      <button
        type="button"
        className="px-3 py-1.5 text-lg leading-none text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        onClick={() => onCambiar(valor + 1)}
        disabled={deshabilitado || valor >= max}
        aria-label="Aumentar cantidad"
      >
        +
      </button>
    </div>
  )
}
