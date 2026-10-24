import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';

const router = Router();

const idSchema = z.coerce.number().int().positive();

const productoSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  descripcion: z.string().trim().max(2000).default(''),
  precio: z.coerce.number().min(0).max(99999999),
  stock: z.coerce.number().int().min(0),
  stock_minimo: z.coerce.number().int().min(0).default(5),
  imagen: z
    .union([z.url({ protocol: /^https?$/ }), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => v || null),
  categoria: z.string().trim().min(2).max(60).default('General'),
  activo: z.boolean().default(true),
});

const listaSchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoria: z.string().trim().max(60).optional(),
  orden: z.enum(['nombre', 'precio_asc', 'precio_desc', 'recientes']).default('nombre'),
});

const ORDEN_SQL = {
  nombre: 'nombre ASC',
  precio_asc: 'precio ASC',
  precio_desc: 'precio DESC',
  recientes: 'creado_en DESC',
};

const CAMPOS_PUBLICOS = 'id, nombre, descripcion, precio, stock, imagen, categoria';

// ---- Catálogo público ----

router.get('/', async (req, res) => {
  const { q, categoria, orden } = listaSchema.parse(req.query);
  const condiciones = ['activo = TRUE'];
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    condiciones.push(`(nombre ILIKE $${params.length} OR descripcion ILIKE $${params.length})`);
  }
  if (categoria) {
    params.push(categoria);
    condiciones.push(`categoria = $${params.length}`);
  }
  const { rows } = await query(
    `SELECT ${CAMPOS_PUBLICOS} FROM productos
     WHERE ${condiciones.join(' AND ')}
     ORDER BY ${ORDEN_SQL[orden]}`,
    params,
  );
  res.json({ productos: rows });
});

router.get('/categorias', async (req, res) => {
  const { rows } = await query(
    'SELECT DISTINCT categoria FROM productos WHERE activo = TRUE ORDER BY categoria',
  );
  res.json({ categorias: rows.map((r) => r.categoria) });
});

// ---- Administración (antes de /:id para que no choque) ----

router.get('/admin/todos', requireAdmin, async (req, res) => {
  const { rows } = await query(
    `SELECT *, (stock <= stock_minimo) AS stock_bajo FROM productos ORDER BY activo DESC, nombre ASC`,
  );
  res.json({ productos: rows });
});

router.get('/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { rows } = await query(
    `SELECT ${CAMPOS_PUBLICOS} FROM productos WHERE id = $1 AND activo = TRUE`,
    [id],
  );
  if (!rows[0]) throw new HttpError(404, 'Producto no encontrado');
  res.json({ producto: rows[0] });
});

router.post('/', requireAdmin, async (req, res) => {
  const p = productoSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO productos (nombre, descripcion, precio, stock, stock_minimo, imagen, categoria, activo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [p.nombre, p.descripcion, p.precio, p.stock, p.stock_minimo, p.imagen, p.categoria, p.activo],
  );
  res.status(201).json({ producto: rows[0] });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const p = productoSchema.parse(req.body);
  const { rows } = await query(
    `UPDATE productos SET nombre = $1, descripcion = $2, precio = $3, stock = $4, stock_minimo = $5,
       imagen = $6, categoria = $7, activo = $8, actualizado_en = NOW()
     WHERE id = $9 RETURNING *`,
    [p.nombre, p.descripcion, p.precio, p.stock, p.stock_minimo, p.imagen, p.categoria, p.activo, id],
  );
  if (!rows[0]) throw new HttpError(404, 'Producto no encontrado');
  res.json({ producto: rows[0] });
});

/** Ajuste rápido de inventario: suma (o resta) unidades al stock. */
router.patch('/:id/stock', requireAdmin, async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { ajuste } = z.object({ ajuste: z.coerce.number().int() }).parse(req.body);
  const { rows } = await query(
    `UPDATE productos SET stock = stock + $1, actualizado_en = NOW()
     WHERE id = $2 AND stock + $1 >= 0 RETURNING *`,
    [ajuste, id],
  );
  if (!rows[0]) throw new HttpError(400, 'Producto no encontrado o el stock quedaría negativo');
  res.json({ producto: rows[0] });
});

/**
 * Eliminación lógica: el producto se desactiva para no romper el historial de pedidos.
 * También se retira de los carritos.
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { rowCount } = await query(
    'UPDATE productos SET activo = FALSE, actualizado_en = NOW() WHERE id = $1',
    [id],
  );
  if (!rowCount) throw new HttpError(404, 'Producto no encontrado');
  await query('DELETE FROM carrito_items WHERE producto_id = $1', [id]);
  res.status(204).end();
});

export default router;
