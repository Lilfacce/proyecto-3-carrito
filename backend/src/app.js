import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import productosRoutes from './routes/productos.js';
import carritoRoutes from './routes/carrito.js';
import pedidosRoutes from './routes/pedidos.js';
import adminRoutes from './routes/admin.js';
import { errorHandler, notFound } from './middleware/errors.js';

export function crearApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { 'img-src': ["'self'", 'data:', 'https:'] },
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/salud', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/productos', productosRoutes);
  app.use('/api/carrito', carritoRoutes);
  app.use('/api/pedidos', pedidosRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', notFound);

  // En producción el mismo servidor entrega el frontend compilado (frontend/dist).
  const dist = fileURLToPath(new URL('../../frontend/dist', import.meta.url));
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*ruta}', (req, res) => res.sendFile('index.html', { root: dist }));
  }

  app.use(errorHandler);
  return app;
}
