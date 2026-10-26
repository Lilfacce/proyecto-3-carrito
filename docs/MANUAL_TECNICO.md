# Manual técnico — TecnoXela

Carrito de compras para comercio electrónico. Proyecto corto del III parcial, Ingeniería del Cambio,
Universidad Mesoamericana.

Este manual está dirigido a quien instala, mantiene o evalúa el sistema. La guía para clientes y
administradores está en el [Manual de usuario](MANUAL_USUARIO.md).

**Versión:** 26/10/2026 — incluye el rediseño de la interfaz, las animaciones, la paginación, las fotos
de productos, la recuperación de contraseña y las pruebas del frontend.

---

## 1. Análisis

### 1.1 Problema

Un pequeño comercio de tecnología necesita vender en línea. Sus clientes deben poder ver productos,
armar un carrito y comprar desde la computadora o el teléfono, y el dueño debe poder administrar
productos, inventario, pedidos y clientes sin conocimientos técnicos.

### 1.2 Actores

| Actor | Descripción |
|---|---|
| Visitante | Persona sin sesión. Puede ver el catálogo y el detalle de los productos. |
| Cliente | Usuario registrado. Usa el carrito, compra, consulta y cancela sus pedidos, edita su perfil. |
| Administrador | Dueño o empleado. Accede al panel de gestión. |

### 1.3 Requisitos funcionales

| ID | Requisito | Dónde se implementa |
|---|---|---|
| RF-01 | Ver catálogo con búsqueda, categorías, orden y paginación (“ver más”) | `GET /api/productos`, `Catalogo.jsx` |
| RF-02 | Ver detalle de un producto | `GET /api/productos/:id`, `Producto.jsx` |
| RF-03 | Registrarse e iniciar/cerrar sesión | `routes/auth.js`, `Registro.jsx`, `Login.jsx` |
| RF-04 | Agregar productos al carrito | `POST /api/carrito` |
| RF-05 | Modificar cantidades y eliminar productos del carrito | `PUT`/`DELETE /api/carrito/:productoId` |
| RF-06 | Confirmar la compra con pago simulado (tarjeta o contra entrega) | `POST /api/pedidos`, `pago.js`, `Checkout.jsx` |
| RF-07 | Consultar y cancelar pedidos propios | `/api/pedidos/mios`, `MisPedidos.jsx` |
| RF-08 | Editar perfil y contraseña | `PUT /api/auth/me[/password]`, `Perfil.jsx` |
| RF-09 | Administrar productos: agregar, editar, eliminar | `routes/productos.js`, `admin/Productos.jsx` |
| RF-10 | Visualizar y controlar inventario, alertas de stock bajo | `PATCH /api/productos/:id/stock`, `admin/Inventario.jsx` |
| RF-11 | Dar seguimiento a pedidos (pendiente → enviado → entregado / cancelado) | `PATCH /api/pedidos/:id/estado`, `admin/Pedidos.jsx` |
| RF-12 | Controlar usuarios y gestionar clientes (historial, activar/desactivar, roles) | `routes/admin.js`, `admin/Usuarios.jsx` |
| RF-13 | Resumen del negocio (ventas, pedidos, stock bajo, más vendidos) | `GET /api/admin/dashboard`, `admin/Dashboard.jsx` |
| RF-14 | Recuperar la contraseña con un enlace enviado por correo (simulado) | `POST /api/auth/recuperar`, `/restablecer`, `RecuperarPassword.jsx` |
| RF-15 | Subir la foto de un producto desde el panel | `POST /api/admin/imagenes`, `SelectorImagen.jsx` |

### 1.4 Requisitos no funcionales

| ID | Requisito | Cómo se cumple |
|---|---|---|
| RNF-01 | Interfaz sencilla e intuitiva | Flujo de compra en 3 pasos (catálogo → carrito → pago), mensajes de error en español, notificaciones; sistema visual único definido en `frontend/DESIGN.md` |
| RNF-02 | Responsiva (computadora y móvil) | Tailwind CSS con diseño *mobile first*; verificado a 375 px y en escritorio |
| RNF-03 | Seguridad de datos sensibles | Ver sección 6 |
| RNF-04 | Consistencia del inventario | Compras en transacción con bloqueo de filas (`SELECT … FOR UPDATE`) |
| RNF-05 | Control de versiones | Git y GitHub; los cambios entran a `main` por pull request |
| RNF-06 | Accesibilidad | Contraste AA, foco visible, etiquetas en todos los campos, modales con foco atrapado y cierre con Escape, objetivos táctiles de 36 px o más |
| RNF-07 | Movimiento con propósito | Animaciones cortas (≤ 360 ms en la interfaz) solo para confirmar acciones, orientar o evitar saltos; se reducen a fundidos con “reducir movimiento” |
| RNF-08 | Calidad verificable | 50 pruebas automatizadas de la API y 25 de la interfaz; lint sin advertencias |

---

## 2. Diseño

### 2.1 Arquitectura

Aplicación de tres capas:

```
┌────────────────────┐   HTTP/JSON    ┌─────────────────────┐   SQL    ┌──────────────┐
│  Navegador         │ ─────────────▶ │  API REST           │ ───────▶ │  PostgreSQL  │
│  React 19 + Vite   │  cookie        │  Node.js + Express 5│  (pg)    │              │
│  Tailwind CSS 4    │  httpOnly      │  Zod, JWT, bcrypt   │          │              │
└────────────────────┘ ◀───────────── └─────────────────────┘ ◀─────── └──────────────┘
```

- En **desarrollo** corren dos servidores: Vite (`:5173`) y la API (`:3000`). Vite reenvía `/api` y
  `/uploads` a la API, así el navegador ve un solo origen y la cookie de sesión funciona sin CORS.
- En la **demostración/producción** se compila el frontend (`frontend/dist`) y Express lo sirve junto con
  la API en el puerto 3000.
- Las **fotos de productos** se guardan en disco (`backend/uploads/`) y Express las sirve en `/uploads`.
  La base de datos solo guarda la ruta.
- El **correo** es simulado (`src/correo.js`): el mensaje se imprime en la consola del backend. Para usar
  un servidor real basta con reemplazar esa función.

### 2.2 Tecnologías

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | React 19, React Router 7, Vite 8, Tailwind CSS 4 | Componentes reutilizables, recarga rápida, estilos responsivos |
| Diseño y movimiento | Inter, íconos SVG propios, CSS (`@keyframes`, transiciones), View Transitions API | Sin librerías de animación: las animaciones corren en CSS fuera del hilo principal |
| Backend | Node.js, Express 5 | Mismo lenguaje en ambas capas; Express 5 captura errores de funciones `async` |
| Validación | Zod | Esquemas declarativos; rechaza y descarta campos no esperados |
| Base de datos | PostgreSQL | Transacciones ACID, bloqueos por fila, restricciones `CHECK` |
| Seguridad | bcryptjs, jsonwebtoken, helmet, express-rate-limit | Hash de contraseñas, sesión firmada, cabeceras seguras, límite de intentos |
| Pruebas (API) | `node:test` + Supertest | Sin dependencias extra; pruebas de integración reales contra PostgreSQL |
| Pruebas (interfaz) | Vitest + Testing Library + jsdom | Prueban componentes como los usa una persona (roles, textos, teclado) con la API simulada |

### 2.3 Estructura del código

```
proyecto-3/
├── backend/
│   ├── db/
│   │   ├── schema.sql      definición de tablas (DESTRUCTIVO: borra y recrea)
│   │   ├── init.js         ejecuta schema.sql
│   │   ├── migraciones.sql cambios para bases existentes (no borra datos)
│   │   ├── migrar.js       ejecuta migraciones.sql
│   │   └── seed.js         datos de ejemplo
│   ├── uploads/            fotos de productos subidas desde el panel (ignorada por Git)
│   ├── src/
│   │   ├── server.js       arranque del servidor
│   │   ├── app.js          middlewares globales y rutas
│   │   ├── config.js       lectura y validación de variables de entorno
│   │   ├── db.js           pool de conexiones y withTransaction()
│   │   ├── pago.js         pasarela simulada (Luhn, vencimiento, marca)
│   │   ├── correo.js       correo simulado: imprime el mensaje en la consola
│   │   ├── middleware/
│   │   │   ├── auth.js     sesión JWT, roles, verificación de origen (CSRF)
│   │   │   └── errors.js   HttpError y manejador central de errores
│   │   └── routes/         auth, productos, carrito, pedidos, admin, imagenes
│   └── tests/              api.test.js (integración), pago.test.js (unitarias)
├── frontend/
│   └── src/
│       ├── api.js          cliente HTTP
│       ├── context/        AuthContext, CartContext, ToastContext
│       ├── components/     Layout, rutas protegidas, UI común, íconos, SelectorImagen, LimiteError
│       ├── pages/          vistas del cliente y admin/
│       └── test/           pruebas de la interfaz (Vitest + Testing Library)
└── docs/                   manuales, pruebas y guion de demostración
```

### 2.4 Modelo de datos

```
recuperaciones_password *───1 usuarios 1───* carrito_items *───1 productos
                                   │                                  │
                                   1                                  1
                                   │                                  │
                                   *                                  *
                                pedidos 1───* detalle_pedido ─────────┘
                                   │
                                   1───1 pagos_simulados
```

| Tabla | Campos principales | Reglas |
|---|---|---|
| `usuarios` | id, nombre, email (único), password_hash, rol, activo, telefono, direccion, password_cambiado_en | `rol IN ('cliente','admin')` |
| `productos` | id, nombre, descripcion, precio, stock, stock_minimo, imagen, categoria, activo | `precio >= 0`, `stock >= 0` |
| `carrito_items` | usuario_id, producto_id, cantidad | PK compuesta; `cantidad > 0` |
| `pedidos` | id, usuario_id, total, estado, direccion_entrega, fecha | `estado IN ('pendiente','enviado','entregado','cancelado')` |
| `detalle_pedido` | pedido_id, producto_id, nombre_producto, cantidad, precio_unitario | Copia nombre y precio al momento de la compra |
| `pagos_simulados` | pedido_id, metodo, marca, ultimos4, titular, monto, estado, referencia | **Nunca** guarda el número completo ni el CVV |
| `recuperaciones_password` | usuario_id, token_hash (único), expira_en, usado_en | Solo el hash SHA-256 del token; se borra con el usuario |

Decisiones de diseño:

- **Eliminación lógica de productos**: “eliminar” pone `activo = FALSE`, así los pedidos anteriores
  conservan su referencia. El producto deja de verse en la tienda y se quita de los carritos.
- **Precio histórico**: `detalle_pedido` guarda el precio y el nombre del momento de la compra; cambiar
  el precio de un producto no altera pedidos ya hechos.
- **Restricciones en la base de datos**: aunque la API valida, los `CHECK` impiden stock negativo o
  estados inválidos incluso ante un error de programación.

**Recuperación de contraseña.** `recuperaciones_password` guarda, por cada enlace pedido, el usuario, el
**hash SHA-256** del token (nunca el token), la fecha de vencimiento (30 min) y cuándo se usó. Pedir un
enlace nuevo marca como usados los anteriores. `usuarios.password_cambiado_en` registra el último cambio
de contraseña: los JWT emitidos antes de ese momento se rechazan, lo que cierra las sesiones abiertas.

### 2.5 Estados de un pedido

```
            ┌──────────▶ cancelado   (devuelve el stock)
            │
pendiente ──┴──▶ enviado ──▶ entregado (el pago contra entrega pasa a "aprobado")
```

El cliente puede cancelar solo mientras el pedido está **pendiente**. El administrador solo puede hacer
las transiciones del diagrama; cualquier otro salto responde 400.

---

## 3. Instalación

### 3.1 Requisitos

- **Node.js 20.19+ o 22.12+** (lo exige Vite 8). Probado con Node 24.21.
- **PostgreSQL 14 o superior**. Probado con PostgreSQL 18.
- Git (opcional, para clonar).

### 3.2 Pasos

```bash
# 1. Crear dos bases de datos: una para la app y otra exclusiva para pruebas
psql -U postgres -c "CREATE DATABASE tienda;" -c "CREATE DATABASE tienda_test;"

# 2. Backend
cd backend
npm install
cp .env.example .env          # en Windows: copy .env.example .env
# editar .env (ver 3.3)
npm run db:reset              # ⚠ borra y recrea las tablas, luego carga datos de ejemplo

# 3. Frontend
cd ../frontend
npm install
```

### 3.3 Variables de entorno (`backend/.env`)

| Variable | Obligatoria | Ejemplo / valor por defecto | Descripción |
|---|---|---|---|
| `DATABASE_URL` | Sí | `postgres://postgres:clave@localhost:5432/tienda` | Base de datos de la aplicación |
| `JWT_SECRET` | Sí | cadena aleatoria de 32+ caracteres | Firma de las sesiones. El servidor no arranca si es más corta |
| `JWT_EXPIRES_IN` | No | `8h` | Duración de la sesión. La cookie usa la misma duración |
| `PORT` | No | `3000` | Puerto de la API |
| `NODE_ENV` | No | `development` | En `production` la cookie se marca `Secure` y se bloquean `db:init`/`db:seed` |
| `BCRYPT_ROUNDS` | No | `10` | Costo del hash de contraseñas |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | No | `admin@tienda.com` / `Admin123!` | Administrador que crea `db:seed` |
| `TEST_DATABASE_URL` | Para pruebas | `postgres://…/tienda_test` | Base que `npm test` **borra y recrea** |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` en desarrollo | Orígenes extra autorizados a hacer escrituras |
| `DB_TIMEZONE` | No | `America/Guatemala` | Zona horaria de los reportes por día |
| `PUBLIC_URL` | No | `http://localhost:5173` | Dirección del frontend usada en los enlaces de los correos (no se toma del encabezado `Host`) |

Generar un `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3.4 Ejecución

Desarrollo (dos terminales):

```bash
cd backend && npm run dev     # API en http://localhost:3000 (se reinicia al guardar)
cd frontend && npm run dev    # App en http://localhost:5173
```

Demostración (un solo servidor):

```bash
cd frontend && npm run build
cd ../backend && npm start    # App y API en http://localhost:3000
```

### 3.5 Scripts

| Comando | Carpeta | Qué hace |
|---|---|---|
| `npm run dev` | backend / frontend | Servidor de desarrollo |
| `npm start` | backend | Servidor de producción (sirve también `frontend/dist`) |
| `npm run build` | frontend | Compila el frontend a `frontend/dist` |
| `npm run lint` | frontend | Análisis estático con oxlint |
| `npm run db:init` | backend | ⚠ Borra y recrea las tablas |
| `npm run db:seed` | backend | Carga datos de ejemplo (no duplica productos) |
| `npm run db:reset` | backend | ⚠ `db:init` + `db:seed` |
| `npm run db:migrar` | backend | Aplica `migraciones.sql` a una base existente **sin borrar datos** |
| `npm test` | backend | Ejecuta las 50 pruebas de la API |
| `npm test` | frontend | Ejecuta las 25 pruebas de la interfaz (Vitest, sin navegador ni backend) |

> **Advertencia:** `db:init` y `db:reset` eliminan todos los datos de `DATABASE_URL`. Úsalos solo
> contra la base de desarrollo. Ambos (y `db:seed`) se niegan a correr con `NODE_ENV=production`.

---

## 4. Implementación

### 4.1 API REST

Todas las respuestas son JSON. Los errores tienen la forma `{ "error": "mensaje", "details": [...] }`.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/salud` | público | Verificación de que la API responde |
| POST | `/api/auth/registro` | público | Crea una cuenta de cliente e inicia sesión |
| POST | `/api/auth/login` | público | Inicia sesión |
| POST | `/api/auth/logout` | público | Cierra sesión (borra la cookie) |
| GET / PUT | `/api/auth/me` | sesión | Ver / editar perfil (nombre, teléfono, dirección) |
| PUT | `/api/auth/me/password` | sesión | Cambiar contraseña (pide la actual). Cierra las demás sesiones y renueva la actual |
| POST | `/api/auth/recuperar` | público | Envía (simulado) un enlace para restablecer. Responde igual exista o no la cuenta |
| POST | `/api/auth/restablecer` | público | `{ token, password }`: cambia la contraseña con un enlace vigente y no usado |
| GET | `/api/productos?q=&categoria=&orden=&limite=&pagina=` | público | Catálogo (`orden`: nombre, precio_asc, precio_desc, recientes). Con `limite` (1–48) pagina y devuelve `total` y `paginas`; sin él devuelve todo |
| GET | `/api/productos/categorias` | público | Categorías con productos activos |
| GET | `/api/productos/:id` | público | Detalle de un producto activo |
| GET | `/api/productos/admin/todos` | admin | Todos los productos, incluidos inactivos, con `stock_bajo` |
| POST | `/api/productos` | admin | Crear producto |
| PUT | `/api/productos/:id` | admin | Editar datos (no modifica el stock) |
| POST | `/api/admin/imagenes` | admin | Cuerpo binario `image/png`, `image/jpeg` o `image/webp` (máx. 2 MB). Devuelve `{ url: "/uploads/…" }` |
| PATCH | `/api/productos/:id/stock` | admin | Ajuste de inventario `{ "ajuste": +n / -n }` |
| DELETE | `/api/productos/:id` | admin | Desactivar producto |
| GET | `/api/carrito` | sesión | Carrito con precios actuales |
| POST | `/api/carrito` | sesión | Agregar `{ producto_id, cantidad }` (suma si ya estaba) |
| PUT | `/api/carrito/:productoId` | sesión | Cambiar cantidad `{ cantidad }` |
| DELETE | `/api/carrito/:productoId` | sesión | Quitar un producto |
| DELETE | `/api/carrito` | sesión | Vaciar el carrito |
| POST | `/api/pedidos` | sesión | Confirmar compra (ver 4.2) |
| GET | `/api/pedidos/mios` | sesión | Mis pedidos |
| GET | `/api/pedidos/mios/:id` | sesión | Detalle de un pedido propio |
| POST | `/api/pedidos/mios/:id/cancelar` | sesión | Cancelar un pedido propio pendiente |
| GET | `/api/pedidos?estado=&q=` | admin | Todos los pedidos con filtros |
| GET | `/api/pedidos/:id` | admin | Detalle de cualquier pedido |
| PATCH | `/api/pedidos/:id/estado` | admin | Cambiar estado `{ estado }` |
| GET | `/api/admin/dashboard` | admin | Resumen del negocio |
| GET | `/api/admin/usuarios?q=&rol=` | admin | Usuarios con número de pedidos y total comprado |
| GET | `/api/admin/usuarios/:id` | admin | Datos e historial de pedidos de un usuario |
| POST | `/api/admin/usuarios` | admin | Crear usuario (cliente o administrador) |
| PATCH | `/api/admin/usuarios/:id` | admin | Activar/desactivar o cambiar rol |

Códigos de estado usados: `200/201/204` éxito · `400` datos inválidos · `401` sin sesión o sesión
vencida · `402` pago rechazado · `403` sin permiso u origen no permitido · `404` no existe ·
`409` conflicto (correo repetido, sin stock) · `429` demasiados intentos · `500` error interno (sin detalles).

Ejemplo de compra:

```http
POST /api/pedidos
Content-Type: application/json

{
  "metodo": "tarjeta",
  "direccion_entrega": "4a. Calle 12-30, Zona 1, Quetzaltenango",
  "tarjeta": { "numero": "4242 4242 4242 4242", "titular": "Ana López", "vencimiento": "12/30", "cvv": "123" }
}
```

### 4.2 Flujo de compra (transacción)

`POST /api/pedidos` hace todo dentro de **una sola transacción** (`withTransaction` en `db.js`):

1. Valida los datos y la tarjeta (Luhn, vencimiento, CVV) antes de abrir la transacción.
2. Lee el carrito y **bloquea** las filas de los productos (`SELECT … FOR UPDATE`, ordenado por id para
   evitar *deadlocks*). Una segunda compra simultánea del mismo producto espera a que la primera termine.
3. Verifica que cada producto siga activo y con stock suficiente; si no, responde 409 con el detalle.
4. Calcula el total **con los precios de la base de datos**. El navegador solo envía método y dirección;
   cualquier precio o total que mande se descarta.
5. Si la tarjeta es la de rechazo simulado, responde 402.
6. Inserta el pedido, su detalle, descuenta el stock, registra el pago (solo marca y últimos 4) y vacía el carrito.
7. `COMMIT`. Si cualquier paso falla, `ROLLBACK`: nada cambia.

### 4.3 Pasarela de pago simulada (`pago.js`)

No se conecta a ningún banco. Valida el número con el algoritmo de Luhn, la fecha `MM/AA` (vigente hasta
el último día del mes) y el CVV de 3–4 dígitos; detecta la marca (Visa, Mastercard, Amex) y genera una
referencia `SIM-XXXXXXXXXXXX`. Solo devuelve marca, últimos 4 dígitos y titular.

| Tarjeta | Resultado |
|---|---|
| `4242 4242 4242 4242` | Aprobada |
| `5555 5555 5555 4444` | Aprobada (Mastercard) |
| `4000 0000 0000 0002` | Rechazada por el “banco” (402) |
| Cualquier número que no pase Luhn | Inválida (400) |

El pago **contra entrega** se registra como `pendiente` y pasa a `aprobado` cuando el pedido se marca entregado.

### 4.4 Recuperación de contraseña

1. `POST /api/auth/recuperar` con el correo. Si pertenece a una cuenta activa, se genera un token aleatorio
   de 256 bits, se guarda **solo su hash** con vencimiento de 30 minutos, se anulan los enlaces anteriores
   sin usar y se “envía” el enlace `PUBLIC_URL/restablecer?token=…`. La respuesta es idéntica exista o no
   la cuenta.
2. La página `/restablecer` toma el token de la URL y pide la contraseña nueva (mismas reglas que el registro).
3. `POST /api/auth/restablecer` marca el enlace como usado y cambia la contraseña **en la misma
   transacción**, de modo que un enlace no sirve dos veces aunque llegue dos veces a la vez.
4. Se guarda `password_cambiado_en` (truncado al segundo). `requireAuth` rechaza los JWT emitidos antes,
   así se cierran las sesiones abiertas. Al cambiar la contraseña desde el perfil, la sesión actual se renueva.

### 4.5 Fotos de productos

1. En el formulario de producto, `SelectorImagen` envía el archivo tal cual (`Content-Type: image/…`) a
   `POST /api/admin/imagenes`. Valida antes en el navegador el tipo y los 2 MB para responder rápido.
2. El servidor acepta como máximo 2 MB (413 si se pasa) y decide el tipo por la **firma binaria** del
   archivo (PNG, JPG o WebP), no por el encabezado ni la extensión.
3. Guarda el archivo como `uploads/<32 hex aleatorios>.<ext>` y responde `{ url: "/uploads/…" }`.
4. Al guardar el producto, `imagen` solo acepta `http(s)://…` o una ruta que coincida exactamente con
   `/uploads/<hex>.<ext>`, así no se puede apuntar a otros archivos del servidor.

> Las fotos viven fuera de la base de datos: al respaldar o mover el sistema hay que copiar también
> `backend/uploads/`.

### 4.6 Frontend

- `AuthContext` consulta `/api/auth/me` al cargar para saber si hay sesión (el token no es accesible desde JavaScript).
- `CartContext` mantiene el carrito sincronizado con el servidor; el contador del encabezado se actualiza al agregar.
- `Rutas.jsx` protege las páginas: las de cliente exigen sesión y las de `/admin` exigen rol administrador.
  Esta protección es solo de interfaz; la seguridad real la aplica la API.
- En pantallas de menos de 640 px las tablas del panel se muestran como tarjetas (clase `tabla-movil`:
  cada celda lleva su encabezado en `data-etiqueta`) y el menú lateral se convierte en pestañas.
  Las listas largas del panel se muestran de 15 en 15 (`usePorPartes`); el catálogo pide páginas de 12 a la API.
- `LimiteError` atrapa errores de renderizado y muestra “Algo salió mal” en lugar de una pantalla en blanco.
- Los modales mueven el foco al abrirse, lo devuelven al cerrarse, atrapan Tab y, si hay dos abiertos,
  Escape cierra solo el de arriba.
- **Diseño y movimiento.** Los tokens visuales están en `src/index.css` (ver `frontend/DESIGN.md`).
  Las animaciones tienen un propósito concreto: punto del logotipo (una vez por visita), tarjetas
  flotantes del hero, aparición escalonada del catálogo, skeletons de carga, confirmación del botón
  **+** y del ícono del carrito, check que se dibuja al terminar la compra, entrada de modales y avisos,
  y transición de la imagen de la tarjeta a la página del producto (View Transitions API). Con
  “reducir movimiento” activado en el sistema se eliminan los desplazamientos y quedan solo fundidos.

---

## 5. Pruebas

```bash
cd backend && npm test     # API
cd frontend && npm test    # interfaz
```

- `frontend/src/test/*.test.js(x)`: pruebas de la interfaz con Vitest + Testing Library en jsdom. La API
  se simula, así que no necesitan backend ni base de datos.
- `tests/pago.test.js`: pruebas unitarias de la pasarela simulada.
- `tests/api.test.js`: pruebas de integración que levantan la app en memoria y la ejercitan con Supertest
  contra una base PostgreSQL real (`TEST_DATABASE_URL`). La base se **borra y recrea** en cada corrida; las
  pruebas se niegan a correr si `TEST_DATABASE_URL` es igual a `DATABASE_URL`.

Resultado actual: **backend 50 de 50 aprobadas; frontend 25 de 25 aprobadas**. El detalle de cada caso, con resultado esperado y obtenido,
está en [PRUEBAS.md](PRUEBAS.md).

---

## 6. Seguridad

| Amenaza | Control implementado | Archivo |
|---|---|---|
| Robo de contraseñas | Hash bcrypt; política mínima (8+ caracteres, letra y número); el hash nunca sale de la API | `routes/auth.js`, `routes/admin.js` |
| Enumeración de cuentas | Mismo mensaje si el correo no existe o la contraseña es incorrecta; `/recuperar` responde igual exista o no la cuenta | `routes/auth.js` |
| Robo de enlaces de recuperación | Token aleatorio de 256 bits, solo se guarda su hash, vence en 30 min, un solo uso, un enlace nuevo anula los anteriores; el enlace usa `PUBLIC_URL` y no el encabezado `Host` | `routes/auth.js` |
| Sesiones tras cambiar la contraseña | Los JWT emitidos antes de `password_cambiado_en` se rechazan | `middleware/auth.js` |
| Archivos maliciosos | El tipo de imagen se comprueba por su firma binaria; nombre aleatorio; 2 MB máx.; se sirven con `nosniff`; la ruta guardada en el producto debe coincidir con `/uploads/<hex>.<ext>` | `routes/imagenes.js`, `routes/productos.js` |
| Fuerza bruta | Máximo 20 intentos de login/registro cada 15 min por IP | `routes/auth.js` |
| Robo de sesión por XSS | JWT en cookie `httpOnly` (JavaScript no la puede leer); React escapa el contenido; Helmet con CSP | `middleware/auth.js`, `app.js` |
| CSRF | Cookie `SameSite=Lax` **y** rechazo (403) de escrituras con un `Origin` ajeno | `middleware/auth.js` |
| Sesión indefinida | El JWT y la cookie vencen juntos (`JWT_EXPIRES_IN`); token vencido o alterado → 401 y se borra la cookie | `middleware/auth.js` |
| Escalada de privilegios | Rol verificado en el servidor en cada ruta de administración; el rol y el estado se leen de la BD en cada petición (desactivar o quitar el rol tiene efecto inmediato); el perfil no permite cambiar el rol | `middleware/auth.js` |
| Acceso a datos ajenos (IDOR) | Las rutas `/mios` filtran por el usuario de la sesión y responden 404 para no revelar que el pedido existe | `routes/pedidos.js` |
| Manipulación de precios | El total se calcula con precios de la BD; los campos extra del cliente se descartan | `routes/pedidos.js` |
| Sobreventa | Transacción con `FOR UPDATE`; `CHECK (stock >= 0)` | `routes/pedidos.js`, `schema.sql` |
| Inyección SQL | Consultas parametrizadas (`$1, $2…`); el orden se elige de una lista cerrada | todas las rutas |
| Datos de tarjeta | Solo se guardan marca y últimos 4; el número completo y el CVV nunca se escriben en BD ni en logs | `pago.js`, `schema.sql` |
| Fuga de información en errores | Errores 500 genéricos; el detalle solo va a la consola del servidor | `middleware/errors.js` |
| Entrada maliciosa | Validación con Zod de cuerpo, parámetros y consulta; JSON limitado a 100 KB; URLs de imagen solo `http(s)` | todas las rutas |
| Secretos en el repositorio | `.env` ignorado por Git; servidor no arranca sin `JWT_SECRET` de 32+ caracteres | `.gitignore`, `config.js` |

### 6.1 Credenciales de demostración

Las cuentas creadas por `db:seed` (`admin@tienda.com`, `ana@correo.com`, `carlos@correo.com`) tienen
contraseñas públicas documentadas en el README. Son **solo para el entorno local de la clase**.
`db:seed` se niega a ejecutarse con `NODE_ENV=production`. Antes de un despliegue real:

1. Usar un `JWT_SECRET` nuevo y aleatorio.
2. Crear el administrador con una contraseña propia y no usar las cuentas de ejemplo.
3. Definir `NODE_ENV=production` (cookie `Secure`, requiere HTTPS).
4. Si el frontend se sirve desde otro dominio, agregarlo a `ALLOWED_ORIGINS`.

---

## 7. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Falta DATABASE_URL` al arrancar | No existe `backend/.env` | Copiar `.env.example` a `.env` |
| `JWT_SECRET debe existir y tener al menos 32 caracteres` | Secreto corto | Generar uno con el comando de 3.3 |
| `ECONNREFUSED` | PostgreSQL apagado o puerto distinto | Iniciar el servicio y revisar el puerto en `DATABASE_URL` |
| `password authentication failed` | Usuario/clave incorrectos en la URL | Corregir `DATABASE_URL` |
| `relation "usuarios" does not exist` | No se creó el esquema | `npm run db:reset` (solo en desarrollo) |
| La página muestra “Ruta no encontrada” en `:3000` | No se compiló el frontend | `cd frontend && npm run build` |
| Error al instalar/compilar Vite | Node.js antiguo | Actualizar a Node 20.19+ o 22.12+ |
| “Demasiados intentos” | Límite de login alcanzado | Esperar 15 minutos o reiniciar el servidor |
| “Origen de la petición no permitido” | El frontend corre en un origen no autorizado | Agregarlo a `ALLOWED_ORIGINS` |
| `relation "recuperaciones_password" does not exist` | La base se creó con una versión anterior | `npm run db:migrar` (no borra datos) |
| “No pudimos conectar con el servidor” | El backend está apagado o reiniciándose | Iniciar `npm run dev` en `backend` |
| No llega el correo de recuperación | El correo es simulado | Buscar el enlace en la consola del backend |
