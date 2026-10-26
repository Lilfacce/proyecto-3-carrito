// Cliente HTTP de la API. La sesión viaja en una cookie httpOnly, así que el
// token nunca está accesible desde JavaScript.

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

const SIN_CONEXION = 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'

async function request(method, url, body) {
  // Un archivo (Blob/File) se envía tal cual con su tipo; lo demás, como JSON.
  const esArchivo = body instanceof Blob
  let res
  try {
    res = await fetch(`/api${url}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': esArchivo ? body.type : 'application/json' } : undefined,
      body: body === undefined ? undefined : esArchivo ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, SIN_CONEXION)
  }
  if (res.status === 204) return null
  // 502/503/504: el proxy no alcanzó la API (servidor caído o reiniciándose).
  if ([502, 503, 504].includes(res.status)) throw new ApiError(res.status, SIN_CONEXION)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detalle = Array.isArray(data.details) && data.details[0]?.mensaje
    throw new ApiError(res.status, detalle || data.error || 'Ocurrió un error inesperado', data.details)
  }
  return data
}

const qs = (params = {}) => {
  const limpio = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  const s = new URLSearchParams(limpio).toString()
  return s ? `?${s}` : ''
}

export const api = {
  // Autenticación
  me: () => request('GET', '/auth/me'),
  login: (datos) => request('POST', '/auth/login', datos),
  registro: (datos) => request('POST', '/auth/registro', datos),
  logout: () => request('POST', '/auth/logout'),
  recuperarPassword: (email) => request('POST', '/auth/recuperar', { email }),
  restablecerPassword: (token, password) => request('POST', '/auth/restablecer', { token, password }),
  actualizarPerfil: (datos) => request('PUT', '/auth/me', datos),
  cambiarPassword: (datos) => request('PUT', '/auth/me/password', datos),

  // Catálogo
  productos: (filtros) => request('GET', `/productos${qs(filtros)}`),
  producto: (id) => request('GET', `/productos/${id}`),
  categorias: () => request('GET', '/productos/categorias'),

  // Carrito
  carrito: () => request('GET', '/carrito'),
  agregarAlCarrito: (producto_id, cantidad = 1) => request('POST', '/carrito', { producto_id, cantidad }),
  cambiarCantidad: (producto_id, cantidad) => request('PUT', `/carrito/${producto_id}`, { cantidad }),
  quitarDelCarrito: (producto_id) => request('DELETE', `/carrito/${producto_id}`),
  vaciarCarrito: () => request('DELETE', '/carrito'),

  // Pedidos del cliente
  confirmarCompra: (datos) => request('POST', '/pedidos', datos),
  misPedidos: () => request('GET', '/pedidos/mios'),
  miPedido: (id) => request('GET', `/pedidos/mios/${id}`),
  cancelarMiPedido: (id) => request('POST', `/pedidos/mios/${id}/cancelar`),

  // Administración
  admin: {
    dashboard: () => request('GET', '/admin/dashboard'),
    productos: () => request('GET', '/productos/admin/todos'),
    crearProducto: (datos) => request('POST', '/productos', datos),
    subirImagen: (archivo) => request('POST', '/admin/imagenes', archivo),
    editarProducto: (id, datos) => request('PUT', `/productos/${id}`, datos),
    eliminarProducto: (id) => request('DELETE', `/productos/${id}`),
    ajustarStock: (id, ajuste) => request('PATCH', `/productos/${id}/stock`, { ajuste }),
    pedidos: (filtros) => request('GET', `/pedidos${qs(filtros)}`),
    pedido: (id) => request('GET', `/pedidos/${id}`),
    cambiarEstado: (id, estado) => request('PATCH', `/pedidos/${id}/estado`, { estado }),
    usuarios: (filtros) => request('GET', `/admin/usuarios${qs(filtros)}`),
    usuario: (id) => request('GET', `/admin/usuarios/${id}`),
    crearUsuario: (datos) => request('POST', '/admin/usuarios', datos),
    editarUsuario: (id, datos) => request('PATCH', `/admin/usuarios/${id}`, datos),
  },
}
