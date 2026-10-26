import Icono from './Iconos.jsx'

// Deben coincidir con passwordSchema del backend.
const reglas = (p) => [
  { ok: p.length >= 8, texto: 'Al menos 8 caracteres' },
  { ok: /[A-Za-z]/.test(p), texto: 'Al menos una letra' },
  { ok: /\d/.test(p), texto: 'Al menos un número' },
]

// eslint-disable-next-line react-refresh/only-export-components
export const cumpleReglas = (p) => reglas(p).every((r) => r.ok)

/** Lista de requisitos que se marcan conforme el usuario escribe la contraseña. */
export default function ReglasPassword({ password }) {
  return (
    <ul className="mt-2 space-y-1 pl-1 text-xs">
      {reglas(password).map((r) => (
        <li key={r.texto} className={`flex items-center gap-1.5 transition-colors duration-200 ${r.ok ? 'text-emerald-700' : 'text-gris'}`}>
          <Icono nombre={r.ok ? 'check' : 'circulo'} className="h-3.5 w-3.5" grosor={2} /> {r.texto}
        </li>
      ))}
    </ul>
  )
}
