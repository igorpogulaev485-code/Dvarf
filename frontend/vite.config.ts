import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function spaBypass(req: { headers: { accept?: string } }) {
  if (req.headers.accept?.includes('text/html')) {
    return '/index.html'
  }
}

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/') ||
              id.includes('/react-router')
            ) {
              return 'react-vendor'
            }
            return 'vendor'
          }
          if (id.includes('/shared/dnd/data/')) {
            return 'class-feature-data'
          }
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/catalog': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
      '/lobbies': {
        target: 'http://127.0.0.1:8000',
        bypass: spaBypass,
      },
      '/sessions': {
        target: 'http://127.0.0.1:8000',
        bypass: spaBypass,
      },
      '/settings': {
        target: 'http://127.0.0.1:8000',
        bypass: spaBypass,
      },
      '/characters': {
        target: 'http://127.0.0.1:8000',
        bypass: spaBypass,
      },
    },
  },
})
