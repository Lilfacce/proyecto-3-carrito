import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => cleanup())

// jsdom no implementa estas APIs del navegador que usa la interfaz.
window.scrollTo = vi.fn()
window.matchMedia ??= (query) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
})
Element.prototype.animate ??= () => ({ cancel() {}, finished: Promise.resolve() })
