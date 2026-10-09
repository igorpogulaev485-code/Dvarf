import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { AuthDebugPage } from './pages/AuthDebugPage'
import { CharactersPage } from './pages/CharactersPage'
import { RequireAuth } from './shared/auth/RequireAuth'
import { getAccessToken } from './shared/api/client'
import { safeNextPath } from './shared/auth/nextPath'

const CabinetPage = lazy(() =>
  import('./pages/CabinetPage').then((m) => ({ default: m.CabinetPage })),
)
const CharacterDetailPage = lazy(() =>
  import('./pages/CharacterDetailPage').then((m) => ({ default: m.CharacterDetailPage })),
)
const CreateCharacterPage = lazy(() =>
  import('./pages/CreateCharacterPage').then((m) => ({ default: m.CreateCharacterPage })),
)
const ClassicSheetPage = lazy(() =>
  import('./pages/ClassicSheetPage').then((m) => ({ default: m.ClassicSheetPage })),
)
const ConfirmEmailPage = lazy(() =>
  import('./pages/ConfirmEmailPage').then((m) => ({ default: m.ConfirmEmailPage })),
)
const JoinLobbyPage = lazy(() =>
  import('./pages/JoinLobbyPage').then((m) => ({ default: m.JoinLobbyPage })),
)
const LobbiesPage = lazy(() =>
  import('./pages/LobbiesPage').then((m) => ({ default: m.LobbiesPage })),
)
const LobbyDetailPage = lazy(() =>
  import('./pages/LobbyDetailPage').then((m) => ({ default: m.LobbyDetailPage })),
)
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
const SessionDetailPage = lazy(() =>
  import('./pages/SessionDetailPage').then((m) => ({ default: m.SessionDetailPage })),
)
const SettingDetailPage = lazy(() =>
  import('./pages/SettingDetailPage').then((m) => ({ default: m.SettingDetailPage })),
)
const VerifyEmailPage = lazy(() =>
  import('./pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })),
)

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
    <Suspense
      fallback={
        <main className="page page--app">
          <p className="ui-text ui-text--muted">Загрузка экрана…</p>
        </main>
      }
    >
      {children}
    </Suspense>
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
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route
          path="/reset-password"
          element={
            <LazyPage>
              <ResetPasswordPage />
            </LazyPage>
          }
        />
        <Route
          path="/confirm-email"
          element={
            <LazyPage>
              <ConfirmEmailPage />
            </LazyPage>
          }
        />
        <Route
          path="/verify-email"
          element={
            <LazyPage>
              <VerifyEmailPage />
            </LazyPage>
          }
        />
        <Route
          path="/join"
          element={
            <LazyPage>
              <JoinLobbyPage />
            </LazyPage>
          }
        />
        <Route
          path="/join/:code"
          element={
            <LazyPage>
              <JoinLobbyPage />
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
              <CreateCharacterPage />
            </AuthLazy>
          }
        />
        <Route
          path="/characters/create/:characterId"
          element={
            <AuthLazy>
              <CreateCharacterPage />
            </AuthLazy>
          }
        />
        <Route
          path="/characters/:characterId"
          element={
            <AuthLazy>
              <CharacterDetailPage />
            </AuthLazy>
          }
        />
        <Route
          path="/characters/:characterId/classic"
          element={
            <AuthLazy>
              <ClassicSheetPage />
            </AuthLazy>
          }
        />
        <Route
          path="/lobbies"
          element={
            <AuthLazy>
              <LobbiesPage />
            </AuthLazy>
          }
        />
        <Route
          path="/lobbies/:lobbyId"
          element={
            <AuthLazy>
              <LobbyDetailPage />
            </AuthLazy>
          }
        />
        <Route
          path="/settings/:settingId"
          element={
            <AuthLazy>
              <SettingDetailPage />
            </AuthLazy>
          }
        />
        <Route
          path="/sessions/:sessionId"
          element={
            <AuthLazy>
              <SessionDetailPage />
            </AuthLazy>
          }
        />
        <Route
          path="/cabinet"
          element={
            <AuthLazy>
              <CabinetPage />
            </AuthLazy>
          }
        />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
