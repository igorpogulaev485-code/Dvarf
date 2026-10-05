import { useEffect, useState } from 'react'
import { getMe, type User } from '../shared/api/auth'
import { setTokens } from '../shared/api/client'
import { AuthSessionPanel, EmailAuthForm, OAuthButtons } from '../features/auth'
import { Panel, Stack, Text } from '../ui'

export function AuthDebugPage() {
  const [user, setUser] = useState<User | null>(null)
  const [oauthMessage, setOauthMessage] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('register')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const oauthProvider = params.get('oauth')

    if (!accessToken || !refreshToken) {
      return
    }

    setTokens(accessToken, refreshToken)
    window.history.replaceState({}, '', '/')

    getMe()
      .then((me) => {
        setUser(me)
        if (oauthProvider === 'yandex') {
          setOauthMessage('Вход через Яндекс выполнен успешно')
        } else if (oauthProvider) {
          setOauthMessage(`Вход через ${oauthProvider} выполнен успешно`)
        }
      })
      .catch(() => {
        setOauthMessage('Не удалось восстановить сессию после OAuth')
      })
  }, [])

  return (
    <main className="page page--auth-debug">
      <Stack gap={20}>
        <Stack gap={6}>
          <Text as="h1">Dvarf — отладка входа</Text>
          <Text tone="muted">
            Экран из компонентов: вход по email, Яндекс ID и заглушка VK ID.
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
