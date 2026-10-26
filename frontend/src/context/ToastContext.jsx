import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(() => {})
let contador = 0

/** Notificaciones breves en la esquina de la pantalla. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const notificar = useCallback((mensaje, tipo = 'exito') => {
    const id = ++contador
    setToasts((t) => [...t, { id, mensaje, tipo }])
    // Primero se marca como saliente (baja y se desvanece) y después se quita del DOM.
    setTimeout(() => setToasts((t) => t.map((x) => (x.id === id ? { ...x, saliendo: true } : x))), 3300)
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3550)
  }, [])

  return (
    <ToastContext.Provider value={notificar}>
      {children}
      <div
        className="fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`w-full max-w-sm rounded-full px-5 py-3 text-sm text-white shadow-flotante ring-1 ring-white/20
              transition-[opacity,translate] duration-[250ms] ease-(--ease-out) starting:translate-y-3 starting:opacity-0
              motion-reduce:translate-y-0 ${t.saliendo ? 'translate-y-3 opacity-0' : ''} ${
              t.tipo === 'error' ? 'bg-red-600' : 'bg-tinta'
            }`}
          >
            {t.mensaje}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
