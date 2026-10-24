const moneda = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' })
const fecha = new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' })

export const formatoQ = (n) => moneda.format(Number(n) || 0)
export const formatoFecha = (iso) => fecha.format(new Date(iso))

export const ESTADOS = {
  pendiente: { texto: 'Pendiente', clase: 'bg-amber-100 text-amber-800' },
  enviado: { texto: 'Enviado', clase: 'bg-sky-100 text-sky-800' },
  entregado: { texto: 'Entregado', clase: 'bg-emerald-100 text-emerald-800' },
  cancelado: { texto: 'Cancelado', clase: 'bg-slate-200 text-slate-600' },
}
