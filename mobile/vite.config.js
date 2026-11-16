import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@citoyen': fileURLToPath(new URL('./citizen-app/lib', import.meta.url)),
      '@collecteur': fileURLToPath(new URL('./collector-app/lib', import.meta.url)),
    },
  },
})
