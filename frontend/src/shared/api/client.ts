export type ApiError = {
  detail?: string | unknown[]
  code?: string
}

export class ApiRequestError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

const ACCESS_TOKEN_KEY = 'dvarf.access_token'
const REFRESH_TOKEN_KEY = 'dvarf.refresh_token'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  // Avoid holding catalog lists across accounts on shared devices.
  void import('./catalog')
    .then((mod) => mod.clearCatalogCache())
    .catch(() => undefined)
}

let refreshInFlight: Promise<boolean> | null = null

/** Fail fast — a stuck refresh must not leave the UI on «Загрузка…» forever. */
const REFRESH_TIMEOUT_MS = 12_000
/** Refresh access a few minutes before JWT exp so saves mid-game do not 401. */
const ACCESS_REFRESH_SKEW_MS = 5 * 60 * 1000
const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000

function readJwtExpMs(token: string | null): number | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const normalized = parts[1]!.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as { exp?: unknown }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

function accessNeedsRefresh(token: string | null = getAccessToken()): boolean {
  const expMs = readJwtExpMs(token)
  if (expMs == null) return Boolean(getRefreshToken())
  return expMs - Date.now() <= ACCESS_REFRESH_SKEW_MS
}

async function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      return false
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS)
    try {
      const response = await fetch('/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Dvarf-Client': 'app',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: controller.signal,
      })
      if (response.status === 401 || response.status === 403) {
        clearTokens()
        return false
      }
      if (!response.ok) {
        // Transient API flap / session_busy — keep tokens; caller may retry.
        return false
      }
      const data = (await response.json()) as {
        access_token: string
        refresh_token: string
      }
      setTokens(data.access_token, data.refresh_token)
      return true
    } catch {
      // Network / abort: do not wipe a still-valid login for a blip.
      return false
    } finally {
      window.clearTimeout(timer)
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

/** Extend the login before a long save / when the tab returns to focus. */
export async function ensureSession(): Promise<boolean> {
  if (!getRefreshToken()) return false
  if (!accessNeedsRefresh()) return true
  const ok = await tryRefreshAccessToken()
  if (ok) return true
  // Another tab may have refreshed while we waited.
  return !accessNeedsRefresh(getAccessToken())
}

let keepAliveStarted = false

/** Call once from the app shell — keeps 8h table sessions from expiring quietly. */
export function startSessionKeepAlive(): void {
  if (keepAliveStarted || typeof window === 'undefined') return
  keepAliveStarted = true

  const tick = () => {
    if (!getRefreshToken()) return
    void ensureSession()
  }

  window.setInterval(tick, KEEP_ALIVE_INTERVAL_MS)
  window.addEventListener('focus', tick)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick()
  })
  window.addEventListener('online', tick)
  tick()
}

function errorMessage(data: ApiError): string {
  const detail = data.detail
  if (typeof detail === 'string') {
    return detail
  }
  if (Array.isArray(detail)) {
    return 'Проверьте правильность заполнения полей'
  }
  return 'Не удалось выполнить запрос'
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  if (
    !retried &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/register') &&
    !path.startsWith('/auth/refresh')
  ) {
    await ensureSession()
  }

  const headers = new Headers(options.headers)
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (!headers.has('Content-Type') && options.body && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }
  // Force JSON Accept (overwrite) so nginx never mistakes an API call for SPA nav.
  headers.set('Accept', 'application/json')
  headers.set('X-Dvarf-Client', 'app')

  const accessToken = getAccessToken()
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  let response: Response
  try {
    response = await fetch(path, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiRequestError(
      'Нет связи с сервером — проверьте сеть и повторите',
      0,
      'network_error',
    )
  }

  if (
    response.status === 401 &&
    !retried &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/register') &&
    !path.startsWith('/auth/refresh') &&
    !path.startsWith('/auth/forgot-password') &&
    !path.startsWith('/auth/reset-password') &&
    !path.startsWith('/auth/verify-email') &&
    !path.startsWith('/auth/resend-verification') &&
    !path.startsWith('/auth/oauth') &&
    !path.startsWith('/auth/me/email/confirm')
  ) {
    const refreshed = await tryRefreshAccessToken()
    if (refreshed) {
      return apiRequest<T>(path, options, true)
    }
    // Another tab may have written fresh tokens during the failed refresh.
    if (!accessNeedsRefresh(getAccessToken()) && getAccessToken()) {
      return apiRequest<T>(path, options, true)
    }
    // Expired access without a usable refresh — drop the stale access token
    // so LoginRoute does not bounce back into a RequireAuth dead-end.
    clearTokens()
    throw new ApiRequestError(
      'Сессия истекла — войдите снова',
      401,
      'unauthorized',
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  // API container flap (deploy/restart) → nginx 502/503/504. One short retry
  // covers autosave races; otherwise show a clear temporary-unavailable message.
  if (
    !retried &&
    (response.status === 502 || response.status === 503 || response.status === 504)
  ) {
    await new Promise((resolve) => window.setTimeout(resolve, 700))
    return apiRequest<T>(path, options, true)
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    throw new ApiRequestError(
      response.status >= 500
        ? 'Сервер временно недоступен — подождите пару секунд и повторите'
        : 'Сервер вернул страницу вместо API. Обновите страницу (Ctrl+Shift+R) или войдите снова.',
      response.status || 502,
      response.status >= 500 ? 'api_unavailable' : 'html_instead_of_json',
    )
  }

  const data = (await response.json().catch(() => ({}))) as ApiError & T

  if (!response.ok) {
    throw new ApiRequestError(errorMessage(data), response.status, data.code)
  }

  return data
}
