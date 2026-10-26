import { act, renderHook } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { cumpleReglas } from '../components/ReglasPassword.jsx'
import { formatoQ } from '../format.js'
import { usePorPartes } from '../hooks.js'

describe('formato de moneda', () => {
  // Intl separa el símbolo con un espacio no separable; se normaliza para comparar.
  const q = (n) => formatoQ(n).replace(/\s/g, ' ')
  test('usa quetzales con dos decimales', () => {
    expect(q(1234.5)).toBe('Q 1,234.50')
  })
  test('valores vacíos o inválidos se muestran como cero', () => {
    expect(q(undefined)).toBe('Q 0.00')
    expect(q('abc')).toBe('Q 0.00')
  })
})

describe('reglas de contraseña (iguales al backend)', () => {
  test.each([
    ['corta1', false],
    ['soloLetrasLarga', false],
    ['12345678', false],
    ['Segura2026', true],
  ])('%s → %s', (password, esperado) => {
    expect(cumpleReglas(password)).toBe(esperado)
  })
})

describe('usePorPartes', () => {
  const lista = Array.from({ length: 32 }, (_, i) => i)

  test('muestra la lista de 15 en 15', () => {
    const { result } = renderHook(() => usePorPartes(lista))
    expect(result.current.parte).toHaveLength(15)
    expect(result.current.restantes).toBe(17)
    act(() => result.current.verMas())
    expect(result.current.parte).toHaveLength(30)
    act(() => result.current.verMas())
    expect(result.current.parte).toHaveLength(32)
    expect(result.current.restantes).toBe(0)
  })

  test('vuelve al inicio cuando cambia la lista (p. ej. un filtro)', () => {
    const { result, rerender } = renderHook(({ l }) => usePorPartes(l), { initialProps: { l: lista } })
    act(() => result.current.verMas())
    expect(result.current.parte).toHaveLength(30)
    rerender({ l: lista.slice(0, 20) })
    expect(result.current.parte).toHaveLength(15)
    expect(result.current.total).toBe(20)
  })

  test('acepta una lista que todavía no llega', () => {
    const { result } = renderHook(() => usePorPartes(null))
    expect(result.current.parte).toEqual([])
    expect(result.current.restantes).toBe(0)
  })
})
