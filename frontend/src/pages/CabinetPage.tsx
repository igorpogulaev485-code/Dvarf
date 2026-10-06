import { Link } from 'react-router-dom'
import { Panel, Stack, Text } from '../ui'

export function CabinetPage() {
  return (
    <main className="page page--app">
      <Stack gap={16}>
        <Link className="back-link" to="/characters">
          ← К персонажам
        </Link>
        <Text as="h1">Личный кабинет</Text>
        <Panel title="Каркас">
          <Text tone="muted">
            Здесь позже будут профиль, привязка Яндекс/VK, телефон и настройки. Пока заглушка.
          </Text>
        </Panel>
      </Stack>
    </main>
  )
}
