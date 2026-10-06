import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AuthProvidersPanel,
  ChangeEmailForm,
  ChangePasswordForm,
  DangerZone,
  ProfileForm,
} from '../features/cabinet'
import { getMe, logout, type User } from '../shared/api/auth'
import { ApiRequestError } from '../shared/api/client'
import { Button, Panel, Stack, Text, Toast } from '../ui'

export function CabinetPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    getMe()
      .then((me) => {
        if (active) {
          setUser(me)
        }
      })
      .catch((err: unknown) => {
        if (!active) {
          return
        }
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить профиль')
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [navigate])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      setToast('Не удалось выйти. Попробуйте ещё раз.')
      setLoggingOut(false)
    }
  }

  return (
    <main className="page page--app">
      <Stack gap={20}>
        <Link className="back-link" to="/characters">
          ← К персонажам
        </Link>

        <Stack gap={6}>
          <Text as="h1">Личный кабинет</Text>
          <Text tone="muted">Профиль и способы входа</Text>
        </Stack>

        {loading ? <Text tone="muted">Загружаем профиль…</Text> : null}
        {error ? <Text tone="danger">{error}</Text> : null}

        {user ? (
          <>
            <Panel title="Профиль">
              <ProfileForm
                user={user}
                onSaved={(next) => {
                  setUser(next)
                  setToast('Профиль сохранён')
                }}
              />
            </Panel>

            <Panel title="Способы входа">
              <AuthProvidersPanel providers={user.providers} />
            </Panel>

            <Panel title="Смена email">
              <ChangeEmailForm currentEmail={user.email} />
            </Panel>

            {user.providers.includes('password') ? (
              <Panel title="Смена пароля">
                <ChangePasswordForm
                  onChanged={() => setToast('Пароль изменён')}
                />
              </Panel>
            ) : (
              <Panel title="Смена пароля">
                <Text tone="muted">
                  У аккаунта нет пароля email — смена пароля недоступна. Позже можно будет задать
                  пароль после привязки email.
                </Text>
              </Panel>
            )}

            <Panel title="Сессия">
              <Button variant="ghost" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? 'Выходим…' : 'Выйти'}
              </Button>
            </Panel>

            <Panel title="Опасная зона" className="ui-panel--danger">
              <DangerZone
                user={user}
                onDeleted={() => {
                  setToast('Аккаунт удалён')
                  navigate('/login', { replace: true })
                }}
              />
            </Panel>
          </>
        ) : null}
      </Stack>

      {toast ? <Toast message={toast} onClose={closeToast} /> : null}
    </main>
  )
}
