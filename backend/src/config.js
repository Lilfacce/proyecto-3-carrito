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
};
