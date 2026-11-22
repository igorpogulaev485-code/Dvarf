import { useState } from 'react'
import { startOAuth } from '../../shared/api/auth'
import { ApiRequestError } from '../../shared/api/client'
import { Text } from '../../ui'

type OAuthButtonsProps = {
  onMessage?: (message: string) => void
  /** icons — квадратные глифы кабинета. labels — текстовые кнопки панели входа. */
  layout?: 'icons' | 'labels'
}

const PROVIDER_LABELS = {
  yandex: 'Яндекс',
  vk: 'VK ID',
} as const

function YandexMark() {
  return (
    <span className="oauth-icons__glyph oauth-icons__glyph--yandex" aria-hidden="true">
      Я
    </span>
  )
}

function VkMark() {
  return (
    <span className="oauth-icons__glyph oauth-icons__glyph--vk" aria-hidden="true">
      VK
    </span>
  )
}

export function OAuthButtons({ onMessage, layout = 'icons' }: OAuthButtonsProps) {
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
      <div
        className={layout === 'labels' ? 'oauth-icons__row oauth-icons__row--labels' : 'oauth-icons__row'}
        role="group"
        aria-label="Вход через сервисы"
      >
        <button
          type="button"
          className="oauth-icons__btn"
          title="Войти через Яндекс ID"
          aria-label="Войти через Яндекс ID"
          disabled={pendingProvider !== null}
          onClick={() => handleStart('yandex')}
        >
          <YandexMark />
          {layout === 'labels' ? <span>Войти через Яндекс ID</span> : null}
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
          {layout === 'labels' ? <span>Войти через VK ID</span> : null}
        </button>
      </div>
    </div>
  )
}
