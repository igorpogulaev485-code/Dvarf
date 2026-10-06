import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/catalog': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
      '/uploads': 'http://127.0.0.1:8000',
      '/characters': {
        target: 'http://127.0.0.1:8000',
        bypass(req) {
          // SPA routes like /characters/:id must serve index.html, not the API.
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html'
          }
        },
      },
    },
  },
})
