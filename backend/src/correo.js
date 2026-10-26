import { config } from './config.js';

/**
 * Envío de correo SIMULADO: el proyecto no usa un servidor de correo, así que el mensaje se
 * muestra en la consola del backend. Para usar uno real basta con reemplazar esta función
 * (por ejemplo con nodemailer) sin tocar las rutas.
 */
/** En las pruebas los correos se guardan aquí en lugar de imprimirse. */
export const buzonPruebas = [];

export async function enviarCorreo({ para, asunto, texto }) {
  if (config.env === 'test') {
    buzonPruebas.push({ para, asunto, texto });
    return;
  }
  const linea = '─'.repeat(64);
  console.log(`
${linea}
📧 Correo simulado
Para:   ${para}
Asunto: ${asunto}

${texto}
${linea}
`);
}
