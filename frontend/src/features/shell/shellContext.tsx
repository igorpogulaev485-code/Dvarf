import { createContext, useContext } from 'react'

export type ShellAuthMode = 'login' | 'register' | 'forgot'

type ShellAuthApi = {
  openAuth: (mode?: ShellAuthMode, returnTo?: string) => void
}

/** Survives the OAuth round-trip back to /login. Explicit ?next= still wins. */
export const SHELL_AUTH_RETURN_KEY = 'dvarf.shellAuthReturn'

const SHELL_STAY = ['/characters', '/lobbies', '/site', '/cabinet']

export function shellStayPath(pathname: string): string | null {
  return SHELL_STAY.includes(pathname) ? pathname : null
}

export function readShellAuthReturn(): string | null {
  try {
    const value = sessionStorage.getItem(SHELL_AUTH_RETURN_KEY)
    return value && value.startsWith('/') && !value.startsWith('//') ? value : null
  } catch {
    return null
  }
}

export function writeShellAuthReturn(path: string | null): void {
  try {
    if (!path) sessionStorage.removeItem(SHELL_AUTH_RETURN_KEY)
    else sessionStorage.setItem(SHELL_AUTH_RETURN_KEY, path)
  } catch {
    /* private mode */
  }
}

const ShellAuthContext = createContext<ShellAuthApi | null>(null)

export const ShellAuthProvider = ShellAuthContext.Provider

export function useShellAuth(): ShellAuthApi {
  const api = useContext(ShellAuthContext)
  if (!api) {
    throw new Error('useShellAuth must be used inside AppShell')
  }
  return api
}
