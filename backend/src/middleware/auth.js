import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { HttpError } from './errors.js';

export const COOKIE_NAME = 'token';

export const cookieOptions = {
  httpOnly: true, // JavaScript del navegador no puede leer el token (mitiga XSS)
  sameSite: 'lax', // el navegador no lo envía en peticiones cross-site (mitiga CSRF)
  secure: config.isProd,
  maxAge: 8 * 60 * 60 * 1000,
  path: '/',
};

export function firmarToken(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
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
    'SELECT id, nombre, email, rol, activo, telefono, direccion FROM usuarios WHERE id = $1',
    [payload.sub],
  );
  const usuario = rows[0];
  if (!usuario || !usuario.activo) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    throw new HttpError(401, 'La cuenta no existe o está desactivada');
  }
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
