import { flushSync } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'

/**
 * Link que navega dentro de una View Transition: la página se funde y los elementos con el mismo
 * `view-transition-name` (la imagen del producto) viajan de su posición vieja a la nueva.
 * El `viewTransition` de React Router solo funciona con data routers; esta app usa BrowserRouter.
 * Sin soporte del navegador o con "reducir movimiento", se comporta como un Link normal.
 */
export default function EnlaceTransicion({ to, state, onClick, ...props }) {
  const navigate = useNavigate()
  const alHacerClic = (e) => {
    onClick?.(e)
    const modificado = e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
    if (e.defaultPrevented || modificado || !document.startViewTransition) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    e.preventDefault()
    // flushSync hace que React pinte la página nueva dentro del callback, antes de la "foto" final.
    document.startViewTransition(() => flushSync(() => navigate(to, { state })))
  }
  return <Link to={to} state={state} onClick={alHacerClic} {...props} />
}
