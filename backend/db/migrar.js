// Aplica db/migraciones.sql sin borrar datos (a diferencia de db:init).
import { readFile } from 'node:fs/promises';
import { config } from '../src/config.js';
import { pool } from '../src/db.js';

const base = new URL(config.databaseUrl).pathname.slice(1);
console.log(`Aplicando migraciones en la base "${base}"...`);
const sql = await readFile(new URL('./migraciones.sql', import.meta.url), 'utf8');
await pool.query(sql);
console.log('Migraciones aplicadas.');
await pool.end();
