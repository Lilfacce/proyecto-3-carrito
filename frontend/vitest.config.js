import { defineConfig } from 'vitest/config'

// Configuración separada de vite.config.js: las pruebas no necesitan Tailwind ni el proxy.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
  },
})
