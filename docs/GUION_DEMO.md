# Guion de la demostración — TecnoXela

Duración sugerida: **12–15 minutos**. Conviene ensayarlo completo al menos una vez.

## Antes de presentar (10 minutos antes)

1. Verificar que PostgreSQL esté corriendo.
2. Dejar los datos limpios y la app compilada (si la base ya existía de una versión anterior y no se
   quiere borrar, basta con `npm run db:migrar` en lugar de `db:reset`):
   ```bash
   cd backend && npm run db:reset
   cd ../frontend && npm run build
   cd ../backend && npm start
   ```
3. Abrir **dos ventanas** del navegador en `http://localhost:3000`:
   - Ventana normal → cliente.
   - Ventana de incógnito → administrador (así las sesiones no se mezclan).
4. Tener abierta una terminal en `backend` para correr `npm test` en vivo. Esa misma terminal muestra
   los **correos simulados** (enlace de recuperación de contraseña).
5. Tener a mano una foto de producto (PNG o JPG de menos de 2 MB) para subirla en vivo.
6. Tener a mano: `4242 4242 4242 4242` (aprobada) y `4000 0000 0000 0002` (rechazada).
7. Plan B: si algo falla, capturas de pantalla de cada paso y el resultado de `npm test`.

## 1. Introducción (1 min)

- Problema: una tienda de tecnología que quiere vender en línea.
- Dos vistas: **cliente** y **administrador**.
- Tecnologías: React + Express + PostgreSQL, control de versiones con Git.

## 2. Vista del cliente (5 min)

| Paso | Acción | Qué decir |
|---|---|---|
| 1 | Mostrar el catálogo; buscar “usb”, filtrar por **Audio**, ordenar por precio, **Ver más** | Búsqueda, categorías, orden y paginación |
| 2 | Tocar **+** sin sesión | Pide iniciar sesión y regresa después |
| 3 | **Crear cuenta** con una contraseña débil (`123`) y luego una válida | Validación de contraseñas |
| 4 | Agregar 2–3 productos; abrir uno desde su tarjeta | Botón con ✓, contador animado y la imagen que “viaja” al detalle |
| 5 | En el carrito: **+**, **−**, **Eliminar** | Total recalculado por el servidor |
| 6 | Checkout con `4000 0000 0000 0002` | Pago rechazado: no se crea pedido ni se descuenta stock |
| 7 | Checkout con `4242 4242 4242 4242` | Compra confirmada; solo se guardan marca y últimos 4 |
| 8 | **Mis pedidos** → detalle | Línea de seguimiento del pedido |
| 9 | Cerrar sesión → **¿La olvidaste?** → copiar el enlace de la terminal → nueva contraseña | Recuperación con enlace de un solo uso; solo se guarda su hash |
| 10 | Reducir la ventana o activar la vista de dispositivo del navegador (F12 → **Ctrl + Mayús + M**) | Diseño responsivo; en el admin las tablas pasan a tarjetas |

## 3. Vista del administrador (5 min)

En la ventana de incógnito, iniciar sesión como `admin@tienda.com`.

| Paso | Acción | Qué decir |
|---|---|---|
| 1 | **Resumen** | Ventas, pedidos, clientes, alertas de stock bajo, más vendidos |
| 2 | **Pedidos** → abrir el pedido recién hecho → **Marcar como enviado** | Seguimiento; volver a la ventana del cliente y refrescar: el estado cambió |
| 3 | **Productos** → **+ Nuevo producto** → **Subir foto** | Alta de producto con foto; el servidor valida que sea una imagen real |
| 4 | **Editar** el precio | Los pedidos anteriores conservan su precio |
| 5 | **Inventario** → **+10** a un producto con stock bajo | La alerta desaparece |
| 6 | **Eliminar** un producto | Se desactiva: sale de la tienda, el historial se conserva |
| 7 | **Usuarios** → abrir a Ana López | Historial y total comprado |
| 8 | **Desactivar** al cliente de la otra ventana y refrescarla | Pierde el acceso de inmediato |

## 4. Seguridad y pruebas (2–3 min)

1. En la ventana del cliente, escribir `http://localhost:3000/admin` → lo redirige; la API responde 403.
2. Explicar brevemente: contraseñas con bcrypt, sesión en cookie `httpOnly`, precios calculados en el
   servidor, compras en transacción, tarjetas nunca guardadas completas.
3. Correr en la terminal:
   ```bash
   npm test
   ```
   Mostrar **50 pruebas aprobadas**, en especial “dos compras simultáneas del último stock: solo una gana”.
   Después, en `frontend`, `npm test` muestra las **25 pruebas de la interfaz** (catálogo, modales, API).

## 5. Cierre (1 min)

- Entregables: código fuente, manual técnico, manual de usuario, plan de pruebas.
- Extras: seguridad de datos sensibles, documentación de análisis/diseño/implementación/pruebas, Git.
- Preguntas.
