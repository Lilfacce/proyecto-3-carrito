import { Component } from 'react'
import Icono from './Iconos.jsx'

/**
 * Si una página falla al renderizar, muestra un aviso en lugar de dejar la pantalla en blanco.
 * Al navegar a otra ruta el aviso se quita y se intenta mostrar la nueva página.
 */
export default class LimiteError extends Component {
  state = { error: null, ruta: this.props.ruta }

  static getDerivedStateFromError(error) {
    return { error }
  }

  static getDerivedStateFromProps(props, state) {
    return props.ruta !== state.ruta ? { error: null, ruta: props.ruta } : null
  }

  componentDidCatch(error, info) {
    console.error('Error en la interfaz:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="subir tarjeta flex max-w-md flex-col items-center gap-3 px-8 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-amber-700">
            <Icono nombre="alerta" className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-[-0.05em]">Algo salió mal</h1>
          <p className="text-sm text-gris">
            Esta página tuvo un problema inesperado. Tus datos y tu carrito están a salvo.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button className="btn-primario" onClick={() => window.location.reload()}>
              Recargar la página
            </button>
            <a href="/" className="btn-secundario">
              Ir al catálogo
            </a>
          </div>
        </div>
      </div>
    )
  }
}
