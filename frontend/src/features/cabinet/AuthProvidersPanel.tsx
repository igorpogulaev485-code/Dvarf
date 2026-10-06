import { Button, Stack, Text } from '../../ui'

const PROVIDERS = [
  { id: 'password', label: 'Пароль (email)' },
  { id: 'yandex', label: 'Яндекс ID' },
  { id: 'vk', label: 'VK ID' },
] as const

type AuthProvidersPanelProps = {
  providers: string[]
}

export function AuthProvidersPanel({ providers }: AuthProvidersPanelProps) {
  const linked = new Set(providers)

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
              <Button variant="secondary" disabled title="Привязка появится в следующем срезе">
                {isLinked ? 'Отвязать' : 'Привязать'}
              </Button>
            )}
          </div>
        )
      })}
      <Text tone="muted">Привязка и отвязка Яндекс/VK — в следующем срезе.</Text>
    </Stack>
  )
}
