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
if (process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL no puede ser la misma base que DATABASE_URL: las pruebas la borran.');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4';

const { crearApp } = await import('../src/app.js');
const { pool } = await import('../src/db.js');
const bcrypt = (await import('bcryptjs')).default;
const jwt = (await import('jsonwebtoken')).default;

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

  test('rechaza cantidades inválidas', async () => {
    for (const cantidad of [0, -1, 1.5, 'abc', 1000]) {
      const r = await cliente.post('/api/carrito').send({ producto_id: producto.id, cantidad });
      assert.equal(r.status, 400, `cantidad ${cantidad}`);
      assert.equal((await cliente.put(`/api/carrito/${producto.id}`).send({ cantidad })).status, 400);
    }
    assert.equal((await cliente.post('/api/carrito').send({ producto_id: 999999, cantidad: 1 })).status, 404);
    assert.equal((await cliente.get('/api/carrito')).body.items[0].cantidad, 3);
  });

  test('el precio enviado por el navegador se ignora en el carrito', async () => {
    // Una petición válida con un precio manipulado: se acepta la cantidad, pero el precio sale de la BD.
    const r = await cliente
      .put(`/api/carrito/${producto.id}`)
      .send({ cantidad: 3, precio: 0.01, subtotal: 0.03, total: 0.03 });
    assert.equal(r.status, 200);
    assert.equal(r.body.items[0].precio, 100);
    assert.equal(r.body.total, 300);
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
    // Los campos "total" e "items" con precios falsos se descartan: el total se calcula en PostgreSQL.
    const r = await cliente.post('/api/pedidos').send({
      metodo: 'tarjeta',
      direccion_entrega: 'Zona 1, Xela',
      tarjeta: TARJETA_OK,
      total: 0.03,
      items: [{ producto_id: producto.id, cantidad: 3, precio: 0.01 }],
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.pedido.total, 300);
    assert.equal(r.body.pedido.items[0].precio_unitario, 100);
    assert.equal(r.body.pedido.pago.monto, 300);
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

describe('administración de productos e inventario', () => {
  let teclado;

  test('valida los datos del producto', async () => {
    const base = { nombre: 'Teclado', precio: 250, stock: 10, categoria: 'Computación' };
    assert.equal((await admin.post('/api/productos').send({ ...base, precio: -1 })).status, 400);
    assert.equal((await admin.post('/api/productos').send({ ...base, stock: 2.5 })).status, 400);
    assert.equal((await admin.post('/api/productos').send({ ...base, nombre: '' })).status, 400);
    const xss = await admin.post('/api/productos').send({ ...base, imagen: 'javascript:alert(1)' });
    assert.equal(xss.status, 400);
    const r = await admin.post('/api/productos').send(base);
    assert.equal(r.status, 201);
    teclado = r.body.producto;
  });

  test('editar el precio no altera los pedidos ya hechos', async () => {
    await cliente.post('/api/carrito').send({ producto_id: teclado.id, cantidad: 1 });
    const compra = await cliente
      .post('/api/pedidos')
      .send({ metodo: 'contra_entrega', direccion_entrega: 'Zona 1, Xela' });
    assert.equal(compra.status, 201, JSON.stringify(compra.body));

    const r = await admin
      .put(`/api/productos/${teclado.id}`)
      .send({ ...teclado, precio: 275, descripcion: 'Mecánico' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.producto.precio, 275);
    assert.equal((await request(app).get(`/api/productos/${teclado.id}`)).body.producto.precio, 275);

    const pedido = await cliente.get(`/api/pedidos/mios/${compra.body.pedido.id}`);
    assert.equal(pedido.body.pedido.total, 250);
    assert.equal(pedido.body.pedido.items[0].precio_unitario, 250);
    assert.equal((await admin.put('/api/productos/999999').send(teclado)).status, 404);
  });

  test('editar un producto no sobrescribe su stock', async () => {
    // El formulario se abrió cuando había 10; mientras tanto se vendió 1 (quedan 9).
    const r = await admin.put(`/api/productos/${teclado.id}`).send({ ...teclado, stock: 10 });
    assert.equal(r.status, 200);
    assert.equal(r.body.producto.stock, 9);
  });

  test('el ajuste de inventario no deja el stock negativo', async () => {
    let r = await admin.patch(`/api/productos/${teclado.id}/stock`).send({ ajuste: -100 });
    assert.equal(r.status, 400);
    r = await admin.patch(`/api/productos/${teclado.id}/stock`).send({ ajuste: 5 });
    assert.equal(r.body.producto.stock, 14);
  });

  test('desactivar un producto lo quita del catálogo y de los carritos, pero conserva el historial', async () => {
    await cliente.post('/api/carrito').send({ producto_id: teclado.id, cantidad: 1 });
    assert.equal((await admin.delete(`/api/productos/${teclado.id}`)).status, 204);

    assert.equal((await request(app).get(`/api/productos/${teclado.id}`)).status, 404);
    const catalogo = await request(app).get('/api/productos');
    assert.ok(!catalogo.body.productos.some((p) => p.id === teclado.id));
    assert.ok(!(await cliente.get('/api/carrito')).body.items.some((i) => i.producto_id === teclado.id));

    const todos = await admin.get('/api/productos/admin/todos');
    assert.equal(todos.body.productos.find((p) => p.id === teclado.id).activo, false);
    assert.equal((await cliente.post('/api/carrito').send({ producto_id: teclado.id })).status, 404);
  });
});

describe('administración de pedidos y clientes', () => {
  test('filtra pedidos por estado y por cliente', async () => {
    const r = await admin.get('/api/pedidos?estado=cancelado');
    assert.equal(r.status, 200);
    assert.ok(r.body.pedidos.length >= 1);
    assert.ok(r.body.pedidos.every((p) => p.estado === 'cancelado'));
    const porCliente = await admin.get('/api/pedidos?q=ana@test');
    assert.ok(porCliente.body.pedidos.length >= 1);
    assert.ok(porCliente.body.pedidos.every((p) => p.cliente_email === 'ana@test.com'));
    assert.equal((await admin.get('/api/pedidos?estado=perdido')).status, 400);
  });

  test('muestra el historial de un cliente sin exponer su contraseña', async () => {
    const { body } = await admin.get('/api/admin/usuarios?q=ana@test');
    const r = await admin.get(`/api/admin/usuarios/${body.usuarios[0].id}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.usuario.password_hash, undefined);
    assert.ok(r.body.pedidos.length >= 2);
    assert.equal(body.usuarios[0].pedidos, r.body.pedidos.length);
  });

  test('crea administradores y cambia roles', async () => {
    const nuevo = await admin
      .post('/api/admin/usuarios')
      .send({ nombre: 'Sofía', email: 'sofia@test.com', password: 'Admin1234', rol: 'admin' });
    assert.equal(nuevo.status, 201);
    const sofia = await agente('sofia@test.com', 'Admin1234');
    assert.equal((await sofia.get('/api/admin/dashboard')).status, 200);

    const dup = await admin
      .post('/api/admin/usuarios')
      .send({ nombre: 'Sofía 2', email: 'sofia@test.com', password: 'Admin1234', rol: 'cliente' });
    assert.equal(dup.status, 409);

    // Al quitarle el rol pierde el acceso al panel, aunque su sesión siga abierta.
    await admin.patch(`/api/admin/usuarios/${nuevo.body.usuario.id}`).send({ rol: 'cliente' });
    assert.equal((await sofia.get('/api/admin/dashboard')).status, 403);
  });
});

describe('seguridad', () => {
  test('la cookie de sesión dura lo mismo que el token', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'Cliente123' });
    const cookie = r.headers['set-cookie'][0];
    const { iat, exp } = jwt.decode(/token=([^;]+)/.exec(cookie)[1]);
    assert.equal(Number(/Max-Age=(\d+)/.exec(cookie)[1]), exp - iat);
    assert.match(cookie, /SameSite=Lax/);
  });

  test('una sesión expirada o un token falsificado no dan acceso', async () => {
    const { rows } = await pool.query("SELECT id FROM usuarios WHERE email = 'ana@test.com'");
    const vencido = Math.floor(Date.now() / 1000) - 60;
    const expirado = jwt.sign({ sub: rows[0].id, rol: 'cliente', exp: vencido }, process.env.JWT_SECRET);
    let r = await request(app).get('/api/auth/me').set('Cookie', `token=${expirado}`);
    assert.equal(r.status, 401);
    assert.match(r.headers['set-cookie'][0], /^token=;/); // se borra la cookie vencida

    // Token con rol admin firmado con otro secreto
    const falso = jwt.sign({ sub: rows[0].id, rol: 'admin' }, 'otro-secreto-que-no-es-el-del-servidor');
    r = await request(app).get('/api/admin/dashboard').set('Cookie', `token=${falso}`);
    assert.equal(r.status, 401);
  });

  test('un cliente no puede usar ninguna ruta de administración', async () => {
    const rutas = [
      ['get', '/api/admin/dashboard'],
      ['get', '/api/admin/usuarios'],
      ['get', '/api/admin/usuarios/1'],
      ['post', '/api/admin/usuarios'],
      ['patch', '/api/admin/usuarios/1'],
      ['get', '/api/productos/admin/todos'],
      ['post', '/api/productos'],
      ['put', `/api/productos/${producto.id}`],
      ['patch', `/api/productos/${producto.id}/stock`],
      ['delete', `/api/productos/${producto.id}`],
      ['get', '/api/pedidos'],
      ['get', '/api/pedidos/1'],
      ['patch', '/api/pedidos/1/estado'],
    ];
    const cuerpo = { rol: 'admin', activo: true, estado: 'entregado', ajuste: 100 };
    for (const [metodo, url] of rutas) {
      assert.equal((await cliente[metodo](url).send(cuerpo)).status, 403, `${metodo} ${url}`);
      assert.equal((await request(app)[metodo](url).send(cuerpo)).status, 401, `${metodo} ${url} sin sesión`);
    }
    // Un cliente tampoco puede ascenderse editando su perfil
    await cliente.put('/api/auth/me').send({ nombre: 'Ana', rol: 'admin' });
    assert.equal((await cliente.get('/api/auth/me')).body.usuario.rol, 'cliente');
  });

  test('un cliente no puede ver ni cancelar pedidos ajenos', async () => {
    const carlos = request.agent(app);
    await carlos.post('/api/auth/registro').send({ nombre: 'Carlos', email: 'carlos@test.com', password: 'Cliente123' });
    await admin.patch(`/api/productos/${producto.id}/stock`).send({ ajuste: 1 });
    await carlos.post('/api/carrito').send({ producto_id: producto.id, cantidad: 1 });
    const compra = await carlos
      .post('/api/pedidos')
      .send({ metodo: 'contra_entrega', direccion_entrega: 'Zona 3, Xela' });
    assert.equal(compra.status, 201, JSON.stringify(compra.body));
    const id = compra.body.pedido.id;

    assert.equal((await cliente.get(`/api/pedidos/mios/${id}`)).status, 404);
    assert.equal((await cliente.post(`/api/pedidos/mios/${id}/cancelar`)).status, 404);
    assert.ok(!(await cliente.get('/api/pedidos/mios')).body.pedidos.some((p) => p.id === id));
    assert.equal((await carlos.get(`/api/pedidos/mios/${id}`)).body.pedido.estado, 'pendiente');
  });

  test('rechaza escrituras desde otro origen (CSRF)', async () => {
    const malicioso = 'https://sitio-malicioso.example';
    await cliente.post('/api/carrito').send({ producto_id: producto.id, cantidad: 1 });
    const antes = (await cliente.get('/api/carrito')).body.unidades;
    let r = await cliente.post('/api/carrito').set('Origin', malicioso).send({ producto_id: producto.id, cantidad: 1 });
    assert.equal(r.status, 403);
    assert.equal((await cliente.delete('/api/carrito').set('Origin', malicioso)).status, 403);
    assert.equal((await request(app).post('/api/auth/login').set('Origin', malicioso).send({})).status, 403);
    assert.equal((await cliente.get('/api/carrito')).body.unidades, antes);

    // Las lecturas y el origen permitido (Vite en desarrollo) sí funcionan
    assert.equal((await cliente.get('/api/carrito').set('Origin', malicioso)).status, 200);
    r = await cliente.delete('/api/carrito').set('Origin', 'http://localhost:5173');
    assert.equal(r.status, 200);
    assert.equal(r.body.unidades, 0);
  });

  test('las búsquedas no permiten inyección SQL', async () => {
    const r = await request(app).get(`/api/productos?q=${encodeURIComponent("' OR 1=1 --")}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.productos.length, 0);
    const orden = await request(app).get(`/api/productos?orden=${encodeURIComponent('precio; DROP TABLE usuarios')}`);
    assert.equal(orden.status, 400);
  });

  test('los errores no exponen detalles internos', async () => {
    const r = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{malo');
    assert.equal(r.status, 400);
    assert.equal(r.body.error, 'JSON mal formado');
    assert.equal(r.body.stack, undefined);
  });

  test('cerrar sesión borra la cookie del navegador', async () => {
    const a = await agente('ana@test.com', 'Cliente123');
    assert.equal((await a.post('/api/auth/logout')).status, 204);
    assert.equal((await a.get('/api/auth/me')).status, 401);
  });
});
