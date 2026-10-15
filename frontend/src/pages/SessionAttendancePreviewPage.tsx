/**
 * Превью A2: создание сессии + кто пришёл (без логина).
 */
import { useMemo, useState } from 'react'
import { LobbyHubTabs, type LobbyHubTabId } from '../features/lobby/LobbyHubTabs'
import { SessionAttendancePanel } from '../features/lobby/SessionAttendancePanel'
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
  {
    id: 'm4',
    character_id: 'c4',
    user_id: 'u4',
    joined_at: new Date().toISOString(),
    character_name: 'Лира',
    character_level: 5,
    character_class_name: 'Плут',
    character_race_name: 'Полурослик',
    hp_current: 31,
    hp_max: 31,
  },
  {
    id: 'm5',
    character_id: 'c5',
    user_id: 'u5',
    joined_at: new Date().toISOString(),
    character_name: 'Торин',
    character_level: 4,
    character_class_name: 'Волшебник',
    character_race_name: 'Гном',
    hp_current: 18,
    hp_max: 26,
  },
  {
    id: 'm6',
    character_id: 'c6',
    user_id: 'u6',
    joined_at: new Date().toISOString(),
    character_name: 'Селена',
    character_level: 5,
    character_class_name: 'Следопыт',
    character_race_name: 'Лесной эльф',
    hp_current: 40,
    hp_max: 44,
  },
]

export function SessionAttendancePreviewPage() {
  const [tab, setTab] = useState<LobbyHubTabId>('sessions')
  const [name, setName] = useState('Глава 3 — Мост')
  const [presentIds, setPresentIds] = useState<Set<string>>(
    () => new Set(['c1', 'c2', 'c4', 'c5', 'c6']),
  )
  const [toast, setToast] = useState<string | null>(null)
  const [view, setView] = useState<'create' | 'session'>('create')

  const presentCount = presentIds.size

  const subtitle = useMemo(
    () =>
      view === 'create'
        ? 'Превью A2 · новая сессия'
        : `Превью A2 · сессия · пришло ${presentCount}`,
    [view, presentCount],
  )

  function toggle(characterId: string, nextPresent: boolean) {
    setPresentIds((prev) => {
      const next = new Set(prev)
      if (nextPresent) next.add(characterId)
      else next.delete(characterId)
      return next
    })
  }

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <header className="app-header">
          <div>
            <Text as="h1">Эхо Рассвета</Text>
            <Text tone="muted">{subtitle}</Text>
          </div>
        </header>

        <div className="lobby-hub-top">
          <Text tone="muted">/dev/session-attendance-preview</Text>
          <div className="inline-actions">
            <Button
              type="button"
              variant={view === 'create' ? 'primary' : 'secondary'}
              onClick={() => setView('create')}
            >
              Создание
            </Button>
            <Button
              type="button"
              variant={view === 'session' ? 'primary' : 'secondary'}
              onClick={() => setView('session')}
            >
              Экран сессии
            </Button>
          </div>
        </div>

        {view === 'create' ? (
          <>
            <LobbyHubTabs active={tab} onChange={setTab} />
            <Panel title="Новая сессия">
              <Stack gap={14}>
                <Field label="Название сессии">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <SessionAttendancePanel
                  mode="create"
                  members={DEMO_MEMBERS}
                  presentIds={presentIds}
                  onToggle={toggle}
                />
                <Button
                  type="button"
                  onClick={() => {
                    setView('session')
                    setToast(`Сессия создана · пришло ${presentIds.size}`)
                  }}
                >
                  + Создать сессию ({presentIds.size})
                </Button>
              </Stack>
            </Panel>
          </>
        ) : (
          <>
            <Text>
              <button type="button" className="back-link" onClick={() => setView('create')}>
                ← В лобби «Эхо Рассвета»
              </button>
            </Text>
            <Panel title="Сессия">
              <Stack gap={8}>
                <Text as="h2">{name}</Text>
                <Text tone="muted">
                  Ваншот — без сеттинга · пришло: {presentCount} из {DEMO_MEMBERS.length}
                </Text>
              </Stack>
            </Panel>
            <Panel title="Кто пришёл">
              <SessionAttendancePanel
                mode="manage"
                members={DEMO_MEMBERS}
                presentIds={presentIds}
                isOwner
                onToggle={toggle}
              />
            </Panel>
            <Panel title="Живой стол">
              <Text tone="muted">
                Карточки по видимости, лента и броски — слайс A3.
              </Text>
            </Panel>
          </>
        )}
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
