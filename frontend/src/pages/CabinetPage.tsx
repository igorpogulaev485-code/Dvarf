import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AppearancePanel,
  AuthProvidersPanel,
  ChangeEmailForm,
  ChangePasswordForm,
  DangerZone,
  ProfileForm,
  SessionsPanel,
} from '../features/cabinet'
import { getMe, type User } from '../shared/api/auth'
import { ApiRequestError } from '../shared/api/client'
import { AppLegalFooter } from '../shared/brand/creed20'
import {
  applyAccountAppearance,
  mergeAppearanceFromUser,
  readCachedAppearance,
} from '../shared/theme/accountAppearance'
import { Panel, Stack, Text, Toast } from '../ui'

export function CabinetPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const closeToast = useCallback(() => setToast(null), [])

  const handleUser = useCallback((next: User) => {
    // Prefer server fields when present; otherwise keep cache (thin-deploy safety).
    const appearance = mergeAppearanceFromUser(readCachedAppearance(), next)
    const merged: User = {
      ...next,
      theme_id: appearance.themeId,
      ability_colors: appearance.abilityColors,
    }
    setUser(merged)
    applyAccountAppearance(appearance)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    getMe()
      .then((me) => {
        if (active) {
          handleUser(me)
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
  }, [navigate, handleUser])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const linked = params.get('oauth_linked')
    const oauthError = params.get('oauth_error')
    if (!linked && !oauthError) {
      return
    }
    window.history.replaceState({}, '', '/cabinet')
    if (oauthError) {
      setToast(oauthError)
      return
    }
    const label = linked === 'yandex' ? 'Яндекс' : linked === 'vk' ? 'VK' : linked
    setToast(`${label} привязан к аккаунту`)
    getMe()
      .then(handleUser)
      .catch(() => {
        /* toast already shows success; refresh is best-effort */
      })
  }, [handleUser])

  return (
    <main className="page page--app page--cabinet">
      <Stack gap={20}>
        <header className="cabinet-header">
          <Link className="back-link" to="/characters">
            ← К персонажам
          </Link>
          <Stack gap={6}>
            <Text as="h1">Личный кабинет</Text>
            <Text tone="muted">Профиль, безопасность и оформление</Text>
          </Stack>
        </header>

        {loading ? <Text tone="muted">Загружаем профиль…</Text> : null}
        {error ? <Text tone="danger">{error}</Text> : null}

        {user ? (
          <div className="cabinet-layout">
            <Panel title="Профиль" className="cabinet-layout__profile">
              <ProfileForm
                user={user}
                onSaved={(next) => {
                  handleUser(next)
                  setToast('Профиль сохранён')
                }}
              />
            </Panel>

            <Panel title="Оформление" className="cabinet-layout__appearance">
              <AppearancePanel
                user={user}
                onSaved={(next) => {
                  handleUser(next)
                  setToast('Оформление сохранено')
                }}
              />
            </Panel>

            <Panel title="Способы входа" className="cabinet-layout__providers">
              <AuthProvidersPanel
                providers={user.providers}
                onUserChange={handleUser}
                onMessage={setToast}
              />
            </Panel>

            <Panel title="Смена email" className="cabinet-layout__email">
              <ChangeEmailForm currentEmail={user.email} />
            </Panel>

            {user.providers.includes('password') ? (
              <Panel title="Смена пароля" className="cabinet-layout__password">
                <ChangePasswordForm onChanged={() => setToast('Пароль изменён')} />
              </Panel>
            ) : (
              <Panel title="Смена пароля" className="cabinet-layout__password">
                <Text tone="muted">
                  У аккаунта нет пароля email — смена пароля недоступна. Позже можно будет задать
                  пароль после привязки email.
                </Text>
              </Panel>
            )}

            <Panel title="Сессии" className="cabinet-layout__sessions">
              <SessionsPanel
                onLoggedOut={() => {
                  navigate('/login', { replace: true })
                }}
              />
            </Panel>

            <Panel title="Опасная зона" className="ui-panel--danger cabinet-layout__danger">
              <DangerZone
                user={user}
                onDeleted={() => {
                  setToast('Аккаунт удалён')
                  navigate('/login', { replace: true })
                }}
              />
            </Panel>
          </div>
        ) : null}

        <AppLegalFooter />
      </Stack>

      {toast ? <Toast message={toast} onClose={closeToast} /> : null}
    </main>
  )
}
