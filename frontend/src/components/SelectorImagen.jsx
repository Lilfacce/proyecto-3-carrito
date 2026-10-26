import { useRef, useState } from 'react'
import { api } from '../api.js'
import Icono from './Iconos.jsx'
import ImagenProducto from './ImagenProducto.jsx'

const TIPOS = ['image/png', 'image/jpeg', 'image/webp']
const MAX_MB = 2

/**
 * Foto del producto: se sube un archivo (clic o arrastrar y soltar) o se pega una URL.
 * El valor es la ruta que se guarda en el producto ("/uploads/…" o "https://…").
 */
export default function SelectorImagen({ valor, onCambiar, producto }) {
  const entrada = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const [encima, setEncima] = useState(false)
  const [error, setError] = useState('')

  const subir = async (archivo) => {
    setError('')
    if (!archivo) return
    if (!TIPOS.includes(archivo.type)) return setError('Usa una imagen PNG, JPG o WebP.')
    if (archivo.size > MAX_MB * 1024 * 1024) return setError(`La imagen pesa más de ${MAX_MB} MB.`)
    setSubiendo(true)
    try {
      const { url } = await api.admin.subirImagen(archivo)
      onCambiar(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="space-y-2">
      <span className="label">
        Foto del producto <span className="text-gris">(opcional)</span>
      </span>
      <div
        className={`flex items-center gap-4 rounded-imagen border border-dashed p-3 transition-colors duration-200 ${
          encima ? 'border-tinta bg-canvas' : 'border-black/15'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setEncima(true)
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault()
          setEncima(false)
          subir(e.dataTransfer.files[0])
        }}
      >
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
          <ImagenProducto key={valor} producto={{ ...producto, imagen: valor || null }} className="h-full w-full" />
          {subiendo && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-borde border-t-tinta" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 text-sm">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secundario px-4 py-1.5" onClick={() => entrada.current?.click()} disabled={subiendo}>
              <Icono nombre="subir" className="h-4 w-4" />
              {subiendo ? 'Subiendo…' : valor ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {valor && (
              <button type="button" className="btn-texto px-3 py-1.5 text-red-600" onClick={() => onCambiar('')} disabled={subiendo}>
                Quitar
              </button>
            )}
          </div>
          <p className="text-xs text-gris">PNG, JPG o WebP de hasta {MAX_MB} MB. También puedes arrastrarla aquí.</p>
        </div>
        <input
          ref={entrada}
          type="file"
          accept={TIPOS.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-label="Elegir archivo de imagen"
          onChange={(e) => {
            subir(e.target.files[0])
            e.target.value = ''
          }}
        />
      </div>
      {error && (
        <p className="pl-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      <details className="pl-1 text-xs text-gris">
        <summary className="cursor-pointer select-none hover:text-tinta">O usar una URL de internet</summary>
        <input
          type="url"
          className="input mt-2"
          placeholder="https://…"
          value={valor?.startsWith('/uploads/') ? '' : (valor ?? '')}
          onChange={(e) => onCambiar(e.target.value)}
          aria-label="URL de la imagen"
        />
      </details>
    </div>
  )
}
