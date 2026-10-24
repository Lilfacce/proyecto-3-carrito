import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { procesarPagoTarjeta } from '../pago.js';

const router = Router();

const idSchema = z.coerce.number().int().positive();

const checkoutSchema = z.discriminatedUnion('metodo', [
  z.object({
    metodo: z.literal('tarjeta'),
    direccion_entrega: z.string().trim().min(5, 'Ingresa una dirección de entrega').max(255),
    tarjeta: z.object({
      numero: z.string().max(25),
      titular: z.string().max(100),
      vencimiento: z.string().max(5),
      cvv: z.string().max(4),
    }),
  }),
  z.object({
    metodo: z.literal('contra_entrega'),
    direccion_entrega: z.string().trim().min(5, 'Ingresa una dirección de entrega').max(255),
  }),
]);

/** Transiciones de estado permitidas para el administrador. */
export const TRANSICIONES = {
  pendiente: ['enviado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
};

async function cargarPedido(id, db = { query }) {
  const { rows } = await db.query(
    `SELECT p.*, u.nombre AS cliente_nombre, u.email AS cliente_email, u.telefono AS cliente_telefono
     FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  const [detalle, pago] = await Promise.all([
    db.query(
      `SELECT d.producto_id, d.nombre_producto, d.cantidad, d.precio_unitario,
              (d.cantidad * d.precio_unitario) AS subtotal, pr.imagen, pr.categoria
       FROM detalle_pedido d LEFT JOIN productos pr ON pr.id = d.producto_id
       WHERE d.pedido_id = $1 ORDER BY d.nombre_producto`,
      [id],
    ),
    db.query(
      'SELECT metodo, marca, ultimos4, titular, monto, estado, referencia, fecha FROM pagos_simulados WHERE pedido_id = $1',
      [id],
    ),
  ]);
  return { ...rows[0], items: detalle.rows, pago: pago.rows[0] ?? null };
}

/** Devuelve al inventario las unidades de un pedido cancelado. */
async function reponerStock(client, pedidoId) {
  await client.query(
    `UPDATE productos p SET stock = p.stock + d.cantidad, actualizado_en = NOW()
     FROM detalle_pedido d WHERE d.pedido_id = $1 AND d.producto_id = p.id`,
    [pedidoId],
  );
}

// ===================== Cliente =====================

/**
 * Confirma la compra. Todo ocurre en UNA transacción:
 * bloquea los productos, valida stock, calcula el total con los precios de la BD,
 * crea el pedido y su detalle, descuenta el stock, registra el pago y vacía el carrito.
 * Si algo falla (sin stock, pago rechazado) se hace ROLLBACK y nada cambia.
 */
router.post('/', requireAuth, async (req, res) => {
  const datos = checkoutSchema.parse(req.body);

  let pago = null;
  if (datos.metodo === 'tarjeta') {
    pago = procesarPagoTarjeta(datos.tarjeta);
    if (!pago.valido) throw new HttpError(400, pago.errores[0], pago.errores);
  }

  const pedidoId = await withTransaction(async (client) => {
    // FOR UPDATE bloquea las filas de productos hasta el COMMIT: dos compras simultáneas
    // del mismo producto no pueden vender más unidades de las que hay. ORDER BY evita deadlocks.
    const { rows: items } = await client.query(
      `SELECT c.producto_id, c.cantidad, p.nombre, p.precio, p.stock, p.activo
       FROM carrito_items c JOIN productos p ON p.id = c.producto_id
       WHERE c.usuario_id = $1
       ORDER BY p.id
       FOR UPDATE OF p`,
      [req.usuario.id],
    );
    if (items.length === 0) throw new HttpError(400, 'Tu carrito está vacío');

    const problemas = items
      .filter((i) => !i.activo || i.cantidad > i.stock)
      .map((i) => ({
        producto_id: i.producto_id,
        nombre: i.nombre,
        solicitado: i.cantidad,
        disponible: i.activo ? i.stock : 0,
      }));
    if (problemas.length) {
      throw new HttpError(409, 'Algunos productos ya no tienen stock suficiente', problemas);
    }

    // El precio SIEMPRE sale de la base de datos, nunca del navegador.
    const total = Math.round(items.reduce((s, i) => s + i.precio * i.cantidad, 0) * 100) / 100;

    if (pago && !pago.aprobado) throw new HttpError(402, 'El banco rechazó el pago (simulado)');

    const { rows } = await client.query(
      'INSERT INTO pedidos (usuario_id, total, direccion_entrega) VALUES ($1, $2, $3) RETURNING id',
      [req.usuario.id, total, datos.direccion_entrega],
    );
    const id = rows[0].id;

    for (const i of items) {
      await client.query(
        `INSERT INTO detalle_pedido (pedido_id, producto_id, nombre_producto, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, i.producto_id, i.nombre, i.cantidad, i.precio],
      );
      await client.query(
        'UPDATE productos SET stock = stock - $1, actualizado_en = NOW() WHERE id = $2',
        [i.cantidad, i.producto_id],
      );
    }

    await client.query(
      `INSERT INTO pagos_simulados (pedido_id, metodo, marca, ultimos4, titular, monto, estado, referencia)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      pago
        ? [id, 'tarjeta', pago.marca, pago.ultimos4, pago.titular, total, 'aprobado', pago.referencia]
        : [id, 'contra_entrega', null, null, null, total, 'pendiente', `CE-${id}`],
    );

    await client.query('DELETE FROM carrito_items WHERE usuario_id = $1', [req.usuario.id]);
    return id;
  });

  res.status(201).json({ pedido: await cargarPedido(pedidoId) });
});

router.get('/mios', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.total, p.estado, p.fecha,
            (SELECT COALESCE(SUM(cantidad), 0)::int FROM detalle_pedido d WHERE d.pedido_id = p.id) AS unidades
     FROM pedidos p WHERE p.usuario_id = $1 ORDER BY p.fecha DESC`,
    [req.usuario.id],
  );
  res.json({ pedidos: rows });
});

router.get('/mios/:id', requireAuth, async (req, res) => {
  const pedido = await cargarPedido(idSchema.parse(req.params.id));
  // Un cliente solo puede ver sus propios pedidos (se responde 404 para no revelar que existe).
  if (!pedido || pedido.usuario_id !== req.usuario.id) throw new HttpError(404, 'Pedido no encontrado');
  res.json({ pedido });
});

router.post('/mios/:id/cancelar', requireAuth, async (req, res) => {
  const id = idSchema.parse(req.params.id);
  await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM pedidos WHERE id = $1 FOR UPDATE', [id]);
    const pedido = rows[0];
    if (!pedido || pedido.usuario_id !== req.usuario.id) throw new HttpError(404, 'Pedido no encontrado');
    if (pedido.estado !== 'pendiente') {
      throw new HttpError(400, 'Solo se pueden cancelar pedidos pendientes');
    }
    await client.query(
      "UPDATE pedidos SET estado = 'cancelado', actualizado_en = NOW() WHERE id = $1",
      [id],
    );
    await reponerStock(client, id);
  });
  res.json({ pedido: await cargarPedido(id) });
});

// ===================== Administrador =====================

router.get('/', requireAdmin, async (req, res) => {
  const { estado, q } = z
    .object({
      estado: z.enum(['pendiente', 'enviado', 'entregado', 'cancelado']).optional(),
      q: z.string().trim().max(100).optional(),
    })
    .parse(req.query);
  const condiciones = [];
  const params = [];
  if (estado) {
    params.push(estado);
    condiciones.push(`p.estado = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    condiciones.push(`(u.nombre ILIKE $${params.length} OR u.email ILIKE $${params.length} OR p.id::text = $${params.length + 1})`);
    params.push(q.replace(/^#/, ''));
  }
  const { rows } = await query(
    `SELECT p.id, p.total, p.estado, p.fecha, u.nombre AS cliente_nombre, u.email AS cliente_email,
            pg.metodo AS metodo_pago
     FROM pedidos p
     JOIN usuarios u ON u.id = p.usuario_id
     LEFT JOIN pagos_simulados pg ON pg.pedido_id = p.id
     ${condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''}
     ORDER BY p.fecha DESC`,
    params,
  );
  res.json({ pedidos: rows });
});

router.get('/:id', requireAdmin, async (req, res) => {
  const pedido = await cargarPedido(idSchema.parse(req.params.id));
  if (!pedido) throw new HttpError(404, 'Pedido no encontrado');
  res.json({ pedido });
});

router.patch('/:id/estado', requireAdmin, async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { estado } = z
    .object({ estado: z.enum(['pendiente', 'enviado', 'entregado', 'cancelado']) })
    .parse(req.body);

  await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT estado FROM pedidos WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw new HttpError(404, 'Pedido no encontrado');
    const actual = rows[0].estado;
    if (!TRANSICIONES[actual].includes(estado)) {
      throw new HttpError(400, `No se puede pasar de "${actual}" a "${estado}"`);
    }
    await client.query('UPDATE pedidos SET estado = $1, actualizado_en = NOW() WHERE id = $2', [
      estado,
      id,
    ]);
    if (estado === 'cancelado') await reponerStock(client, id);
    if (estado === 'entregado') {
      // El pago contra entrega se cobra al entregar.
      await client.query(
        "UPDATE pagos_simulados SET estado = 'aprobado' WHERE pedido_id = $1 AND metodo = 'contra_entrega'",
        [id],
      );
    }
  });
  res.json({ pedido: await cargarPedido(id) });
});

export default router;
