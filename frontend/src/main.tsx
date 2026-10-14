import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startSessionKeepAlive } from './shared/api/client'
import './index.css'
import App from './App.tsx'

const rootEl = document.getElementById('root')
const bootFallback = document.getElementById('boot-fallback')

try {
  startSessionKeepAlive()
  if (!rootEl) throw new Error('root missing')
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  // SPA mounted — hide the classic-script boot hint if it already appeared.
  bootFallback?.removeAttribute('data-show')
} catch (err) {
  console.error(err)
  if (bootFallback) {
    bootFallback.setAttribute('data-show', '1')
  }
}
