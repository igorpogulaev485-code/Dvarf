import {
  Component,
  lazy,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { Button, Text } from '../../ui'

/** Hung module fetch used to leave Suspense on «Загрузка экрана…» forever. */
const CHUNK_TIMEOUT_MS = 12_000
const CHUNK_RETRIES = 1

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('chunk_timeout'))
    }, ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        window.clearTimeout(timer)
        reject(err)
      },
    )
  })
}

function isStaleChunkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  if (err.message === 'chunk_timeout') return false
  return /Loading chunk|Failed to fetch|dynamically imported module|ChunkLoadError/i.test(
    err.message + err.name,
  )
}

export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown
    for (let attempt = 0; attempt <= CHUNK_RETRIES; attempt++) {
      try {
        const mod = await withTimeout(factory(), CHUNK_TIMEOUT_MS)
        try {
          sessionStorage.removeItem('dvarf.chunk_reload')
        } catch {
          /* private mode */
        }
        return mod
      } catch (err) {
        lastError = err
        if (isStaleChunkError(err)) {
          try {
            if (!sessionStorage.getItem('dvarf.chunk_reload')) {
              sessionStorage.setItem('dvarf.chunk_reload', '1')
              window.location.reload()
              return await new Promise<{ default: T }>(() => undefined)
            }
          } catch {
            /* ignore storage */
          }
        }
        if (attempt < CHUNK_RETRIES) {
          await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)))
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('chunk_load_failed')
  })
}

/** Shared factories so list prefetch hits the same Vite chunks as routes. */
export const loadCharacterDetailPage = () =>
  import('../../pages/CharacterDetailPage').then((m) => ({ default: m.CharacterDetailPage }))

export const loadCreateCharacterPage = () =>
  import('../../pages/CreateCharacterPage').then((m) => ({ default: m.CreateCharacterPage }))

export const loadClassicSheetPage = () =>
  import('../../pages/ClassicSheetPage').then((m) => ({ default: m.ClassicSheetPage }))

export const loadCabinetPage = () =>
  import('../../pages/CabinetPage').then((m) => ({ default: m.CabinetPage }))

export const loadConfirmEmailPage = () =>
  import('../../pages/ConfirmEmailPage').then((m) => ({ default: m.ConfirmEmailPage }))

export const loadJoinLobbyPage = () =>
  import('../../pages/JoinLobbyPage').then((m) => ({ default: m.JoinLobbyPage }))

export const loadLobbiesPage = () =>
  import('../../pages/LobbiesPage').then((m) => ({ default: m.LobbiesPage }))

export const loadLobbyDetailPage = () =>
  import('../../pages/LobbyDetailPage').then((m) => ({ default: m.LobbyDetailPage }))

export const loadResetPasswordPage = () =>
  import('../../pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))

export const loadSessionDetailPage = () =>
  import('../../pages/SessionDetailPage').then((m) => ({ default: m.SessionDetailPage }))

export const loadSettingDetailPage = () =>
  import('../../pages/SettingDetailPage').then((m) => ({ default: m.SettingDetailPage }))

export const loadVerifyEmailPage = () =>
  import('../../pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage }))

export const LazyCabinetPage = lazyWithRetry(loadCabinetPage)
export const LazyCharacterDetailPage = lazyWithRetry(loadCharacterDetailPage)
export const LazyCreateCharacterPage = lazyWithRetry(loadCreateCharacterPage)
export const LazyClassicSheetPage = lazyWithRetry(loadClassicSheetPage)
export const LazyConfirmEmailPage = lazyWithRetry(loadConfirmEmailPage)
export const LazyJoinLobbyPage = lazyWithRetry(loadJoinLobbyPage)
export const LazyLobbiesPage = lazyWithRetry(loadLobbiesPage)
export const LazyLobbyDetailPage = lazyWithRetry(loadLobbyDetailPage)
export const LazyResetPasswordPage = lazyWithRetry(loadResetPasswordPage)
export const LazySessionDetailPage = lazyWithRetry(loadSessionDetailPage)
export const LazySettingDetailPage = lazyWithRetry(loadSettingDetailPage)
export const LazyVerifyEmailPage = lazyWithRetry(loadVerifyEmailPage)

/** Warm the sheet chunk while the user still reads the list. */
export function prefetchSheetRoutes(): void {
  void loadCharacterDetailPage().catch(() => undefined)
  void loadCreateCharacterPage().catch(() => undefined)
}

type BoundaryState = { error: Error | null }

/** Turns a failed lazy() into a recoverable UI instead of a blank Suspense forever. */
export class LazyRouteErrorBoundary extends Component<
  { children: ReactNode },
  BoundaryState
> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }
    const timedOut = this.state.error.message === 'chunk_timeout'
    return (
      <main className="page page--app">
        <Text as="p">
          {timedOut
            ? 'Экран загружается слишком долго — проверьте сеть и обновите страницу.'
            : 'Не удалось загрузить экран. Часто помогает обновление после деплоя.'}
        </Text>
        <p className="ui-text ui-text--muted">
          <Button variant="primary" onClick={() => window.location.reload()}>
            Обновить страницу
          </Button>
          {' · '}
          <Link to="/characters">К персонажам</Link>
        </p>
      </main>
    )
  }
}
