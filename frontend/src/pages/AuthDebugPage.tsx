import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getMe, type User } from '../shared/api/auth'
import { getAccessToken, setTokens } from '../shared/api/client'
import {
  AuthSessionPanel,
  EmailAuthForm,
  ForgotPasswordForm,
  OAuthButtons,
} from '../features/auth'
import { Panel, Stack, Text } from '../ui'

type AuthView = 'register' | 'login' | 'forgot'

export function AuthDebugPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [oauthMessage, setOauthMessage] = useState<string | null>(null)
  const [view, setView] = useState<AuthView>('login')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const oauthProvider = params.get('oauth')

    if (!accessToken || !refreshToken) {
      return
    }

    setTokens(accessToken, refreshToken)
    window.history.replaceState({}, '', '/login')

    getMe()
      .then((me) => {
        setUser(me)
        if (oauthProvider === 'yandex') {
          setOauthMessage('Вход через Яндекс выполнен успешно')
        } else if (oauthProvider) {
          setOauthMessage(`Вход через ${oauthProvider} выполнен успешно`)
        }
        navigate('/characters', { replace: true })
      })
      .catch(() => {
        setOauthMessage('Не удалось восстановить сессию после OAuth')
      })
  }, [navigate])

  if (getAccessToken() && !oauthMessage) {
    // Already signed in — go to characters home.
    return <Navigate to="/characters" replace />
  }

  const panelTitle =
    view === 'register' ? 'Регистрация' : view === 'login' ? 'Вход' : 'Забыли пароль'

  return (
    <main className="page page--auth-debug">
      <Stack gap={20}>
        <Stack gap={6}>
          <Text as="h1">Dvarf — вход</Text>
          <Text tone="muted">Войдите, чтобы открыть список персонажей.</Text>
        </Stack>

        <Panel title="Сессия">
          <AuthSessionPanel user={user} onUserChange={setUser} />
        </Panel>

        <Panel title={panelTitle}>
          <Stack gap={12}>
            {view === 'register' || view === 'login' ? (
              <>
                <div className="mode-switch">
                  <button
                    type="button"
                    className={view === 'register' ? 'is-active' : ''}
                    onClick={() => setView('register')}
                  >
                    Регистрация
                  </button>
                  <button
                    type="button"
                    className={view === 'login' ? 'is-active' : ''}
                    onClick={() => setView('login')}
                  >
                    Вход
                  </button>
                </div>
                <EmailAuthForm
                  mode={view}
                  onSuccess={(nextUser) => {
                    setUser(nextUser)
                    navigate('/characters', { replace: true })
                  }}
                  onForgotPassword={() => setView('forgot')}
                />
              </>
            ) : null}

            {view === 'forgot' ? (
              <ForgotPasswordForm onBackToLogin={() => setView('login')} />
            ) : null}
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
