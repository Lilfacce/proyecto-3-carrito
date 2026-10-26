import { afterEach, describe, expect, test, vi } from 'vitest'
import { api, ApiError } from '../api.js'

const respuesta = (status, cuerpo) =>
  Promise.resolve(new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status }))

afterEach(() => vi.unstubAllGlobals())

describe('cliente de la API', () => {
  test('devuelve el JSON cuando la respuesta es correcta', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(200, { productos: [{ id: 1 }] })))
    await expect(api.productos({ q: 'mouse', categoria: '' })).resolves.toEqual({ productos: [{ id: 1 }] })
    // Los filtros vacíos no viajan en la URL.
    expect(fetch).toHaveBeenCalledWith('/api/productos?q=mouse', expect.objectContaining({ method: 'GET' }))
  })

  test('usa el primer detalle de validación como mensaje', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(400, { error: 'Datos inválidos', details: [{ mensaje: 'Correo inválido' }] })))
    await expect(api.login({})).rejects.toMatchObject({ status: 400, message: 'Correo inválido' })
  })

  test('un 502 del proxy se explica como falta de conexión', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(502)))
    await expect(api.me()).rejects.toThrow(/No pudimos conectar con el servidor/)
  })

  test('un fallo de red también', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    const error = await api.me().catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
  })

  test('las imágenes se envían como archivo, no como JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(201, { url: '/uploads/abc.png' })))
    const archivo = new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' })
    await api.admin.subirImagen(archivo)
    const [, opciones] = fetch.mock.calls[0]
    expect(opciones.headers['Content-Type']).toBe('image/png')
    expect(opciones.body).toBe(archivo)
  })

  test('204 no tiene cuerpo', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(204)))
    await expect(api.logout()).resolves.toBeNull()
  })
})
