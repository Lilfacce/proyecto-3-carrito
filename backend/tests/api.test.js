// Pruebas de integración de la API contra una base de datos PostgreSQL de pruebas.
// Requiere TEST_DATABASE_URL (en .env o en el entorno). ¡La base se borra en cada corrida!
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import request from 'supertest';

dotenv.config({ quiet: true });
if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Define TEST_DATABASE_URL para correr las pruebas de integración.');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4';

const { crearApp } = await import('../src/app.js');
const { pool } = await import('../src/db.js');
const bcrypt = (await import('bcryptjs')).default;

const app = crearApp();
const TARJETA_OK = { numero: '4242424242424242', titular: 'Ana López', vencimiento: '12/30', cvv: '123' };

/** Crea un agente con sesión (cookie) ya iniciada. */
async function agente(email, password) {
  const a = request.agent(app);
  const r = await a.post('/api/auth/login').send({ email, password });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return a;
}

let admin;
let cliente;
let producto; // stock 5, precio 100

before(async () => {
  const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  const hash = await bcrypt.hash('Admin123!', 4);
  await pool.query(
    "INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ('Admin', 'admin@test.com', $1, 'admin')",
    [hash],
  );
  admin = await agente('admin@test.com', 'Admin123!');
});

after(() => pool.end());

describe('autenticación', () => {
  test('registra un cliente y guarda la contraseña con hash', async () => {
    cliente = request.agent(app);
    const r = await cliente
      .post('/api/auth/registro')
      .send({ nombre: 'Ana', email: ' ANA@test.com ', password: 'Cliente123' });
    assert.equal(r.status, 201);
    assert.equal(r.body.usuario.email, 'ana@test.com');
    assert.equal(r.body.usuario.rol, 'cliente');
    assert.equal(r.body.usuario.password_hash, undefined);
    assert.match(r.headers['set-cookie'][0], /HttpOnly/);

    const { rows } = await pool.query("SELECT password_hash FROM usuarios WHERE email = 'ana@test.com'");
    assert.notEqual(rows[0].password_hash, 'Cliente123');
    assert.match(rows[0].password_hash, /^\$2[aby]\$/);
  });

  test('rechaza contraseñas débiles y correos duplicados', async () => {
    const debil = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'X', email: 'x@test.com', password: '123' });
    assert.equal(debil.status, 400);
    const dup = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Otra Ana', email: 'ana@test.com', password: 'Cliente123' });
    assert.equal(dup.status, 409);
  });

  test('login con contraseña incorrecta devuelve 401', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'mala1234' });
    assert.equal(r.status, 401);
  });

  test('un cliente no puede entrar a rutas de administrador', async () => {
    assert.equal((await cliente.get('/api/admin/dashboard')).status, 403);
    assert.equal((await request(app).get('/api/admin/dashboard')).status, 401);
  });
});

describe('productos', () => {
  test('el admin crea un producto y aparece en el catálogo', async () => {
    const r = await admin
      .post('/api/productos')
      .send({ nombre: 'Mouse', descripcion: 'Inalámbrico', precio: 100, stock: 5, categoria: 'Computación' });
    assert.equal(r.status, 201);
    producto = r.body.producto;

    const lista = await request(app).get('/api/productos?q=mous');
    assert.equal(lista.body.productos.length, 1);
  });

  test('un cliente no puede crear productos', async () => {
    const r = await cliente.post('/api/productos').send({ nombre: 'Hack', precio: 1, stock: 1 });
    assert.equal(r.status, 403);
  });
});

describe('carrito y compra', () => {
  test('agrega, suma y no permite superar el stock', async () => {
    let r = await cliente.post('/api/carrito').send({ producto_id: producto.id, cantidad: 2 });
    assert.equal(r.status, 201);
    r = await cliente.post('/api/carrito').send({ producto_id: producto.id, cantidad: 1 });
    assert.equal(r.body.items[0].cantidad, 3);
    assert.equal(r.body.total, 300);
    r = await cliente.put(`/api/carrito/${producto.id}`).send({ cantidad: 6 });
    assert.equal(r.status, 400);
  });

  test('el precio enviado por el navegador se ignora', async () => {
    const r = await cliente
      .post('/api/carrito')
      .send({ producto_id: producto.id, cantidad: 0, precio: 0.01 });
    assert.equal(r.status, 400); // cantidad inválida, y "precio" no es un campo aceptado
    const carrito = await cliente.get('/api/carrito');
    assert.equal(carrito.body.items[0].precio, 100);
  });

  test('rechaza tarjetas inválidas y pagos rechazados sin tocar el stock', async () => {
    let r = await cliente
      .post('/api/pedidos')
      .send({ metodo: 'tarjeta', direccion_entrega: 'Zona 1, Xela', tarjeta: { ...TARJETA_OK, numero: '1234' } });
    assert.equal(r.status, 400);

    r = await cliente.post('/api/pedidos').send({
      metodo: 'tarjeta',
      direccion_entrega: 'Zona 1, Xela',
      tarjeta: { ...TARJETA_OK, numero: '4000000000000002' },
    });
    assert.equal(r.status, 402);

    const { rows } = await pool.query('SELECT stock FROM productos WHERE id = $1', [producto.id]);
    assert.equal(rows[0].stock, 5);
    assert.equal((await cliente.get('/api/carrito')).body.items.length, 1);
  });

  test('confirma la compra: descuenta stock, guarda solo últimos 4 y vacía el carrito', async () => {
    const r = await cliente
      .post('/api/pedidos')
      .send({ metodo: 'tarjeta', direccion_entrega: 'Zona 1, Xela', tarjeta: TARJETA_OK });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.pedido.total, 300);
    assert.equal(r.body.pedido.estado, 'pendiente');
    assert.equal(r.body.pedido.pago.ultimos4, '4242');

    const stock = await pool.query('SELECT stock FROM productos WHERE id = $1', [producto.id]);
    assert.equal(stock.rows[0].stock, 2);
    const pagos = await pool.query('SELECT row_to_json(p)::text AS fila FROM pagos_simulados p');
    assert.ok(!pagos.rows[0].fila.includes('4242424242424242'));
    assert.equal((await cliente.get('/api/carrito')).body.items.length, 0);
  });

  test('no vende más de lo que hay si el stock cambió después de agregar al carrito', async () => {
    await cliente.post('/api/carrito').send({ producto_id: producto.id, cantidad: 2 });
    await admin.patch(`/api/productos/${producto.id}/stock`).send({ ajuste: -1 }); // queda 1
    const r = await cliente
      .post('/api/pedidos')
      .send({ metodo: 'contra_entrega', direccion_entrega: 'Zona 1, Xela' });
    assert.equal(r.status, 409);
    assert.equal(r.body.details[0].disponible, 1);
    await cliente.delete('/api/carrito');
  });

  test('dos compras simultáneas del último stock: solo una gana', async () => {
    const reg = request.agent(app);
    await reg.post('/api/auth/registro').send({ nombre: 'Beto', email: 'beto@test.com', password: 'Cliente123' });
    await cliente.post('/api/carrito').send({ producto_id: producto.id, cantidad: 1 });
    await reg.post('/api/carrito').send({ producto_id: producto.id, cantidad: 1 });

    const body = { metodo: 'contra_entrega', direccion_entrega: 'Zona 3, Xela' };
    const resultados = await Promise.all([
      cliente.post('/api/pedidos').send(body),
      reg.post('/api/pedidos').send(body),
    ]);
    const estados = resultados.map((r) => r.status).sort();
    assert.deepEqual(estados, [201, 409]);
    const { rows } = await pool.query('SELECT stock FROM productos WHERE id = $1', [producto.id]);
    assert.equal(rows[0].stock, 0);
  });
});

describe('pedidos', () => {
  test('el cliente ve solo sus pedidos', async () => {
    const r = await cliente.get('/api/pedidos/mios');
    assert.ok(r.body.pedidos.length >= 1);
    const ajenos = await pool.query("SELECT p.id FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id WHERE u.email = 'beto@test.com'");
    if (ajenos.rows[0]) {
      assert.equal((await cliente.get(`/api/pedidos/mios/${ajenos.rows[0].id}`)).status, 404);
    }
  });

  test('el admin avanza el estado y no permite saltos inválidos', async () => {
    const { body } = await cliente.get('/api/pedidos/mios');
    const id = body.pedidos.at(-1).id;
    assert.equal((await admin.patch(`/api/pedidos/${id}/estado`).send({ estado: 'entregado' })).status, 400);
    assert.equal((await admin.patch(`/api/pedidos/${id}/estado`).send({ estado: 'enviado' })).status, 200);
    const r = await admin.patch(`/api/pedidos/${id}/estado`).send({ estado: 'entregado' });
    assert.equal(r.body.pedido.estado, 'entregado');
    // Un pedido enviado ya no lo puede cancelar el cliente
    assert.equal((await cliente.post(`/api/pedidos/mios/${id}/cancelar`)).status, 400);
  });

  test('cancelar un pedido pendiente devuelve el stock', async () => {
    await admin.patch(`/api/productos/${producto.id}/stock`).send({ ajuste: 3 });
    await cliente.post('/api/carrito').send({ producto_id: producto.id, cantidad: 2 });
    const compra = await cliente
      .post('/api/pedidos')
      .send({ metodo: 'contra_entrega', direccion_entrega: 'Zona 1, Xela' });
    assert.equal(compra.status, 201);
    const antes = (await pool.query('SELECT stock FROM productos WHERE id = $1', [producto.id])).rows[0].stock;
    const r = await cliente.post(`/api/pedidos/mios/${compra.body.pedido.id}/cancelar`);
    assert.equal(r.body.pedido.estado, 'cancelado');
    const despues = (await pool.query('SELECT stock FROM productos WHERE id = $1', [producto.id])).rows[0].stock;
    assert.equal(despues, antes + 2);
  });
});

describe('administración de usuarios', () => {
  test('desactivar un cliente cierra su sesión inmediatamente', async () => {
    const { body } = await admin.get('/api/admin/usuarios?q=beto');
    const beto = body.usuarios[0];
    assert.equal(beto.password_hash, undefined);
    const betoSesion = await agente('beto@test.com', 'Cliente123');
    assert.equal((await betoSesion.get('/api/carrito')).status, 200);

    await admin.patch(`/api/admin/usuarios/${beto.id}`).send({ activo: false });
    assert.equal((await betoSesion.get('/api/carrito')).status, 401);
    const login = await request(app).post('/api/auth/login').send({ email: 'beto@test.com', password: 'Cliente123' });
    assert.equal(login.status, 403);
  });

  test('el admin no puede desactivarse a sí mismo', async () => {
    const { body } = await admin.get('/api/auth/me');
    const r = await admin.patch(`/api/admin/usuarios/${body.usuario.id}`).send({ activo: false });
    assert.equal(r.status, 400);
  });

  test('el dashboard resume ventas, pedidos y stock bajo', async () => {
    const r = await admin.get('/api/admin/dashboard');
    assert.equal(r.status, 200);
    assert.ok(r.body.pedidos_total >= 2);
    assert.equal(r.body.ventas_ultimos_7_dias.length, 7);
    assert.ok(r.body.stock_bajo.some((p) => p.id === producto.id));
  });
});
