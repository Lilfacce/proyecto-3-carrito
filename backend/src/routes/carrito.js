import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';

const router = Router();
router.use(requireAuth);

const idSchema = z.coerce.number().int().positive();
const cantidadSchema = z.coerce.number().int().min(1).max(999);

/** Devuelve el carrito con precios actuales del servidor. */
export async function obtenerCarrito(usuarioId, db = { query }) {
  const { rows } = await db.query(
    `SELECT c.producto_id, c.cantidad, p.nombre, p.precio, p.stock, p.imagen, p.categoria,
            (c.cantidad * p.precio) AS subtotal
     FROM carrito_items c
     JOIN productos p ON p.id = c.producto_id
     WHERE c.usuario_id = $1 AND p.activo = TRUE
     ORDER BY c.agregado_en`,
    [usuarioId],
  );
  const items = rows.map((r) => ({ ...r, subtotal: Number(r.subtotal), sin_stock: r.cantidad > r.stock }));
  const total = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
  const unidades = items.reduce((s, i) => s + i.cantidad, 0);
  return { items, total, unidades };
}

async function productoDisponible(productoId) {
  const { rows } = await query('SELECT id, stock FROM productos WHERE id = $1 AND activo = TRUE', [
    productoId,
  ]);
  if (!rows[0]) throw new HttpError(404, 'Producto no encontrado');
  return rows[0];
}

router.get('/', async (req, res) => {
  res.json(await obtenerCarrito(req.usuario.id));
});

/** Agrega unidades; si el producto ya estaba en el carrito, suma la cantidad. */
router.post('/', async (req, res) => {
  const { producto_id, cantidad } = z
    .object({ producto_id: idSchema, cantidad: cantidadSchema.default(1) })
    .parse(req.body);
  const producto = await productoDisponible(producto_id);

  const { rows } = await query(
    'SELECT cantidad FROM carrito_items WHERE usuario_id = $1 AND producto_id = $2',
    [req.usuario.id, producto_id],
  );
  const nueva = (rows[0]?.cantidad ?? 0) + cantidad;
  if (nueva > producto.stock) {
    throw new HttpError(400, `Solo hay ${producto.stock} unidades disponibles`);
  }
  await query(
    `INSERT INTO carrito_items (usuario_id, producto_id, cantidad) VALUES ($1, $2, $3)
     ON CONFLICT (usuario_id, producto_id) DO UPDATE SET cantidad = EXCLUDED.cantidad`,
    [req.usuario.id, producto_id, nueva],
  );
  res.status(201).json(await obtenerCarrito(req.usuario.id));
});

router.put('/:productoId', async (req, res) => {
  const productoId = idSchema.parse(req.params.productoId);
  const { cantidad } = z.object({ cantidad: cantidadSchema }).parse(req.body);
  const producto = await productoDisponible(productoId);
  if (cantidad > producto.stock) {
    throw new HttpError(400, `Solo hay ${producto.stock} unidades disponibles`);
  }
  const { rowCount } = await query(
    'UPDATE carrito_items SET cantidad = $1 WHERE usuario_id = $2 AND producto_id = $3',
    [cantidad, req.usuario.id, productoId],
  );
  if (!rowCount) throw new HttpError(404, 'El producto no está en el carrito');
  res.json(await obtenerCarrito(req.usuario.id));
});

router.delete('/:productoId', async (req, res) => {
  const productoId = idSchema.parse(req.params.productoId);
  await query('DELETE FROM carrito_items WHERE usuario_id = $1 AND producto_id = $2', [
    req.usuario.id,
    productoId,
  ]);
  res.json(await obtenerCarrito(req.usuario.id));
});

router.delete('/', async (req, res) => {
  await query('DELETE FROM carrito_items WHERE usuario_id = $1', [req.usuario.id]);
  res.json(await obtenerCarrito(req.usuario.id));
});

export default router;
