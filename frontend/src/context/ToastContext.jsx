import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(() => {})
let contador = 0

/** Notificaciones breves en la esquina de la pantalla. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const notificar = useCallback((mensaje, tipo = 'exito') => {
    const id = ++contador
    setToasts((t) => [...t, { id, mensaje, tipo }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
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
            className={`w-full max-w-sm rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              t.tipo === 'error' ? 'bg-red-600' : 'bg-slate-900'
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
