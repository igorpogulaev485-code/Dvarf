import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages: https://igorpogulaev485-code.github.io/Dvarf/
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  plugins: [react()],
  base,
})
