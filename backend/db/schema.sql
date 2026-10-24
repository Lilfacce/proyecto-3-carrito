-- Esquema de la base de datos de la tienda.
-- Se puede ejecutar varias veces: borra y vuelve a crear todo.

DROP TABLE IF EXISTS pagos_simulados CASCADE;
DROP TABLE IF EXISTS detalle_pedido CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS carrito_items CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  VARCHAR(100) NOT NULL,
  rol            VARCHAR(10)  NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
  activo         BOOLEAN      NOT NULL DEFAULT TRUE,
  telefono       VARCHAR(20),
  direccion      VARCHAR(255),
  creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE productos (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120)  NOT NULL,
  descripcion   TEXT          NOT NULL DEFAULT '',
  precio        NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
  stock         INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo  INTEGER       NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
  imagen        VARCHAR(500),
  categoria     VARCHAR(60)   NOT NULL DEFAULT 'General',
  activo        BOOLEAN       NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_productos_categoria ON productos (categoria);

CREATE TABLE carrito_items (
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  producto_id  INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad     INTEGER NOT NULL CHECK (cantidad > 0),
  agregado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, producto_id)
);

CREATE TABLE pedidos (
  id                 SERIAL PRIMARY KEY,
  usuario_id         INTEGER       NOT NULL REFERENCES usuarios(id),
  total              NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  estado             VARCHAR(12)   NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'enviado', 'entregado', 'cancelado')),
  direccion_entrega  VARCHAR(255)  NOT NULL,
  fecha              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  actualizado_en     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pedidos_usuario ON pedidos (usuario_id);

CREATE TABLE detalle_pedido (
  pedido_id        INTEGER       NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id      INTEGER       NOT NULL REFERENCES productos(id),
  nombre_producto  VARCHAR(120)  NOT NULL,
  cantidad         INTEGER       NOT NULL CHECK (cantidad > 0),
  precio_unitario  NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
  PRIMARY KEY (pedido_id, producto_id)
);

-- Nunca se guarda el número completo ni el CVV: solo la marca y los últimos 4 dígitos.
CREATE TABLE pagos_simulados (
  id            SERIAL PRIMARY KEY,
  pedido_id     INTEGER       NOT NULL UNIQUE REFERENCES pedidos(id) ON DELETE CASCADE,
  metodo        VARCHAR(20)   NOT NULL CHECK (metodo IN ('tarjeta', 'contra_entrega')),
  marca         VARCHAR(20),
  ultimos4      CHAR(4),
  titular       VARCHAR(100),
  monto         NUMERIC(12,2) NOT NULL,
  -- contra_entrega queda 'pendiente' hasta que el pedido se entrega
  estado        VARCHAR(12)   NOT NULL CHECK (estado IN ('aprobado', 'pendiente', 'rechazado')),
  referencia    VARCHAR(40)   NOT NULL,
  fecha         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
