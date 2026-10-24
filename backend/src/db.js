import pg from 'pg';
import { config } from './config.js';

// NUMERIC llega como string; lo convertimos a número para la API.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));

// La zona horaria se fija para que "hoy" y las ventas por día coincidan con la hora local.
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  options: `-c timezone=${config.timezone}`,
});

export const query = (text, params) => pool.query(text, params);

/** Ejecuta `fn` dentro de una transacción; hace ROLLBACK si lanza un error. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
