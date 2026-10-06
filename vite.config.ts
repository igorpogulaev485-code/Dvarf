import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Prod: http://201.34.132.252/  (GitHub Pages — не прод; base=/Dvarf/ только для Pages)
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  plugins: [react()],
  base,
})
