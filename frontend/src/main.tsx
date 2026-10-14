import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startSessionKeepAlive } from './shared/api/client'
import './index.css'
import App from './App.tsx'

startSessionKeepAlive()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
