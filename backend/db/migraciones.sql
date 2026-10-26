-- Cambios de esquema para bases creadas con una versión anterior de schema.sql.
-- No borra datos y se puede ejecutar varias veces (npm run db:migrar).

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_cambiado_en TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS recuperaciones_password (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER     NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash  CHAR(64)    NOT NULL UNIQUE,
  expira_en   TIMESTAMPTZ NOT NULL,
  usado_en    TIMESTAMPTZ,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recuperaciones_usuario ON recuperaciones_password (usuario_id);
