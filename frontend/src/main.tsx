import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { bootstrapAccountAppearance } from './shared/theme/accountAppearance'

// Apply cached theme before first paint of React — avoids «Листва» flash after deploy.
bootstrapAccountAppearance()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
