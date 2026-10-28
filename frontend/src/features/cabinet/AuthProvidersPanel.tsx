import { useState } from 'react'
import {
  startOAuthLink,
  unlinkOAuth,
  type User,
} from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Stack, Text } from '../../ui'

const PROVIDERS = [
  { id: 'password', label: 'Пароль (email)' },
  { id: 'yandex', label: 'Яндекс ID' },
  { id: 'vk', label: 'VK ID' },
] as const

type OAuthProviderId = 'yandex' | 'vk'

type AuthProvidersPanelProps = {
  providers: string[]
  onUserChange: (user: User) => void
  onMessage?: (message: string) => void
}

export function AuthProvidersPanel({
  providers,
  onUserChange,
  onMessage,
}: AuthProvidersPanelProps) {
  const linked = new Set(providers)
  const [pending, setPending] = useState<OAuthProviderId | null>(null)

  async function handleLink(provider: OAuthProviderId) {
    setPending(provider)
    try {
      const result = await startOAuthLink(provider)
      if (!result.configured || !result.authorize_url) {
        onMessage?.(
          result.message ||
            `Привязка ${provider === 'yandex' ? 'Яндекс' : 'VK'} сейчас недоступна`,
        )
        return
      }
      window.location.assign(result.authorize_url)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        onMessage?.(err.message)
      } else {
        onMessage?.('Не удалось начать привязку')
      }
    } finally {
      setPending(null)
    }
  }

  async function handleUnlink(provider: OAuthProviderId) {
    const label = provider === 'yandex' ? 'Яндекс' : 'VK'
    if (!window.confirm(`Отвязать ${label} от аккаунта?`)) {
      return
    }
    setPending(provider)
    try {
      const next = await unlinkOAuth(provider)
      onUserChange(next)
      onMessage?.(`${label} отвязан`)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        onMessage?.(err.message)
      } else {
        onMessage?.('Не удалось отвязать способ входа')
      }
    } finally {
      setPending(null)
    }
  }

  return (
    <Stack gap={12}>
      {PROVIDERS.map((provider) => {
        const isLinked = linked.has(provider.id)
        return (
          <div key={provider.id} className="cabinet-provider-row">
            <div className="cabinet-provider-row__meta">
              <Text className="cabinet-provider-row__name">{provider.label}</Text>
              <Text tone="muted">{isLinked ? 'Подключено' : 'Не подключено'}</Text>
            </div>
            {provider.id === 'password' ? (
              <Text tone="muted">{isLinked ? 'Основной вход' : '—'}</Text>
            ) : (
              <Button
                variant="secondary"
                disabled={pending !== null}
                onClick={() =>
                  isLinked
                    ? handleUnlink(provider.id)
                    : handleLink(provider.id)
                }
              >
                {pending === provider.id
                  ? '…'
                  : isLinked
                    ? 'Отвязать'
                    : 'Привязать'}
              </Button>
            )}
          </div>
        )
      })}
      <Text tone="muted">
        Привязка позволяет входить в тот же аккаунт через Яндекс или VK, не создавая второй
        профиль.
      </Text>
    </Stack>
  )
}
