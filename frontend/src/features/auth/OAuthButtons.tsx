import { useState } from 'react'
import { startOAuth } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { Text } from '../../ui'

type OAuthButtonsProps = {
  onMessage?: (message: string) => void
}

const PROVIDER_LABELS = {
  yandex: 'Яндекс',
  vk: 'VK ID',
} as const

function YandexMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#FC3F1D" />
      <path
        fill="#fff"
        d="M13.1 18.2h-2.1V5.8h3.2c2.4 0 3.9 1.3 3.9 3.3 0 1.7-1 2.9-2.5 3.3l2.9 5.8h-2.4l-2.6-5.4h-.4v5.4Zm1-7.2c1.2 0 1.9-.7 1.9-1.8s-.7-1.8-1.9-1.8h-1.1v3.6h1.1Z"
      />
    </svg>
  )
}

function VkMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#0077FF" />
      <path
        fill="#fff"
        d="M12.7 16.4c-4.1 0-6.5-2.8-6.6-7.5h2.1c.1 3.4 1.5 4.9 2.7 5.1V8.9h2v3.4c1.1-.1 2.3-1.5 2.7-3.4h2c-.5 2.3-2 3.9-3.1 4.5 1.1.5 2.8 1.9 3.4 4.4h-2.2c-.5-1.7-1.8-3-3.4-3.2v3.2h-.6Z"
      />
    </svg>
  )
}

export function OAuthButtons({ onMessage }: OAuthButtonsProps) {
  const [pendingProvider, setPendingProvider] = useState<'yandex' | 'vk' | null>(null)

  async function handleStart(provider: 'yandex' | 'vk') {
    setPendingProvider(provider)
    try {
      const result = await startOAuth(provider)
      if (!result.configured || !result.authorize_url) {
        onMessage?.(
          result.message ||
            `Вход через ${PROVIDER_LABELS[provider]} сейчас недоступен`,
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
    <div className="oauth-icons">
      <Text tone="muted" className="oauth-icons__label">
        или через
      </Text>
      <div className="oauth-icons__row" role="group" aria-label="Вход через сервисы">
        <button
          type="button"
          className="oauth-icons__btn"
          title="Войти через Яндекс"
          aria-label="Войти через Яндекс"
          disabled={pendingProvider !== null}
          onClick={() => handleStart('yandex')}
        >
          <YandexMark />
        </button>
        <button
          type="button"
          className="oauth-icons__btn"
          title="Войти через VK ID"
          aria-label="Войти через VK ID"
          disabled={pendingProvider !== null}
          onClick={() => handleStart('vk')}
        >
          <VkMark />
        </button>
      </div>
    </div>
  )
}
