import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthDebugPage } from './pages/AuthDebugPage'
import { CabinetPage } from './pages/CabinetPage'
import { CharacterDetailPage } from './pages/CharacterDetailPage'
import { CharactersPage } from './pages/CharactersPage'
import { ConfirmEmailPage } from './pages/ConfirmEmailPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { RequireAuth } from './shared/auth/RequireAuth'
import { getAccessToken } from './shared/api/client'

function HomeRedirect() {
  return <Navigate to={getAccessToken() ? '/characters' : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<AuthDebugPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/characters"
          element={
            <RequireAuth>
              <CharactersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/characters/:characterId"
          element={
            <RequireAuth>
              <CharacterDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/cabinet"
          element={
            <RequireAuth>
              <CabinetPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
