import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { COOKIE_NAME, cookieOptions, firmarToken, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';

const router = Router();

// Frena ataques de fuerza bruta sobre login/registro.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.env === 'test' ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña es demasiado larga')
  .regex(/[A-Za-z]/, 'La contraseña debe incluir al menos una letra')
  .regex(/\d/, 'La contraseña debe incluir al menos un número');

const registroSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre es muy corto').max(100),
  email: z.string().trim().toLowerCase().max(150).pipe(z.email('Correo inválido')),
  password: passwordSchema,
  telefono: z.string().trim().max(20).optional(),
  direccion: z.string().trim().max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1),
});

const perfilSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  telefono: z.string().trim().max(20).optional().nullable(),
  direccion: z.string().trim().max(255).optional().nullable(),
});

const passwordCambioSchema = z.object({
  actual: z.string().min(1),
  nueva: passwordSchema,
});

const publico = ({ id, nombre, email, rol, telefono, direccion }) => ({
  id,
  nombre,
  email,
  rol,
  telefono,
  direccion,
});

router.post('/registro', authLimiter, async (req, res) => {
  const datos = registroSchema.parse(req.body);
  const hash = await bcrypt.hash(datos.password, config.bcryptRounds);
  try {
    const { rows } = await query(
      `INSERT INTO usuarios (nombre, email, password_hash, telefono, direccion)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, email, rol, telefono, direccion`,
      [datos.nombre, datos.email, hash, datos.telefono ?? null, datos.direccion ?? null],
    );
    const usuario = rows[0];
    res.cookie(COOKIE_NAME, firmarToken(usuario), cookieOptions);
    res.status(201).json({ usuario: publico(usuario) });
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'Ya existe una cuenta con ese correo');
    throw err;
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const { rows } = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
  const usuario = rows[0];
  // Mismo mensaje si el correo no existe o la contraseña es incorrecta (no revela qué cuentas existen).
  const ok = usuario && (await bcrypt.compare(password, usuario.password_hash));
  if (!ok) throw new HttpError(401, 'Correo o contraseña incorrectos');
  if (!usuario.activo) throw new HttpError(403, 'Tu cuenta está desactivada. Contacta al administrador.');

  res.cookie(COOKIE_NAME, firmarToken(usuario), cookieOptions);
  res.json({ usuario: publico(usuario) });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ usuario: publico(req.usuario) });
});

router.put('/me', requireAuth, async (req, res) => {
  const datos = perfilSchema.parse(req.body);
  const { rows } = await query(
    `UPDATE usuarios SET nombre = $1, telefono = $2, direccion = $3 WHERE id = $4
     RETURNING id, nombre, email, rol, telefono, direccion`,
    [datos.nombre, datos.telefono ?? null, datos.direccion ?? null, req.usuario.id],
  );
  res.json({ usuario: publico(rows[0]) });
});

router.put('/me/password', requireAuth, async (req, res) => {
  const { actual, nueva } = passwordCambioSchema.parse(req.body);
  const { rows } = await query('SELECT password_hash FROM usuarios WHERE id = $1', [req.usuario.id]);
  if (!(await bcrypt.compare(actual, rows[0].password_hash))) {
    throw new HttpError(400, 'La contraseña actual no es correcta');
  }
  const hash = await bcrypt.hash(nueva, config.bcryptRounds);
  await query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [hash, req.usuario.id]);
  res.status(204).end();
});

export default router;
