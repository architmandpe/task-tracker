import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxies API calls to the backend so the browser sees everything as same-origin,
// which is required for the httpOnly auth cookie to auto-attach.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/tasks': 'http://localhost:8000',
      '/assistant': 'http://localhost:8000',
    },
  },
})
