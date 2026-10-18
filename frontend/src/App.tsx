import { Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { AuthDebugPage } from './pages/AuthDebugPage'
import { CharactersPage } from './pages/CharactersPage'
import { RequireAuth } from './shared/auth/RequireAuth'
import { getAccessToken } from './shared/api/client'
import { safeNextPath } from './shared/auth/nextPath'
import {
  LazyCabinetPage,
  LazyCharacterDetailPage,
  LazyClassicSheetPage,
  LazyConfirmEmailPage,
  LazyCreateCharacterPage,
  LazyJoinLobbyPage,
  LazyLobbiesPage,
  LazyLobbyDetailPage,
  LazyResetPasswordPage,
  LazyRouteErrorBoundary,
  LazySessionDetailPage,
  LazySettingDetailPage,
  LazyVerifyEmailPage,
} from './shared/lazy/routes'
import { AccountAppearanceSync } from './shared/theme/AccountAppearanceSync'

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

function LazyPage({ children }: { children: ReactNode }) {
  return (
    <LazyRouteErrorBoundary>
      <Suspense
        fallback={
          <main className="page page--app">
            <p className="ui-text ui-text--muted">Загрузка экрана…</p>
          </main>
        }
      >
        {children}
      </Suspense>
    </LazyRouteErrorBoundary>
  )
}

function AuthLazy({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <LazyPage>{children}</LazyPage>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AccountAppearanceSync />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route
          path="/reset-password"
          element={
            <LazyPage>
              <LazyResetPasswordPage />
            </LazyPage>
          }
        />
        <Route
          path="/confirm-email"
          element={
            <LazyPage>
              <LazyConfirmEmailPage />
            </LazyPage>
          }
        />
        <Route
          path="/verify-email"
          element={
            <LazyPage>
              <LazyVerifyEmailPage />
            </LazyPage>
          }
        />
        <Route
          path="/join"
          element={
            <LazyPage>
              <LazyJoinLobbyPage />
            </LazyPage>
          }
        />
        <Route
          path="/join/:code"
          element={
            <LazyPage>
              <LazyJoinLobbyPage />
            </LazyPage>
          }
        />
        <Route
          path="/characters"
          element={
            <RequireAuth>
              <CharactersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/characters/create"
          element={
            <AuthLazy>
              <LazyCreateCharacterPage />
            </AuthLazy>
          }
        />
        <Route
          path="/characters/create/:characterId"
          element={
            <AuthLazy>
              <LazyCreateCharacterPage />
            </AuthLazy>
          }
        />
        {/* classic BEFORE :characterId — explicit path must win over the interactive sheet */}
        <Route
          path="/characters/:characterId/classic"
          element={
            <AuthLazy>
              <LazyClassicSheetPage />
            </AuthLazy>
          }
        />
        <Route
          path="/characters/:characterId"
          element={
            <AuthLazy>
              <LazyCharacterDetailPage />
            </AuthLazy>
          }
        />
        <Route
          path="/lobbies"
          element={
            <AuthLazy>
              <LazyLobbiesPage />
            </AuthLazy>
          }
        />
        <Route
          path="/lobbies/:lobbyId"
          element={
            <AuthLazy>
              <LazyLobbyDetailPage />
            </AuthLazy>
          }
        />
        <Route
          path="/settings/:settingId"
          element={
            <AuthLazy>
              <LazySettingDetailPage />
            </AuthLazy>
          }
        />
        <Route
          path="/sessions/:sessionId"
          element={
            <AuthLazy>
              <LazySessionDetailPage />
            </AuthLazy>
          }
        />
        <Route
          path="/cabinet"
          element={
            <AuthLazy>
              <LazyCabinetPage />
            </AuthLazy>
          }
        />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
