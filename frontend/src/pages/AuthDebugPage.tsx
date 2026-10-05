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
          <Text as="h1">Dvarf — отладка входа</Text>
          <Text tone="muted">
            Экран из компонентов: вход по email и заглушки OAuth.
          </Text>
        </Stack>

        <Panel title="Сессия">
          <AuthSessionPanel user={user} onUserChange={setUser} />
        </Panel>

        <Panel title={mode === 'register' ? 'Регистрация' : 'Вход'}>
          <Stack gap={12}>
            <div className="mode-switch">
              <button
                type="button"
                className={mode === 'register' ? 'is-active' : ''}
                onClick={() => setMode('register')}
              >
                Регистрация
              </button>
              <button
                type="button"
                className={mode === 'login' ? 'is-active' : ''}
                onClick={() => setMode('login')}
              >
                Вход
              </button>
            </div>
            <EmailAuthForm mode={mode} onSuccess={setUser} />
          </Stack>
        </Panel>

        <Panel title="Вход через сервисы">
          <Stack gap={10}>
            <OAuthButtons onMessage={setOauthMessage} />
            {oauthMessage ? <Text tone="muted">{oauthMessage}</Text> : null}
          </Stack>
        </Panel>
      </Stack>
    </main>
  )
}
