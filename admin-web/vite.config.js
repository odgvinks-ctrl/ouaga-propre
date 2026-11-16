import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  resolve: {
    alias: {
      '@donnees': fileURLToPath(new URL('../mobile/citizen-app/lib/services', import.meta.url)),
      '@modeles': fileURLToPath(new URL('../mobile/citizen-app/lib/models', import.meta.url)),
    },
  },
})
