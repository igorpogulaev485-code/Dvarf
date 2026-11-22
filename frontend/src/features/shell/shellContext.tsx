import { createContext, useContext } from 'react'

export type ShellAuthMode = 'login' | 'register' | 'forgot'

type ShellAuthApi = {
  openAuth: (mode?: ShellAuthMode) => void
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
