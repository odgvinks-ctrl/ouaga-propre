import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const versAdmin = { '/admin': { target: 'http://localhost:5173', ws: true } }

export default defineConfig({
  plugins: [react()],
  server: { proxy: versAdmin },
  preview: { proxy: versAdmin },
  resolve: {
    alias: {
      '@citoyen': fileURLToPath(new URL('./citizen-app/lib', import.meta.url)),
      '@collecteur': fileURLToPath(new URL('./collector-app/lib', import.meta.url)),
    },
  },
})
