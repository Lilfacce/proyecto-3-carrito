# TecnoXela — Carrito de compras para comercio electrónico

Proyecto corto del III parcial (Ingeniería del Cambio, Universidad Mesoamericana).
Aplicación web responsive con **vista de cliente** (catálogo, carrito, compra con pago simulado, seguimiento de pedidos)
y **panel de administración** (resumen, productos, inventario, pedidos y usuarios).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS 4 + React Router |
| Backend | Node.js + Express 5 (API REST) |
| Base de datos | PostgreSQL |
| Seguridad | bcrypt (contraseñas), JWT en cookie `httpOnly`, roles cliente/admin, Helmet, rate limiting, validación con Zod |
| Pruebas | `node:test` + Supertest (integración contra PostgreSQL) |

## Requisitos

- Node.js **20.19+ o 22.12+** (lo exige Vite 8; probado con Node 24.13)
- PostgreSQL 14 o superior (probado con PostgreSQL 18)

## Documentación

- [Manual técnico](docs/MANUAL_TECNICO.md) — arquitectura, instalación, base de datos, API, seguridad y pruebas
- [Manual de usuario](docs/MANUAL_USUARIO.md) — guía paso a paso para clientes y administradores
- [Plan y resultados de pruebas](docs/PRUEBAS.md) — casos con resultado esperado y obtenido
- [Guion de la demostración](docs/GUION_DEMO.md)

## Instalación

```bash
# 1. Crear las bases de datos (una para la app y otra para pruebas)
psql -U postgres -c "CREATE DATABASE tienda;" -c "CREATE DATABASE tienda_test;"

# 2. Backend
cd backend
npm install
cp .env.example .env      # en Windows: copy .env.example .env
# Edita .env: DATABASE_URL, TEST_DATABASE_URL y JWT_SECRET
npm run db:reset          # ⚠ BORRA y recrea las tablas, luego carga datos de ejemplo

# 3. Frontend
cd ../frontend
npm install
```

> ⚠ `npm run db:reset` (y `db:init`) es **destructivo**: elimina todas las tablas de `DATABASE_URL`.
> Úsalo solo con la base de desarrollo. Se niega a ejecutarse con `NODE_ENV=production`.

## Ejecutar en desarrollo

En dos terminales:

```bash
cd backend && npm run dev     # API en http://localhost:3000
cd frontend && npm run dev    # App en http://localhost:5173 (redirige /api al backend)
```

## Ejecutar para la demostración (un solo servidor)

```bash
cd frontend && npm run build
cd ../backend && npm start    # App y API en http://localhost:3000
```

## Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@tienda.com` | la de `ADMIN_PASSWORD` en `.env` (por defecto `Admin123!`) |
| Cliente | `ana@correo.com` | `Cliente123!` |
| Cliente | `carlos@correo.com` | `Cliente123!` |

> Estas contraseñas son **públicas y solo para la demostración local**. `db:seed` se niega a correr con
> `NODE_ENV=production`; antes de cualquier despliegue real crea el administrador con una contraseña propia
> y cambia `JWT_SECRET`.

Tarjetas de prueba (pago simulado, cualquier fecha futura y CVV):

- `4242 4242 4242 4242` → aprobada
- `4000 0000 0000 0002` → rechazada

## Pruebas

```bash
cd backend && npm test
```

40 pruebas automatizadas. Cubren registro/login, permisos por rol en **todas** las rutas de administración,
carrito y validación de cantidades, precio tomado del servidor (aunque el navegador envíe otro),
pago rechazado sin efectos, **dos compras simultáneas del último producto** (solo una gana),
edición y desactivación de productos, inventario, transiciones de estado de pedidos, cancelación con
devolución de stock, gestión de usuarios y roles, sesión expirada o falsificada, pedidos ajenos,
protección CSRF por origen e intentos de inyección SQL. El detalle está en [docs/PRUEBAS.md](docs/PRUEBAS.md).

> `npm test` borra y recrea la base `TEST_DATABASE_URL`. No apuntes esa variable a la base real
> (las pruebas se niegan a correr si es igual a `DATABASE_URL`).

## Estructura

```
proyecto-3/
├── backend/
│   ├── db/            schema.sql, init.js (crea tablas), seed.js (datos de ejemplo)
│   ├── src/
│   │   ├── app.js     configuración de Express y rutas
│   │   ├── db.js      pool de PostgreSQL y helper de transacciones
│   │   ├── pago.js    pasarela de pago simulada (Luhn, vencimiento, últimos 4)
│   │   ├── middleware/ auth (JWT + roles) y manejo de errores
│   │   └── routes/    auth, productos, carrito, pedidos, admin
│   └── tests/
└── frontend/
    └── src/
        ├── api.js     cliente HTTP
        ├── context/   sesión, carrito y notificaciones
        ├── components/
        └── pages/     vistas del cliente y admin/
```

## Endpoints principales

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/auth/registro` | público | Crear cuenta de cliente |
| POST | `/api/auth/login` · `/logout` | público | Iniciar / cerrar sesión |
| GET/PUT | `/api/auth/me` | sesión | Ver / editar perfil |
| PUT | `/api/auth/me/password` | sesión | Cambiar contraseña |
| GET | `/api/productos?q=&categoria=&orden=` | público | Catálogo con búsqueda |
| GET | `/api/productos/:id` · `/categorias` | público | Detalle / categorías |
| POST/PUT/DELETE | `/api/productos[/:id]` | admin | CRUD de productos (eliminar = desactivar) |
| PATCH | `/api/productos/:id/stock` | admin | Ajuste de inventario |
| GET/POST/DELETE | `/api/carrito` | cliente | Ver, agregar, vaciar |
| PUT/DELETE | `/api/carrito/:productoId` | cliente | Cambiar cantidad / quitar |
| POST | `/api/pedidos` | cliente | Confirmar compra (transacción) |
| GET | `/api/pedidos/mios[/:id]` | cliente | Mis pedidos |
| POST | `/api/pedidos/mios/:id/cancelar` | cliente | Cancelar pedido pendiente |
| GET | `/api/pedidos[/:id]` | admin | Todos los pedidos |
| PATCH | `/api/pedidos/:id/estado` | admin | pendiente → enviado → entregado / cancelado |
| GET | `/api/admin/dashboard` | admin | Resumen del negocio |
| GET/POST/PATCH | `/api/admin/usuarios[/:id]` | admin | Gestión de usuarios y clientes |

## Reglas de negocio y seguridad

- **Compra en una transacción**: se bloquean los productos (`SELECT … FOR UPDATE`), se valida el stock,
  se crea el pedido, se descuenta el inventario, se registra el pago y se vacía el carrito. Si algo falla, `ROLLBACK`.
- **El precio lo pone el servidor**: el total se calcula con los precios de la base de datos; el navegador solo envía ids y cantidades.
- **Tarjetas**: nunca se guarda el número completo ni el CVV, solo marca y últimos 4 dígitos.
- **Contraseñas** con bcrypt; los mensajes de login no revelan si un correo existe.
- **Sesión** en cookie `httpOnly` + `SameSite=Lax` que vence junto con el JWT (`JWT_EXPIRES_IN`); límite de intentos en login/registro.
- **CSRF**: además de `SameSite`, las escrituras con un `Origin` ajeno se rechazan (403).
- **Inventario sin pérdidas**: editar un producto no sobrescribe su stock; el stock solo cambia con ajustes atómicos, compras y cancelaciones.
- **Usuarios desactivados** pierden el acceso de inmediato (se verifica en cada petición).
- Los productos eliminados se **desactivan** para conservar el historial de pedidos.
