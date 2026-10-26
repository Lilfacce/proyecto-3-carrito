import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from '../api.js'
import Catalogo from '../pages/Catalogo.jsx'

const agregar = vi.fn()
const notificar = vi.fn()
let usuario = { id: 1, rol: 'cliente' }

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => ({ usuario, esAdmin: usuario?.rol === 'admin' }) }))
vi.mock('../context/CartContext.jsx', () => ({ useCart: () => ({ agregar }) }))
vi.mock('../context/ToastContext.jsx', () => ({ useToast: () => notificar }))

const producto = (id, extra = {}) => ({ id, nombre: `Producto ${id}`, precio: 100 + id, stock: 10, categoria: 'Audio', imagen: null, ...extra })
const catalogo = Array.from({ length: 15 }, (_, i) => producto(i + 1))

/** Simula GET /productos con la misma paginación que el backend. */
function simularApi() {
  vi.spyOn(api, 'categorias').mockResolvedValue({ categorias: ['Audio', 'Wearables'] })
  vi.spyOn(api, 'productos').mockImplementation(async ({ q = '', limite, pagina = 1 } = {}) => {
    const lista = catalogo.filter((p) => p.nombre.toLowerCase().includes(q.toLowerCase()))
    const parte = limite ? lista.slice((pagina - 1) * limite, pagina * limite) : lista
    return { productos: parte, total: lista.length, pagina, paginas: limite ? Math.ceil(lista.length / limite) : 1 }
  })
}

function Ubicacion() {
  const { pathname, search } = useLocation()
  return <p data-testid="ubicacion">{pathname + search}</p>
}

const montar = (ruta = '/') =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="*" element={null} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  )

const tarjetas = () => screen.getAllByRole('article')

describe('Catálogo', () => {
  beforeEach(() => {
    usuario = { id: 1, rol: 'cliente' }
    simularApi()
  })

  test('muestra un skeleton mientras carga y luego la primera página', async () => {
    montar()
    expect(screen.getByRole('status', { name: 'Cargando productos' })).toBeInTheDocument()
    await waitFor(() => expect(tarjetas()).toHaveLength(12))
    expect(screen.getByText('· 15')).toBeInTheDocument()
  })

  test('"Ver más" agrega la siguiente página sin repetir productos', async () => {
    const user = userEvent.setup()
    montar()
    await user.click(await screen.findByRole('button', { name: 'Ver 3 productos más' }))
    await waitFor(() => expect(tarjetas()).toHaveLength(15))
    const nombres = tarjetas().map((t) => within(t).getAllByRole('link')[1].textContent)
    expect(new Set(nombres).size).toBe(15)
    expect(screen.queryByRole('button', { name: /productos más/ })).not.toBeInTheDocument()
  })

  test('sin resultados ofrece volver a ver todo', async () => {
    const user = userEvent.setup()
    montar('/?q=inexistente')
    await user.click(await screen.findByRole('button', { name: 'Ver todos los productos' }))
    await waitFor(() => expect(screen.getByTestId('ubicacion')).toHaveTextContent(/^\/$/))
    await waitFor(() => expect(tarjetas()).toHaveLength(12))
  })

  test('el botón + agrega al carrito y confirma con un check', async () => {
    const user = userEvent.setup()
    agregar.mockResolvedValue()
    montar()
    await user.click(await screen.findByRole('button', { name: 'Agregar Producto 1 al carrito' }))
    expect(agregar).toHaveBeenCalledWith(1, 1)
    expect(await screen.findByRole('button', { name: 'Producto 1 agregado al carrito' })).toBeInTheDocument()
    expect(notificar).toHaveBeenCalledWith('Producto 1 se agregó al carrito')
  })

  test('sin sesión, agregar lleva a iniciar sesión', async () => {
    const user = userEvent.setup()
    usuario = null
    montar()
    await user.click(await screen.findByRole('button', { name: 'Agregar Producto 1 al carrito' }))
    expect(agregar).not.toHaveBeenCalled()
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/login')
  })

  test('un administrador no ve botones para agregar', async () => {
    usuario = { id: 9, rol: 'admin' }
    montar()
    await waitFor(() => expect(tarjetas()).toHaveLength(12))
    expect(screen.queryByRole('button', { name: /al carrito/ })).not.toBeInTheDocument()
  })

  test('los productos agotados no se pueden agregar', async () => {
    catalogo[0] = producto(1, { stock: 0 })
    montar()
    const boton = await screen.findByRole('button', { name: 'Agregar Producto 1 al carrito' })
    expect(boton).toBeDisabled()
    expect(within(tarjetas()[0]).getByText('Agotado')).toBeInTheDocument()
    catalogo[0] = producto(1)
  })
})
