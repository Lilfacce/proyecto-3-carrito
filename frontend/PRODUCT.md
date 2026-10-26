# PRODUCT.md — TecnoXela

Contexto de producto para tomar decisiones de diseño y de interfaz. Acompaña a
[DESIGN.md](DESIGN.md), que define el sistema visual. Si cambia algo de esta página, actualízala.

> Borrador escrito a partir del código y de los manuales del proyecto. Los puntos marcados
> **(supuesto)** no salen de una conversación con el equipo: confírmalos o corrígelos.

## Qué es

Tienda en línea de tecnología y accesorios (audífonos, computación, almacenamiento, accesorios y
wearables) con entrega a domicilio. Proyecto académico del III parcial de Ingeniería del Cambio
(Universidad Mesoamericana): los pagos y los correos son **simulados**.

## Para quién

| Persona | Qué necesita | Dónde |
|---|---|---|
| **Cliente** | Encontrar un producto rápido, saber si hay existencias, pagar sin dudas y seguir su pedido | Catálogo, producto, carrito, checkout, mis pedidos |
| **Administrador** | Mantener catálogo e inventario al día, mover pedidos de estado y atender a clientes | Panel `/admin` |
| **Evaluador del curso** | Ver en pocos minutos que la tienda funciona, es segura y está bien hecha | Demostración en vivo ([GUION_DEMO.md](../docs/GUION_DEMO.md)) |

- Clientes en Guatemala; precios en quetzales; idioma español. **(supuesto: mayoría desde el teléfono)**
- Administradores: personal de una tienda pequeña, uso diario desde computadora y a veces desde el teléfono.

## Modos de las superficies

| Superficie | Modo | Qué significa |
|---|---|---|
| Hero del catálogo | Persuadir | Primera impresión; aquí vive el único momento expresivo (tarjetas flotantes) |
| Catálogo, producto, carrito, checkout | Operar | Escanear, comparar, actuar. Claridad antes que adorno |
| Panel de administración | Operar | Densidad, tablas legibles, acciones claras. Nada se mueve por estilo |
| Recuperar contraseña, errores | Operar | Calma, una sola acción principal, decir cómo recuperarse |

## Principios

1. **El producto es el color.** La interfaz es neutra (blanco, gris y negro); el violeta solo marca la
   identidad (logotipo) y la búsqueda.
2. **Confianza en cada paso del pago.** Siempre visible que el pago es simulado, qué se guarda de la
   tarjeta (marca y últimos 4) y cuánto se va a cobrar.
3. **Decir la verdad sobre las existencias.** “¡Quedan N!” y “Agotado” se ven antes de entrar al producto.
4. **El movimiento tiene un porqué.** Confirmar una acción, mostrar de dónde viene algo o evitar saltos.
   Con “reducir movimiento” se quitan los desplazamientos.
5. **Accesible por defecto.** Contraste AA, foco visible violeta, modales con foco atrapado, objetivos
   táctiles de 36 px o más.

## Voz

Español neutro con tuteo, frases cortas y concretas. Los botones nombran la acción (“Agregar al carrito”,
“Marcar como enviado”). Los errores dicen qué pasó y qué hacer (“El enlace no es válido o ya venció.
Pide uno nuevo.”). Sin tecnicismos para el cliente.

## Fuera de alcance

- Pagos y correos reales (el diseño debe dejar claro que son simulados).
- Varias monedas o idiomas. **(supuesto)**
- Modo oscuro: no se pidió y la guía de estilo es solo clara. **(supuesto)**

## Métricas de éxito

**(supuesto)** Que en la demostración un cliente nuevo complete registro → compra en menos de 2 minutos
sin ayuda, y que el administrador avance un pedido y reabastezca un producto sin buscar dónde.
