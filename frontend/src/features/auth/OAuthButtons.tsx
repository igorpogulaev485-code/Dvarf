import { useState } from 'react'
import { startOAuth } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Stack, Text } from '../../ui'

type OAuthButtonsProps = {
  onMessage?: (message: string) => void
}

export function OAuthButtons({ onMessage }: OAuthButtonsProps) {
  const [pendingProvider, setPendingProvider] = useState<'yandex' | 'vk' | null>(null)

  async function handleStart(provider: 'yandex' | 'vk') {
    setPendingProvider(provider)
    try {
      const result = await startOAuth(provider)
      if (!result.configured || !result.authorize_url) {
        onMessage?.(result.message || `${provider} OAuth is stubbed`)
        return
      }
      window.location.assign(result.authorize_url)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        onMessage?.(err.message)
      } else {
        onMessage?.('OAuth start failed')
      }
    } finally {
      setPendingProvider(null)
    }
  }

  return (
    <Stack gap={10}>
      <Text tone="muted">OAuth providers (stub until secrets are configured)</Text>
      <Button
        variant="secondary"
        disabled={pendingProvider !== null}
        onClick={() => handleStart('yandex')}
      >
        {pendingProvider === 'yandex' ? '...' : 'Continue with Yandex'}
      </Button>
      <Button
        variant="secondary"
        disabled={pendingProvider !== null}
        onClick={() => handleStart('vk')}
      >
        {pendingProvider === 'vk' ? '...' : 'Continue with VK ID'}
      </Button>
    </Stack>
  )
}
