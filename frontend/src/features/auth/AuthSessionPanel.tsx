import { useEffect, useState } from 'react'
import { getMe, logout, type User } from '../../shared/api/auth'
import { ApiRequestError, getAccessToken } from '../../shared/api/client'
import { Button, Stack, Text } from '../../ui'

type AuthSessionPanelProps = {
  user: User | null
  onUserChange: (user: User | null) => void
}

const PROVIDER_LABELS: Record<string, string> = {
  password: 'пароль',
  yandex: 'Яндекс',
  vk: 'VK ID',
  google: 'Google',
}

function formatProviders(providers: string[]): string {
  if (!providers.length) {
    return 'нет'
  }
  return providers.map((provider) => PROVIDER_LABELS[provider] || provider).join(', ')
}

export function AuthSessionPanel({ user, onUserChange }: AuthSessionPanelProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user || !getAccessToken()) {
      return
    }

    let active = true
    setLoading(true)
    getMe()
      .then((me) => {
        if (active) {
          onUserChange(me)
        }
      })
      .catch((err: unknown) => {
        if (!active) {
          return
        }
        if (err instanceof ApiRequestError) {
          setError(err.message)
        }
        onUserChange(null)
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [user, onUserChange])

  async function handleLogout() {
    setError(null)
    await logout()
    onUserChange(null)
  }

  if (loading) {
    return <Text tone="muted">Загружаем сессию...</Text>
  }

  if (!user) {
    return (
      <Stack gap={8}>
        <Text tone="muted">Вы не вошли в аккаунт</Text>
        {error ? <Text tone="danger">{error}</Text> : null}
      </Stack>
    )
  }

  return (
    <Stack gap={10}>
      <Text>
        Вы вошли как <strong>{user.email || user.display_name || user.id}</strong>
      </Text>
      <Text tone="muted">Способы входа: {formatProviders(user.providers)}</Text>
      <Button variant="ghost" onClick={handleLogout}>
        Выйти
      </Button>
    </Stack>
  )
}
