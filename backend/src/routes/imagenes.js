import { Router, raw } from 'express';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { requireAdmin } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';

/** Carpeta donde se guardan las fotos de productos que sube el administrador. */
export const CARPETA_IMAGENES = fileURLToPath(new URL('../../uploads', import.meta.url));

export const LIMITE_BYTES = 2 * 1024 * 1024;

// El tipo se decide por la firma del archivo (sus primeros bytes), no por el encabezado
// Content-Type, que el cliente puede falsear.
const FIRMAS = [
  { ext: 'png', ok: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'jpg', ok: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'webp', ok: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
];

/** Ruta pública de una imagen subida, p. ej. /uploads/3f9c…e1.webp */
export const RUTA_IMAGEN = /^\/uploads\/[a-f0-9]{32}\.(png|jpg|webp)$/;

const router = Router();

router.post(
  '/',
  requireAdmin,
  raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: LIMITE_BYTES }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new HttpError(400, 'Envía una imagen PNG, JPG o WebP');
    }
    const tipo = FIRMAS.find((f) => f.ok(req.body));
    if (!tipo) throw new HttpError(400, 'El archivo no es una imagen PNG, JPG o WebP válida');

    const nombre = `${randomBytes(16).toString('hex')}.${tipo.ext}`;
    await mkdir(CARPETA_IMAGENES, { recursive: true });
    await writeFile(new URL(`../../uploads/${nombre}`, import.meta.url), req.body);
    res.status(201).json({ url: `/uploads/${nombre}` });
  },
);

export default router;
