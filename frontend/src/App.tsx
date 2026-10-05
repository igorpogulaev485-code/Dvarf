import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthDebugPage } from './pages/AuthDebugPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthDebugPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
