import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { AuthDebugPage } from './pages/AuthDebugPage'
import { CabinetPage } from './pages/CabinetPage'
import { CharacterDetailPage } from './pages/CharacterDetailPage'
import { CharactersPage } from './pages/CharactersPage'
import { ClassicSheetPage } from './pages/ClassicSheetPage'
import { ConfirmEmailPage } from './pages/ConfirmEmailPage'
import { JoinLobbyPage } from './pages/JoinLobbyPage'
import { LobbiesPage } from './pages/LobbiesPage'
import { LobbyDetailPage } from './pages/LobbyDetailPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SessionDetailPage } from './pages/SessionDetailPage'
import { SettingDetailPage } from './pages/SettingDetailPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { RequireAuth } from './shared/auth/RequireAuth'
import { getAccessToken } from './shared/api/client'
import { safeNextPath } from './shared/auth/nextPath'

function HomeRedirect() {
  return <Navigate to={getAccessToken() ? '/characters' : '/login'} replace />
}

function LoginRoute() {
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))
  if (getAccessToken()) {
    return <Navigate to={next ?? '/characters'} replace />
  }
  return <AuthDebugPage nextPath={next} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/join" element={<JoinLobbyPage />} />
        <Route path="/join/:code" element={<JoinLobbyPage />} />
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
          path="/characters/:characterId/classic"
          element={
            <RequireAuth>
              <ClassicSheetPage />
            </RequireAuth>
          }
        />
        <Route
          path="/lobbies"
          element={
            <RequireAuth>
              <LobbiesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/lobbies/:lobbyId"
          element={
            <RequireAuth>
              <LobbyDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/:settingId"
          element={
            <RequireAuth>
              <SettingDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/sessions/:sessionId"
          element={
            <RequireAuth>
              <SessionDetailPage />
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
