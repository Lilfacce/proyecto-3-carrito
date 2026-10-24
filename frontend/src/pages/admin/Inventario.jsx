import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api.js'
import { Alerta, Spinner } from '../../components/ui.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatoQ } from '../../format.js'

function FilaInventario({ producto, onActualizado }) {
  const notificar = useToast()
  const [ajuste, setAjuste] = useState('')
  const [guardando, setGuardando] = useState(false)

  const aplicar = async (valor) => {
    const n = Number(valor)
    if (!Number.isInteger(n) || n === 0) return
    setGuardando(true)
    try {
      const r = await api.admin.ajustarStock(producto.id, n)
      onActualizado(r.producto)
      setAjuste('')
      notificar(`Stock de ${producto.nombre}: ${r.producto.stock}`)
    } catch (err) {
      notificar(err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  const nivel = producto.stock === 0 ? 'agotado' : producto.stock <= producto.stock_minimo ? 'bajo' : 'ok'
  const estilos = {
    agotado: 'bg-red-100 text-red-700',
    bajo: 'bg-amber-100 text-amber-800',
    ok: 'bg-emerald-100 text-emerald-700',
  }
  const textos = { agotado: 'Agotado', bajo: 'Stock bajo', ok: 'Normal' }

  return (
    <tr>
      <td className="font-medium">{producto.nombre}</td>
      <td className="text-right text-lg font-bold">{producto.stock}</td>
      <td className="text-right text-slate-500">{producto.stock_minimo}</td>
      <td>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estilos[nivel]}`}>{textos[nivel]}</span>
      </td>
      <td className="text-right text-slate-600">{formatoQ(producto.precio * producto.stock)}</td>
      <td>
        <form
          className="flex items-center justify-end gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            aplicar(ajuste)
          }}
        >
          <button type="button" className="btn-secundario px-2 py-1" disabled={guardando || producto.stock === 0} onClick={() => aplicar(-1)} aria-label="Restar 1">−1</button>
          <input
            type="number"
            step="1"
            className="input w-20 py-1 text-center"
            placeholder="±"
            value={ajuste}
            onChange={(e) => setAjuste(e.target.value)}
            aria-label={`Ajuste de stock para ${producto.nombre}`}
          />
          <button className="btn-primario px-2 py-1" disabled={guardando || !ajuste}>Aplicar</button>
          <button type="button" className="btn-secundario px-2 py-1" disabled={guardando} onClick={() => aplicar(10)}>+10</button>
        </form>
      </td>
    </tr>
  )
}

export default function Inventario() {
  const [productos, setProductos] = useState(null)
  const [error, setError] = useState('')
  const [soloBajo, setSoloBajo] = useState(false)

  const cargar = useCallback(() => {
    api.admin
      .productos()
      .then((r) => setProductos(r.productos.filter((p) => p.activo)))
      .catch((e) => setError(e.message))
  }, [])
  useEffect(cargar, [cargar])

  if (error) return <Alerta>{error}</Alerta>
  if (!productos) return <Spinner />

  const bajos = productos.filter((p) => p.stock <= p.stock_minimo)
  const lista = soloBajo ? bajos : productos
  const unidades = productos.reduce((s, p) => s + p.stock, 0)
  const valor = productos.reduce((s, p) => s + p.stock * p.precio, 0)

  const actualizar = (nuevo) =>
    setProductos((ps) => ps.map((p) => (p.id === nuevo.id ? { ...nuevo, stock_bajo: nuevo.stock <= nuevo.stock_minimo } : p)))

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Inventario</h1>
      <div className="grid grid-cols-3 gap-3">
        <div className="tarjeta p-4"><p className="text-xs text-slate-500 uppercase">Unidades</p><p className="text-xl font-bold">{unidades}</p></div>
        <div className="tarjeta p-4"><p className="text-xs text-slate-500 uppercase">Valor</p><p className="text-xl font-bold">{formatoQ(valor)}</p></div>
        <div className="tarjeta p-4"><p className="text-xs text-slate-500 uppercase">Stock bajo</p><p className="text-xl font-bold text-amber-600">{bajos.length}</p></div>
      </div>

      {bajos.length > 0 && (
        <Alerta tipo="aviso">
          Hay {bajos.length} producto(s) en o por debajo de su stock mínimo: {bajos.map((p) => p.nombre).join(', ')}.
        </Alerta>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-marca-600" checked={soloBajo} onChange={(e) => setSoloBajo(e.target.checked)} />
        Mostrar solo productos con stock bajo
      </label>

      <div className="tarjeta overflow-x-auto">
        <table className="tabla w-full min-w-[720px]">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="text-right">Stock</th>
              <th className="text-right">Mínimo</th>
              <th>Nivel</th>
              <th className="text-right">Valor</th>
              <th className="text-right">Ajustar (entradas + / salidas −)</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => <FilaInventario key={p.id} producto={p} onActualizado={actualizar} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
