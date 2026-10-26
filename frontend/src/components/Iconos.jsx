// Íconos de trazo (24×24, línea de 1.6) dibujados a mano para no depender de emojis.
const TRAZOS = {
  audio: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2v-3Zm16 0a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2v-3Z',
  computacion: 'M5 5h14a1 1 0 0 1 1 1v9H4V6a1 1 0 0 1 1-1Zm-3 10h20l-1 3H3l-1-3Z',
  almacenamiento: 'M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4Zm3 0v5h7V4M8 20v-6h8v6',
  accesorios: 'M9 3v5m6-5v5M7 8h10v3a5 5 0 0 1-10 0V8Zm5 8v5',
  wearables: 'M9 3h6l1 4H8l1-4Zm0 18h6l1-4H8l1 4Zm3-13a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 3v2l1.5 1',
  caja: 'm12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9',
  resumen: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  etiqueta: 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Zm5-4.5h.01',
  inventario: 'm12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9',
  recibo: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3',
  usuarios: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10a7 7 0 0 1 14 0m1-10a3 3 0 1 0 0-6m5 16a6 6 0 0 0-4-5.6',
  cerrar: 'M6 6l12 12M18 6 6 18',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  circulo: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
  candado: 'M6 10h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Zm2 0V7a4 4 0 0 1 8 0v3',
  alerta: 'M12 4 2.5 20h19L12 4Zm0 6v4m0 3h.01',
  menos: 'M5 12h14',
  mas: 'M12 5v14M5 12h14',
  flecha: 'M5 12h14m-6-6 6 6-6 6',
  flechaAtras: 'M19 12H5m6-6-6 6 6 6',
  subir: 'M12 16V4m-5 5 5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  correo: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm-1 1 9 6 9-6',
}

export default function Icono({ nombre, className = 'h-5 w-5', grosor = 1.6 }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={TRAZOS[nombre] ?? TRAZOS.caja} />
    </svg>
  )
}

const POR_CATEGORIA = {
  Audio: 'audio',
  Computación: 'computacion',
  Almacenamiento: 'almacenamiento',
  Accesorios: 'accesorios',
  Wearables: 'wearables',
}
export function IconoCategoria({ categoria, ...props }) {
  return <Icono nombre={POR_CATEGORIA[categoria] ?? 'caja'} {...props} />
}
