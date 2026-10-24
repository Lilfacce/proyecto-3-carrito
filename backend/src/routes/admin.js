import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { passwordSchema } from './auth.js';

const router = Router();
router.use(requireAdmin);

const idSchema = z.coerce.number().int().positive();

router.get('/dashboard', async (req, res) => {
  const [ventas, porEstado, clientes, stockBajo, recientes, top, ventasDia] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*)::int AS pedidos,
              COALESCE(SUM(total) FILTER (WHERE fecha >= date_trunc('month', NOW())), 0) AS total_mes
       FROM pedidos WHERE estado <> 'cancelado'`,
    ),
    query('SELECT estado, COUNT(*)::int AS cantidad FROM pedidos GROUP BY estado'),
    query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE activo)::int AS activos
       FROM usuarios WHERE rol = 'cliente'`,
    ),
    query(
      `SELECT id, nombre, stock, stock_minimo FROM productos
       WHERE activo AND stock <= stock_minimo ORDER BY stock ASC, nombre`,
    ),
    query(
      `SELECT p.id, p.total, p.estado, p.fecha, u.nombre AS cliente_nombre
       FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id ORDER BY p.fecha DESC LIMIT 5`,
    ),
    query(
      `SELECT d.producto_id, d.nombre_producto, SUM(d.cantidad)::int AS unidades,
              SUM(d.cantidad * d.precio_unitario) AS ingresos
       FROM detalle_pedido d JOIN pedidos p ON p.id = d.pedido_id
       WHERE p.estado <> 'cancelado'
       GROUP BY d.producto_id, d.nombre_producto ORDER BY unidades DESC LIMIT 5`,
    ),
    query(
      `SELECT to_char(dia, 'YYYY-MM-DD') AS dia, COALESCE(SUM(p.total), 0) AS total
       FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day') AS dia
       LEFT JOIN pedidos p ON p.fecha::date = dia AND p.estado <> 'cancelado'
       GROUP BY dia ORDER BY dia`,
    ),
  ]);

  const estados = { pendiente: 0, enviado: 0, entregado: 0, cancelado: 0 };
  for (const r of porEstado.rows) estados[r.estado] = r.cantidad;

  res.json({
    ventas_total: ventas.rows[0].total,
    ventas_mes: ventas.rows[0].total_mes,
    pedidos_total: ventas.rows[0].pedidos,
    pedidos_por_estado: estados,
    clientes: clientes.rows[0],
    stock_bajo: stockBajo.rows,
    pedidos_recientes: recientes.rows,
    productos_top: top.rows,
    ventas_ultimos_7_dias: ventasDia.rows,
  });
});

router.get('/usuarios', async (req, res) => {
  const { q, rol } = z
    .object({
      q: z.string().trim().max(100).optional(),
      rol: z.enum(['cliente', 'admin']).optional(),
    })
    .parse(req.query);
  const condiciones = [];
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    condiciones.push(`(u.nombre ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (rol) {
    params.push(rol);
    condiciones.push(`u.rol = $${params.length}`);
  }
  // Nunca se devuelve password_hash.
  const { rows } = await query(
    `SELECT u.id, u.nombre, u.email, u.rol, u.activo, u.telefono, u.direccion, u.creado_en,
            COUNT(p.id)::int AS pedidos,
            COALESCE(SUM(p.total) FILTER (WHERE p.estado <> 'cancelado'), 0) AS total_comprado
     FROM usuarios u LEFT JOIN pedidos p ON p.usuario_id = u.id
     ${condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''}
     GROUP BY u.id ORDER BY u.creado_en DESC`,
    params,
  );
  res.json({ usuarios: rows });
});

router.get('/usuarios/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { rows } = await query(
    'SELECT id, nombre, email, rol, activo, telefono, direccion, creado_en FROM usuarios WHERE id = $1',
    [id],
  );
  if (!rows[0]) throw new HttpError(404, 'Usuario no encontrado');
  const pedidos = await query(
    'SELECT id, total, estado, fecha FROM pedidos WHERE usuario_id = $1 ORDER BY fecha DESC',
    [id],
  );
  res.json({ usuario: rows[0], pedidos: pedidos.rows });
});

/** Crea otro administrador (o un cliente) desde el panel. */
router.post('/usuarios', async (req, res) => {
  const datos = z
    .object({
      nombre: z.string().trim().min(2).max(100),
      email: z.string().trim().toLowerCase().max(150).pipe(z.email('Correo inválido')),
      password: passwordSchema,
      rol: z.enum(['cliente', 'admin']),
    })
    .parse(req.body);
  const hash = await bcrypt.hash(datos.password, config.bcryptRounds);
  try {
    const { rows } = await query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, activo, creado_en`,
      [datos.nombre, datos.email, hash, datos.rol],
    );
    res.status(201).json({ usuario: rows[0] });
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'Ya existe una cuenta con ese correo');
    throw err;
  }
});

router.patch('/usuarios/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const cambios = z
    .object({ activo: z.boolean().optional(), rol: z.enum(['cliente', 'admin']).optional() })
    .refine((c) => c.activo !== undefined || c.rol !== undefined, 'No hay cambios')
    .parse(req.body);

  if (id === req.usuario.id) {
    throw new HttpError(400, 'No puedes desactivarte ni cambiar tu propio rol');
  }
  const { rows } = await query(
    `UPDATE usuarios SET activo = COALESCE($1, activo), rol = COALESCE($2, rol) WHERE id = $3
     RETURNING id, nombre, email, rol, activo`,
    [cambios.activo ?? null, cambios.rol ?? null, id],
  );
  if (!rows[0]) throw new HttpError(404, 'Usuario no encontrado');
  res.json({ usuario: rows[0] });
});

export default router;
