/**
 * Публичный превью-экран A1 для скриншотов без логина.
 * Не для продакшен-навигации — только /dev/lobby-hub-preview.
 */
import { useMemo, useState } from 'react'
import { LobbyComingSoon } from '../features/lobby/LobbyComingSoon'
import { LobbyHubTabs, type LobbyHubTabId } from '../features/lobby/LobbyHubTabs'
import { LobbyMemberMiniCard } from '../features/lobby/LobbyMemberMiniCard'
import { VisibilitySettingsPanel } from '../features/lobby/VisibilitySettingsPanel'
import {
  defaultVisibilityProfile,
  type VisibilityProfile,
} from '../features/lobby/visibilityProfile'
import type { LobbyMember } from '../shared/api/lobbies'
import { Button, Field, Input, Panel, Stack, Text, Toast } from '../ui'

const DEMO_MEMBERS: LobbyMember[] = [
  {
    id: 'm1',
    character_id: 'c1',
    user_id: 'u1',
    joined_at: new Date().toISOString(),
    character_name: 'Эларион',
    character_level: 5,
    character_class_name: 'Паладин',
    character_race_name: 'Высший эльф',
    hp_current: 48,
    hp_max: 48,
  },
  {
    id: 'm2',
    character_id: 'c2',
    user_id: 'u2',
    joined_at: new Date().toISOString(),
    character_name: 'Вирра',
    character_level: 5,
    character_class_name: 'Жрец',
    character_race_name: 'Человек',
    hp_current: 22,
    hp_max: 38,
  },
  {
    id: 'm3',
    character_id: 'c3',
    user_id: 'u3',
    joined_at: new Date().toISOString(),
    character_name: 'Грок',
    character_level: 5,
    character_class_name: 'Варвар',
    character_race_name: 'Полуорк',
    hp_current: 0,
    hp_max: 55,
  },
]

export function LobbyHubPreviewPage() {
  const [tab, setTab] = useState<LobbyHubTabId>('roster')
  const [profile, setProfile] = useState<VisibilityProfile>(() => defaultVisibilityProfile())
  const [playerPreview, setPlayerPreview] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [name, setName] = useState('Эхо Рассвета')

  const subtitle = useMemo(
    () => (playerPreview ? 'Превью: глазами игрока' : 'Превью A1 · мастер'),
    [playerPreview],
  )

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <header className="app-header">
          <div>
            <Text as="h1">{name}</Text>
            <Text tone="muted">{subtitle}</Text>
          </div>
        </header>

        <div className="lobby-hub-top">
          <Text tone="muted">/dev/lobby-hub-preview</Text>
          <div className="lobby-hub-code">
            <Text tone="muted">Код комнаты</Text>
            <button
              type="button"
              className="lobby-hub-code__value"
              onClick={() => setToast('Код скопирован (demo)')}
            >
              DEMO01
            </button>
          </div>
        </div>

        <LobbyHubTabs active={tab} onChange={setTab} />

        {tab === 'roster' ? (
          <Panel title="Состав кампании">
            <Stack gap={12}>
              <Text tone="muted">
                Упрощённые карточки участников. Полные статы и лента — в сессии.
              </Text>
              <div className="lobby-member-grid">
                {DEMO_MEMBERS.map((m) => (
                  <LobbyMemberMiniCard key={m.id} member={m} onRemove={() => setToast('Убрать (demo)')} />
                ))}
              </div>
            </Stack>
          </Panel>
        ) : null}

        {tab === 'journal' ? (
          <LobbyComingSoon
            title="Дневник"
            description="Инструмент мастера: посты, главы и итоги сессий появятся в следующем слайсе."
          />
        ) : null}

        {tab === 'notes' ? (
          <LobbyComingSoon
            title="Заметки"
            description="Личный блокнот и общая доска пати — следующий слой после чатов."
          />
        ) : null}

        {tab === 'chats' ? (
          <LobbyComingSoon
            title="Чаты"
            description="Тематические каналы и письмо мастеру появятся после живого стола."
          />
        ) : null}

        {tab === 'sessions' ? (
          <Panel title="Сессии">
            <Text tone="muted">Список сессий на живом лобби. Здесь — заглушка превью.</Text>
          </Panel>
        ) : null}

        {tab === 'setting' ? (
          <Panel title="Сеттинг">
            <Text tone="muted">Вики мира — фаза C. Здесь — заглушка превью.</Text>
          </Panel>
        ) : null}

        {tab === 'settings' ? (
          <Stack gap={16}>
            <Panel title="Настройки комнаты">
              <Field label="Название">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </Panel>
            <VisibilitySettingsPanel
              profile={profile}
              readOnly={playerPreview}
              playerPreview={playerPreview}
              onPlayerPreviewChange={setPlayerPreview}
              onChange={setProfile}
            />
            <div className="inline-actions">
              <Button type="button" onClick={() => setToast('Видимость сохранена (demo)')}>
                Сохранить видимость
              </Button>
            </div>
            <Panel title="Опасная зона" className="ui-panel--danger">
              <Button type="button" variant="danger" onClick={() => setToast('Удаление (demo)')}>
                Удалить комнату
              </Button>
            </Panel>
          </Stack>
        ) : null}
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
