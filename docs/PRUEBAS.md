# Plan y resultados de pruebas — TecnoXela

Fecha de ejecución: 24/10/2026 · Node.js 24.13 · PostgreSQL 18 · Windows 11

## 1. Estrategia

| Nivel | Herramienta | Qué valida |
|---|---|---|
| Unitarias | `node:test` (`tests/pago.test.js`) | Pasarela de pago simulada |
| Integración | `node:test` + Supertest (`tests/api.test.js`) | API completa contra una base PostgreSQL real |
| Funcionales manuales | Navegador, vista de escritorio y móvil (375 × 812) | Flujos de cliente y administrador, diseño responsivo |
| Estáticas | `oxlint`, `vite build` | Calidad del código del frontend y que compile |

Ejecutar las pruebas automatizadas:

```bash
cd backend
npm test
```

**Resultado: 40 pruebas, 40 aprobadas, 0 fallidas.**

## 2. Pruebas automatizadas

Cada fila es una prueba de `backend/tests`. “Obtenido” corresponde a la última ejecución.

### 2.1 Autenticación

| ID | Caso | Resultado esperado | Obtenido |
|---|---|---|---|
| A-01 | Registrar un cliente | 201; correo normalizado; rol cliente; cookie `HttpOnly`; la BD guarda un hash bcrypt, no la contraseña | ✅ Aprobada |
| A-02 | Contraseña débil / correo duplicado | 400 / 409 | ✅ Aprobada |
| A-03 | Login con contraseña incorrecta | 401 con mensaje genérico | ✅ Aprobada |
| A-04 | Cliente o visitante entra al panel | 403 / 401 | ✅ Aprobada |

### 2.2 Productos

| ID | Caso | Resultado esperado | Obtenido |
|---|---|---|---|
| P-01 | Admin crea un producto | 201 y aparece en la búsqueda del catálogo | ✅ Aprobada |
| P-02 | Cliente intenta crear un producto | 403 | ✅ Aprobada |
| P-03 | Datos inválidos: precio negativo, stock decimal, nombre vacío, imagen `javascript:` | 400 en todos | ✅ Aprobada |
| P-04 | Editar el precio de un producto ya vendido | El catálogo muestra el precio nuevo; el pedido anterior conserva el precio y total originales | ✅ Aprobada |
| P-05 | Editar un producto con un stock desactualizado en el formulario | El stock no se sobrescribe (se conservan las ventas hechas mientras tanto) | ✅ Aprobada |
| P-06 | Ajuste de inventario que dejaría stock negativo | 400; un ajuste positivo suma correctamente | ✅ Aprobada |
| P-07 | Eliminar (desactivar) producto | Sale del catálogo y de los carritos, detalle 404, no se puede agregar; sigue en el panel como inactivo | ✅ Aprobada |

### 2.3 Carrito y compra

| ID | Caso | Resultado esperado | Obtenido |
|---|---|---|---|
| C-01 | Agregar dos veces el mismo producto y superar el stock | Las cantidades se suman (total Q300); pedir más que el stock → 400 | ✅ Aprobada |
| C-02 | Cantidades inválidas: 0, −1, 1.5, “abc”, 1000; producto inexistente | 400 en todas; 404 para el producto; el carrito no cambia | ✅ Aprobada |
| C-03 | El navegador envía un precio manipulado al carrito | Se acepta la cantidad, pero el precio y el total salen de la BD (Q100 c/u, Q300) | ✅ Aprobada |
| C-04 | Tarjeta inválida / tarjeta rechazada | 400 / 402; el stock y el carrito no cambian | ✅ Aprobada |
| C-05 | Compra válida enviando `total` e `items` falsos | 201; total Q300 calculado en PostgreSQL; precio unitario Q100; stock descontado; solo se guardan los últimos 4 dígitos; carrito vacío | ✅ Aprobada |
| C-06 | El stock bajó después de agregar al carrito | 409 indicando las unidades disponibles | ✅ Aprobada |
| C-07 | Dos clientes compran la última unidad al mismo tiempo | Una compra 201 y la otra 409; el stock queda en 0, nunca negativo | ✅ Aprobada |

### 2.4 Pedidos

| ID | Caso | Resultado esperado | Obtenido |
|---|---|---|---|
| O-01 | El cliente consulta sus pedidos | Solo ve los propios; uno ajeno responde 404 | ✅ Aprobada |
| O-02 | Admin cambia estados | pendiente → entregado (salto) 400; → enviado 200; → entregado 200; el cliente ya no puede cancelar | ✅ Aprobada |
| O-03 | Cliente cancela un pedido pendiente | Estado cancelado y el stock aumenta en las unidades del pedido | ✅ Aprobada |
| O-04 | Admin filtra pedidos por estado y por cliente | Solo devuelve los que cumplen el filtro; estado inexistente → 400 | ✅ Aprobada |

### 2.5 Usuarios y clientes

| ID | Caso | Resultado esperado | Obtenido |
|---|---|---|---|
| U-01 | Desactivar a un cliente con sesión abierta | Su siguiente petición → 401; su login → 403; la lista no expone `password_hash` | ✅ Aprobada |
| U-02 | El admin intenta desactivarse a sí mismo | 400 | ✅ Aprobada |
| U-03 | Dashboard | Totales, 7 días de ventas y alertas de stock bajo correctas | ✅ Aprobada |
| U-04 | Historial de un cliente | Datos e historial de pedidos sin la contraseña; coincide con el conteo de la lista | ✅ Aprobada |
| U-05 | Crear un administrador y luego quitarle el rol | Puede entrar al panel; correo duplicado 409; al volverlo cliente pierde el acceso de inmediato (403) | ✅ Aprobada |

### 2.6 Seguridad

| ID | Caso | Resultado esperado | Obtenido |
|---|---|---|---|
| S-01 | Duración de la cookie | `Max-Age` igual a la duración del JWT; `SameSite=Lax` | ✅ Aprobada |
| S-02 | Sesión expirada / token firmado con otro secreto y rol admin | 401 y se borra la cookie / 401 | ✅ Aprobada |
| S-03 | Cliente usa cada una de las 13 rutas de administración | 403 con sesión de cliente y 401 sin sesión en todas | ✅ Aprobada |
| S-04 | Cliente intenta ascenderse enviando `rol: admin` al editar su perfil | El rol sigue siendo cliente | ✅ Aprobada |
| S-05 | Cliente intenta ver o cancelar el pedido de otro | 404 en ambos; no aparece en su lista; el pedido del otro sigue pendiente | ✅ Aprobada |
| S-06 | Escritura desde otro origen (CSRF): agregar, vaciar carrito, login | 403; el carrito no cambia. Las lecturas y el origen permitido funcionan | ✅ Aprobada |
| S-07 | Inyección SQL en búsqueda y en orden | Búsqueda `' OR 1=1 --` devuelve 0 productos; orden inválido → 400 | ✅ Aprobada |
| S-08 | JSON mal formado | 400 “JSON mal formado”, sin stack ni detalles internos | ✅ Aprobada |
| S-09 | Cerrar sesión | 204 y la siguiente petición → 401 | ✅ Aprobada |

### 2.7 Pago simulado (unitarias)

| ID | Caso | Resultado esperado | Obtenido |
|---|---|---|---|
| G-01 | Algoritmo de Luhn | Acepta 4242…4242 y 5555…4444; rechaza 4242…4241 | ✅ Aprobada |
| G-02 | Detección de marca | Visa, Mastercard, Amex | ✅ Aprobada |
| G-03 | Vencimiento | Mes actual válido; mes pasado, mes 13 y formato `1/30` inválidos | ✅ Aprobada |
| G-04 | Datos expuestos por el pago | Solo últimos 4; el número completo y el CVV no aparecen | ✅ Aprobada |
| G-05 | Tarjeta de rechazo `4000 0000 0000 0002` | Válida pero no aprobada | ✅ Aprobada |

## 3. Pruebas funcionales manuales

Realizadas en el navegador con `npm run build` + `npm start` y los datos de `db:reset`.

| ID | Vista | Pasos | Resultado esperado | Obtenido |
|---|---|---|---|---|
| M-01 | Cliente · móvil 375 px | Iniciar sesión como `ana@correo.com` | Entra a la tienda; sin desplazamiento horizontal | ✅ |
| M-02 | Cliente · móvil | Agregar 2 productos desde el catálogo | Aviso de confirmación; contador del carrito en 2 | ✅ |
| M-03 | Cliente · móvil | En el carrito, aumentar una cantidad con **+** | Subtotal y total se actualizan (Q408 → Q467) | ✅ |
| M-04 | Cliente · móvil | Pagar con tarjeta 4242 4242 4242 4242 | Pantalla “¡Gracias por tu compra!”, pedido pendiente, “Visa •••• 4242”, referencia SIM | ✅ |
| M-05 | Admin · escritorio | Abrir **Resumen** | Ventas, pedidos, clientes, stock bajo, gráfica de 7 días y más vendidos | ✅ |
| M-06 | Admin · escritorio | **Productos → Editar** | Formulario con datos cargados; stock solo lectura con aviso “Se ajusta desde Inventario” | ✅ |
| M-07 | Admin · móvil | Abrir **Pedidos** | Menú en pestañas desplazables; tabla con desplazamiento propio; sin desbordar la página | ✅ |

## 4. Pruebas estáticas

| Comando | Resultado |
|---|---|
| `npm run build` (frontend) | ✅ Compila sin errores |
| `npm run lint` (frontend) | ✅ 0 errores; 2 advertencias de estilo de React (no afectan el funcionamiento) |

## 5. Defectos encontrados durante las pruebas

| # | Defecto | Severidad | Corrección | Verificación |
|---|---|---|---|---|
| 1 | Editar un producto sobrescribía el stock con el valor que tenía al abrir el formulario, borrando las ventas hechas mientras tanto | Alta | `PUT /api/productos/:id` ya no modifica el stock; el formulario lo muestra en solo lectura y se ajusta desde Inventario | P-05 |
| 2 | La cookie duraba siempre 8 h aunque `JWT_EXPIRES_IN` fuera distinto | Media | La cookie toma la duración del token | S-01 |
| 3 | La prueba “el precio enviado por el navegador se ignora” enviaba una cantidad inválida, por lo que no probaba el precio | Media (calidad de pruebas) | Reemplazada por C-03 y C-05, que hacen operaciones válidas con precios manipulados | C-03, C-05 |
| 4 | La protección CSRF dependía solo de `SameSite` | Baja | Se agregó verificación de `Origin` en escrituras | S-06 |
| 5 | `db:reset` y `db:seed` podían ejecutarse en producción | Baja | Se bloquean con `NODE_ENV=production`; las pruebas se niegan a usar la base principal | Manual |
