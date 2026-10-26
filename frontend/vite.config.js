import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // El frontend y la API comparten origen: la cookie de sesión funciona sin CORS.
    proxy: { '/api': 'http://localhost:3000', '/uploads': 'http://localhost:3000' },
  },
})
