import { useState } from 'react'
import type { User } from '../shared/api/auth'
import { AuthSessionPanel, EmailAuthForm, OAuthButtons } from '../features/auth'
import { Panel, Stack, Text } from '../ui'

export function AuthDebugPage() {
  const [user, setUser] = useState<User | null>(null)
  const [oauthMessage, setOauthMessage] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('register')

  return (
    <main className="page page--auth-debug">
      <Stack gap={20}>
        <Stack gap={6}>
          <Text as="h1">Dvarf Auth Debug</Text>
          <Text tone="muted">
            Component-based debug screen for email auth and OAuth stubs.
          </Text>
        </Stack>

        <Panel title="Session">
          <AuthSessionPanel user={user} onUserChange={setUser} />
        </Panel>

        <Panel title={mode === 'register' ? 'Register' : 'Login'}>
          <Stack gap={12}>
            <div className="mode-switch">
              <button
                type="button"
                className={mode === 'register' ? 'is-active' : ''}
                onClick={() => setMode('register')}
              >
                Register
              </button>
              <button
                type="button"
                className={mode === 'login' ? 'is-active' : ''}
                onClick={() => setMode('login')}
              >
                Login
              </button>
            </div>
            <EmailAuthForm mode={mode} onSuccess={setUser} />
          </Stack>
        </Panel>

        <Panel title="OAuth">
          <Stack gap={10}>
            <OAuthButtons onMessage={setOauthMessage} />
            {oauthMessage ? <Text tone="muted">{oauthMessage}</Text> : null}
          </Stack>
        </Panel>
      </Stack>
    </main>
  )
}
