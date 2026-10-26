import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { HttpError } from './errors.js';

export const COOKIE_NAME = 'token';

export const cookieOptions = {
  httpOnly: true, // JavaScript del navegador no puede leer el token (mitiga XSS)
  sameSite: 'lax', // el navegador no lo envía en peticiones cross-site (mitiga CSRF)
  secure: config.isProd,
  path: '/',
};

export function firmarToken(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/** Firma el token y lo guarda en la cookie. La cookie vence junto con el token (JWT_EXPIRES_IN). */
export function iniciarSesion(res, usuario) {
  const token = firmarToken(usuario);
  const { iat, exp } = jwt.decode(token);
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: (exp - iat) * 1000 });
}

/**
 * Defensa adicional contra CSRF: rechaza peticiones que modifican datos (POST, PUT, PATCH, DELETE)
 * cuando el navegador indica un Origin distinto al del propio servidor o a los permitidos.
 */
export function verificarOrigen(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origen = req.get('origin');
  if (!origen) return next(); // clientes que no son navegadores (curl, pruebas) no envían Origin
  const propio = `${req.protocol}://${req.get('host')}`;
  if (origen === propio || config.origenesPermitidos.includes(origen)) return next();
  throw new HttpError(403, 'Origen de la petición no permitido');
}

/** Exige sesión válida. Consulta la BD para que desactivar un usuario tenga efecto inmediato. */
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new HttpError(401, 'Debes iniciar sesión');

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    throw new HttpError(401, 'Sesión inválida o expirada');
  }

  const { rows } = await query(
    'SELECT id, nombre, email, rol, activo, telefono, direccion, password_cambiado_en FROM usuarios WHERE id = $1',
    [payload.sub],
  );
  const usuario = rows[0];
  if (!usuario || !usuario.activo) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    throw new HttpError(401, 'La cuenta no existe o está desactivada');
  }
  // El JWT guarda la emisión en segundos y el cambio se guarda truncado al segundo: un token
  // emitido en el mismo segundo del cambio (la sesión renovada) sigue siendo válido.
  const cambio = usuario.password_cambiado_en;
  if (cambio && payload.iat < Math.floor(cambio.getTime() / 1000)) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    throw new HttpError(401, 'Tu contraseña cambió. Inicia sesión de nuevo.');
  }
  delete usuario.password_cambiado_en;
  req.usuario = usuario;
  next();
}

export function requireRol(rol) {
  return (req, res, next) => {
    if (req.usuario?.rol !== rol) throw new HttpError(403, 'No tienes permiso para esta acción');
    next();
  };
}

export const requireAdmin = [requireAuth, requireRol('admin')];
