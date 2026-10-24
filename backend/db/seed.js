// Carga datos de ejemplo: un administrador, clientes de prueba, productos y algunos pedidos.
import bcrypt from 'bcryptjs';
import { config } from '../src/config.js';
import { pool, withTransaction } from '../src/db.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@tienda.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';
const CLIENTE_PASSWORD = 'Cliente123!';

const productos = [
  ['Audífonos inalámbricos Pulse', 'Bluetooth 5.3, cancelación de ruido y 30 h de batería.', 349.0, 25, 'Audio'],
  ['Bocina portátil Wave', 'Resistente al agua IPX7, sonido 360° y 12 h de reproducción.', 279.0, 18, 'Audio'],
  ['Audífonos con cable Basic', 'Conector 3.5 mm con micrófono integrado.', 59.0, 60, 'Audio'],
  ['Teclado mecánico K87', 'Switches rojos, retroiluminación RGB y formato TKL.', 499.0, 12, 'Computación'],
  ['Mouse ergonómico M3', 'Sensor de 4000 DPI, 6 botones y conexión inalámbrica.', 189.0, 30, 'Computación'],
  ['Monitor 24" Full HD', 'Panel IPS de 75 Hz con bordes delgados.', 1299.0, 6, 'Computación'],
  ['Hub USB-C 7 en 1', 'HDMI 4K, 3 USB 3.0, lector SD y carga de 100 W.', 299.0, 4, 'Computación'],
  ['Memoria USB 64 GB', 'USB 3.2 con velocidades de hasta 150 MB/s.', 79.0, 80, 'Almacenamiento'],
  ['Disco SSD externo 1 TB', 'Transferencias de hasta 1050 MB/s, USB-C.', 899.0, 9, 'Almacenamiento'],
  ['Tarjeta microSD 128 GB', 'Clase 10 U3, ideal para cámaras y teléfonos.', 119.0, 3, 'Almacenamiento'],
  ['Cargador rápido 30 W', 'USB-C Power Delivery compatible con la mayoría de teléfonos.', 149.0, 40, 'Accesorios'],
  ['Power bank 20 000 mAh', 'Dos salidas USB y una USB-C, carga rápida.', 259.0, 15, 'Accesorios'],
  ['Cable USB-C trenzado 2 m', 'Nylon reforzado, carga de 60 W.', 49.0, 100, 'Accesorios'],
  ['Soporte para laptop', 'Aluminio ajustable en 6 alturas.', 169.0, 2, 'Accesorios'],
  ['Smartwatch Fit 2', 'Monitor de ritmo cardíaco, GPS y 7 días de batería.', 699.0, 10, 'Wearables'],
  ['Banda de actividad Lite', 'Cuenta pasos, sueño y notificaciones.', 229.0, 20, 'Wearables'],
];

const clientes = [
  ['Ana López', 'ana@correo.com', '5555-1234', '4a. Calle 12-30, Zona 1, Quetzaltenango'],
  ['Carlos Pérez', 'carlos@correo.com', '5555-5678', '15 Avenida 5-20, Zona 3, Quetzaltenango'],
];

await withTransaction(async (db) => {
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, config.bcryptRounds);
  await db.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ('Administrador', $1, $2, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [ADMIN_EMAIL, adminHash],
  );

  const clienteHash = await bcrypt.hash(CLIENTE_PASSWORD, config.bcryptRounds);
  const clienteIds = [];
  for (const [nombre, email, telefono, direccion] of clientes) {
    const { rows } = await db.query(
      `INSERT INTO usuarios (nombre, email, password_hash, telefono, direccion) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id, direccion`,
      [nombre, email, clienteHash, telefono, direccion],
    );
    clienteIds.push(rows[0]);
  }

  const { rows: existentes } = await db.query('SELECT COUNT(*)::int AS n FROM productos');
  if (existentes[0].n > 0) {
    console.log('Ya hay productos; no se insertan de nuevo.');
    return;
  }

  const ids = [];
  for (const [nombre, descripcion, precio, stock, categoria] of productos) {
    const { rows } = await db.query(
      `INSERT INTO productos (nombre, descripcion, precio, stock, categoria) VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, precio`,
      [nombre, descripcion, precio, stock, categoria],
    );
    ids.push(rows[0]);
  }

  // Pedidos de ejemplo para que el panel tenga datos.
  const pedidos = [
    { cliente: 0, estado: 'entregado', dias: 5, items: [[0, 1], [12, 2]] },
    { cliente: 1, estado: 'enviado', dias: 2, items: [[3, 1], [4, 1]] },
    { cliente: 0, estado: 'pendiente', dias: 0, items: [[10, 1], [7, 3]] },
  ];
  for (const p of pedidos) {
    const cliente = clienteIds[p.cliente];
    const total = p.items.reduce((s, [i, c]) => s + ids[i].precio * c, 0);
    const { rows } = await db.query(
      `INSERT INTO pedidos (usuario_id, total, estado, direccion_entrega, fecha)
       VALUES ($1, $2, $3, $4, NOW() - make_interval(days => $5)) RETURNING id`,
      [cliente.id, total, p.estado, cliente.direccion, p.dias],
    );
    const pedidoId = rows[0].id;
    for (const [i, cantidad] of p.items) {
      await db.query(
        `INSERT INTO detalle_pedido (pedido_id, producto_id, nombre_producto, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedidoId, ids[i].id, ids[i].nombre, cantidad, ids[i].precio],
      );
      await db.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [cantidad, ids[i].id]);
    }
    await db.query(
      `INSERT INTO pagos_simulados (pedido_id, metodo, marca, ultimos4, titular, monto, estado, referencia)
       VALUES ($1, 'tarjeta', 'Visa', '4242', 'Cliente de prueba', $2, 'aprobado', $3)`,
      [pedidoId, total, `SIM-SEED${pedidoId}`],
    );
  }
});

console.log('Datos de ejemplo cargados.');
console.log(`  Admin:    ${ADMIN_EMAIL} / (ADMIN_PASSWORD de .env)`);
console.log(`  Clientes: ana@correo.com, carlos@correo.com / ${CLIENTE_PASSWORD}`);
await pool.end();
