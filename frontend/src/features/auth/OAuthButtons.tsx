import { useState } from 'react'
import { startOAuth } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Stack, Text } from '../../ui'

type OAuthButtonsProps = {
  onMessage?: (message: string) => void
}

const PROVIDER_LABELS = {
  yandex: 'Яндекс',
  vk: 'VK ID',
} as const

export function OAuthButtons({ onMessage }: OAuthButtonsProps) {
  const [pendingProvider, setPendingProvider] = useState<'yandex' | 'vk' | null>(null)

  async function handleStart(provider: 'yandex' | 'vk') {
    setPendingProvider(provider)
    try {
      const result = await startOAuth(provider)
      if (!result.configured || !result.authorize_url) {
        onMessage?.(
          result.message ||
            `Вход через ${PROVIDER_LABELS[provider]} пока в заглушке`,
        )
        return
      }
      window.location.assign(result.authorize_url)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        onMessage?.(err.message)
      } else {
        onMessage?.('Не удалось начать вход через провайдера')
      }
    } finally {
      setPendingProvider(null)
    }
  }

  return (
    <Stack gap={10}>
      <Text tone="muted">
        Яндекс — рабочий поток (нужны ключи в env). VK ID пока заглушка.
      </Text>
      <Button
        variant="secondary"
        disabled={pendingProvider !== null}
        onClick={() => handleStart('yandex')}
      >
        {pendingProvider === 'yandex' ? '...' : 'Войти через Яндекс'}
      </Button>
      <Button
        variant="secondary"
        disabled={pendingProvider !== null}
        onClick={() => handleStart('vk')}
      >
        {pendingProvider === 'vk' ? '...' : 'Войти через VK ID'}
      </Button>
    </Stack>
  )
}
