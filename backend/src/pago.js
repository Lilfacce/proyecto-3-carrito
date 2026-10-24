// Pasarela de pago SIMULADA. No se conecta a ningún banco.
import { randomBytes } from 'node:crypto';

/** Algoritmo de Luhn: valida que el número de tarjeta sea bien formado. */
export function luhnValido(numero) {
  let suma = 0;
  let doble = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let d = Number(numero[i]);
    if (doble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
    doble = !doble;
  }
  return suma % 10 === 0;
}

export function detectarMarca(numero) {
  if (/^4/.test(numero)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(numero)) return 'Mastercard';
  if (/^3[47]/.test(numero)) return 'Amex';
  return 'Otra';
}

/** Valida que la fecha MM/AA no esté vencida. */
export function vencimientoValido(mmaa, hoy = new Date()) {
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(mmaa);
  if (!m) return false;
  const mes = Number(m[1]);
  const anio = 2000 + Number(m[2]);
  // La tarjeta vale hasta el último día del mes indicado.
  return new Date(anio, mes, 1) > hoy;
}

// Tarjeta de prueba que siempre es rechazada (para demostrar el flujo de error).
export const TARJETA_RECHAZADA = '4000000000000002';

/**
 * Procesa un pago simulado. Recibe los datos completos de la tarjeta, pero solo
 * devuelve lo que es seguro guardar: marca y últimos 4 dígitos. El número completo
 * y el CVV nunca salen de esta función ni se escriben en la base de datos ni en logs.
 */
export function procesarPagoTarjeta({ numero, titular, vencimiento, cvv }) {
  const limpio = String(numero).replace(/[\s-]/g, '');
  const errores = [];
  if (!/^\d{13,19}$/.test(limpio) || !luhnValido(limpio)) errores.push('Número de tarjeta inválido');
  if (!vencimientoValido(vencimiento)) errores.push('La tarjeta está vencida o la fecha es inválida');
  if (!/^\d{3,4}$/.test(String(cvv))) errores.push('CVV inválido');
  if (!titular || titular.trim().length < 3) errores.push('Nombre del titular inválido');

  return {
    valido: errores.length === 0,
    errores,
    aprobado: errores.length === 0 && limpio !== TARJETA_RECHAZADA,
    marca: detectarMarca(limpio),
    ultimos4: limpio.slice(-4),
    titular: titular?.trim(),
    referencia: 'SIM-' + randomBytes(6).toString('hex').toUpperCase(),
  };
}
