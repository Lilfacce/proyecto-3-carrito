import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const env = process.env.NODE_ENV ?? 'development';

if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL. Copia backend/.env.example a backend/.env y complétalo.');
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET debe existir y tener al menos 32 caracteres.');
}

export const config = {
  env,
  isProd: env === 'production',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
  timezone: process.env.DB_TIMEZONE ?? 'America/Guatemala',
  // Dirección pública del frontend, para armar los enlaces de los correos (no se toma del
  // encabezado Host, que un atacante podría falsear).
  urlPublica: (process.env.PUBLIC_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  // Orígenes extra que pueden hacer POST/PUT/PATCH/DELETE (el del propio servidor siempre se acepta).
  // En desarrollo se incluye el servidor de Vite.
  origenesPermitidos: (process.env.ALLOWED_ORIGINS ?? (env === 'production' ? '' : 'http://localhost:5173'))
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};
