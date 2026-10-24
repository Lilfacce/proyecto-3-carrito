import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectarMarca, luhnValido, procesarPagoTarjeta, vencimientoValido } from '../src/pago.js';

test('Luhn acepta tarjetas válidas y rechaza inválidas', () => {
  assert.equal(luhnValido('4242424242424242'), true);
  assert.equal(luhnValido('5555555555554444'), true);
  assert.equal(luhnValido('4242424242424241'), false);
});

test('detecta la marca de la tarjeta', () => {
  assert.equal(detectarMarca('4242424242424242'), 'Visa');
  assert.equal(detectarMarca('5555555555554444'), 'Mastercard');
  assert.equal(detectarMarca('378282246310005'), 'Amex');
});

test('valida la fecha de vencimiento', () => {
  const hoy = new Date(2026, 9, 23); // 23 oct 2026
  assert.equal(vencimientoValido('10/26', hoy), true);
  assert.equal(vencimientoValido('09/26', hoy), false);
  assert.equal(vencimientoValido('13/30', hoy), false);
  assert.equal(vencimientoValido('1/30', hoy), false);
});

test('el resultado del pago solo expone los últimos 4 dígitos', () => {
  const r = procesarPagoTarjeta({
    numero: '4242 4242 4242 4242',
    titular: 'Ana López',
    vencimiento: '12/30',
    cvv: '123',
  });
  assert.equal(r.aprobado, true);
  assert.equal(r.ultimos4, '4242');
  const json = JSON.stringify(r);
  assert.ok(!json.includes('4242424242424242'));
  assert.ok(!json.includes('123"'));
});

test('la tarjeta de prueba 4000000000000002 es rechazada', () => {
  const r = procesarPagoTarjeta({
    numero: '4000000000000002',
    titular: 'Ana López',
    vencimiento: '12/30',
    cvv: '123',
  });
  assert.equal(r.valido, true);
  assert.equal(r.aprobado, false);
});
