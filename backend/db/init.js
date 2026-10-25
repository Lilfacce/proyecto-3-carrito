// Crea (o recrea) las tablas a partir de schema.sql.
// ¡DESTRUCTIVO! schema.sql borra todas las tablas antes de crearlas: úsalo solo en desarrollo.
import { readFile } from 'node:fs/promises';
import { config } from '../src/config.js';
import { pool } from '../src/db.js';

if (config.isProd) {
  console.error('db:init / db:reset borran todos los datos. No se ejecutan con NODE_ENV=production.');
  process.exit(1);
}

const base = new URL(config.databaseUrl).pathname.slice(1);
console.log(`Recreando el esquema en la base "${base}" (se borran los datos existentes)...`);
const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
await pool.query(sql);
console.log('Esquema creado.');
await pool.end();
