import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // base: './' ensures all asset paths are relative, required for HA Ingress
  // which serves the app under a dynamic path like /api/hassio_ingress/<token>/
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8484',
      '/ws': { target: 'ws://localhost:8484', ws: true }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})
