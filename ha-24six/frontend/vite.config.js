import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    minify: false,
    terserOptions: undefined,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8484'
    }
  }
})
