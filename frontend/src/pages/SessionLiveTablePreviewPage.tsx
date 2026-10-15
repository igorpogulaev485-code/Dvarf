/**
 * Превью A3: живой стол — карточки по видимости + лента + физ. куб.
 * /dev/session-live-table-preview
 */
import { useMemo, useState } from 'react'
import { ManualRollForm } from '../features/lobby/ManualRollForm'
import { SessionEventFeed } from '../features/lobby/SessionEventFeed'
import { SessionLiveTabs, type SessionLiveTabId } from '../features/lobby/SessionLiveTabs'
import { SessionTableCard } from '../features/lobby/SessionTableCard'
import {
  applyVisibilityPreset,
  type FieldPreset,
  type VisibilityProfile,
} from '../features/lobby/visibilityProfile'
import type { SessionEvent, SessionSeat } from '../shared/api/lobbies'
import { Panel, Stack, Text, Toast } from '../ui'

const DEMO_SEATS: SessionSeat[] = [
  {
    character_id: 'c1',
    character_name: 'Эларион',
    character_level: 5,
    character_class_name: 'Паладин',
    character_race_name: 'Высший эльф',
    hp_current: 48,
    hp_max: 48,
    ac: 18,
    speed: 30,
    inspiration: true,
    passive_perception: 12,
    passive_insight: 11,
    passive_investigation: 10,
    seated_at: new Date().toISOString(),
  },
  {
    character_id: 'c2',
    character_name: 'Вирра',
    character_level: 5,
    character_class_name: 'Жрец',
    character_race_name: 'Человек',
    hp_current: 22,
    hp_max: 38,
    ac: 16,
    speed: 30,
    inspiration: false,
    passive_perception: 15,
    passive_insight: 15,
    passive_investigation: 11,
    seated_at: new Date().toISOString(),
  },
  {
    character_id: 'c3',
    character_name: 'Грок',
    character_level: 5,
    character_class_name: 'Варвар',
    character_race_name: 'Полуорк',
    hp_current: 0,
    hp_max: 55,
    ac: 14,
    speed: 40,
    inspiration: false,
    passive_perception: 13,
    passive_insight: 9,
    passive_investigation: 8,
    seated_at: new Date().toISOString(),
  },
  {
    character_id: 'c4',
    character_name: 'Лира',
    character_level: 5,
    character_class_name: 'Плут',
    character_race_name: 'Полурослик',
    hp_current: 31,
    hp_max: 31,
    ac: 15,
    speed: 25,
    inspiration: false,
    passive_perception: 16,
    passive_insight: 12,
    passive_investigation: 14,
    seated_at: new Date().toISOString(),
  },
  {
    character_id: 'c5',
    character_name: 'Торин',
    character_level: 4,
    character_class_name: 'Волшебник',
    character_race_name: 'Гном',
    hp_current: 18,
    hp_max: 26,
    ac: 12,
    speed: 25,
    inspiration: true,
    passive_perception: 11,
    passive_insight: 11,
    passive_investigation: 16,
    seated_at: new Date().toISOString(),
  },
  {
    character_id: 'c6',
    character_name: 'Селена',
    character_level: 5,
    character_class_name: 'Следопыт',
    character_race_name: 'Лесной эльф',
    hp_current: 40,
    hp_max: 44,
    ac: 15,
    speed: 35,
    inspiration: false,
    passive_perception: 17,
    passive_insight: 13,
    passive_investigation: 12,
    seated_at: new Date().toISOString(),
  },
]

const SEED_EVENTS: SessionEvent[] = [
  {
    id: 'e1',
    session_id: 's1',
    event_type: 'roll',
    character_id: 'c4',
    actor_user_id: 'u4',
    character_name: 'Лира',
    title: 'Скрытность',
    formula: '1d20+8',
    breakdown: '14+8',
    total: 22,
    is_master_roll: false,
    payload: {},
    created_at: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'e2',
    session_id: 's1',
    event_type: 'roll',
    character_id: null,
    actor_user_id: 'u0',
    character_name: 'Мастер',
    title: 'Пассивная проверка NPC',
    formula: '1d20+3',
    breakdown: '9+3',
    total: 12,
    is_master_roll: true,
    payload: {},
    created_at: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'e3',
    session_id: 's1',
    event_type: 'roll',
    character_id: 'c1',
    actor_user_id: 'u1',
    character_name: 'Эларион',
    title: 'Атака длинным мечом',
    formula: '1d20+7',
    breakdown: '18+7',
    total: 25,
    is_master_roll: false,
    payload: {},
    created_at: new Date(Date.now() - 15000).toISOString(),
  },
]

export function SessionLiveTablePreviewPage() {
  const [liveTab, setLiveTab] = useState<SessionLiveTabId>('table')
  const [preset, setPreset] = useState<Exclude<FieldPreset, 'custom'>>('all')
  const [asMaster, setAsMaster] = useState(true)
  const [rollsOnly, setRollsOnly] = useState(false)
  const [events, setEvents] = useState<SessionEvent[]>(SEED_EVENTS)
  const [toast, setToast] = useState<string | null>(null)

  const visibility: VisibilityProfile = useMemo(() => applyVisibilityPreset(preset), [preset])

  const visibleEvents = useMemo(() => {
    let list = events
    if (!asMaster && visibility.event_history === 'off') return []
    if (!asMaster && visibility.event_history === 'hide_master_rolls') {
      list = list.filter((e) => !e.is_master_roll)
    }
    if (rollsOnly) list = list.filter((e) => e.event_type === 'roll')
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [events, asMaster, visibility.event_history, rollsOnly])

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <header className="app-header">
          <div>
            <Text as="h1">Эхо Рассвета</Text>
            <Text tone="muted">Превью A3 · живой стол · {DEMO_SEATS.length} за столом</Text>
          </div>
        </header>

        <Text tone="muted">/dev/session-live-table-preview · только для скринов</Text>

        <div className="lobby-hub-top">
          <Text>
            <span className="back-link">← В лобби «Эхо Рассвета»</span>
          </Text>
          <div className="session-preview-toggles">
            <label className="session-preview-toggles__item">
              <input
                type="checkbox"
                checked={asMaster}
                onChange={(e) => setAsMaster(e.target.checked)}
              />
              Как мастер
            </label>
            <select
              className="ui-input"
              value={preset}
              onChange={(e) => setPreset(e.target.value as Exclude<FieldPreset, 'custom'>)}
              aria-label="Пресет видимости"
            >
              <option value="all">Видимость: всё</option>
              <option value="complex_combat">Видимость: сложный бой</option>
              <option value="minimum">Видимость: минимум</option>
            </select>
          </div>
        </div>

        <Panel title="Сессия">
          <Stack gap={8}>
            <Text as="h2">Глава 3 — Мост</Text>
            <Text tone="muted">Ваншот — без сеттинга · за столом: {DEMO_SEATS.length}</Text>
          </Stack>
        </Panel>

        <Panel title="Живой стол">
          <Stack gap={14}>
            <SessionLiveTabs active={liveTab} onChange={setLiveTab} />

            {liveTab === 'table' ? (
              <div className="session-table-grid">
                {DEMO_SEATS.map((seat) => (
                  <SessionTableCard
                    key={seat.character_id}
                    seat={seat}
                    visibility={visibility}
                    revealAll={asMaster}
                    sheetLabel={asMaster ? 'Смотреть' : 'Лист'}
                  />
                ))}
              </div>
            ) : (
              <Stack gap={14}>
                <label className="session-feed-filter">
                  <input
                    type="checkbox"
                    checked={rollsOnly}
                    onChange={(e) => setRollsOnly(e.target.checked)}
                  />
                  Только броски
                </label>
                <SessionEventFeed events={visibleEvents} />
                <ManualRollForm
                  seats={DEMO_SEATS}
                  ownCharacterIds={new Set(['c1'])}
                  isOwner={asMaster}
                  onSubmit={(payload) => {
                    const next: SessionEvent = {
                      id: `local-${Date.now()}`,
                      session_id: 's1',
                      event_type: 'roll',
                      character_id: payload.character_id ?? null,
                      actor_user_id: 'u-demo',
                      character_name: payload.character_id
                        ? DEMO_SEATS.find((s) => s.character_id === payload.character_id)
                            ?.character_name ?? 'Персонаж'
                        : 'Мастер',
                      title: payload.title,
                      formula: payload.formula ?? null,
                      breakdown: payload.breakdown ?? null,
                      total: payload.total,
                      is_master_roll: Boolean(payload.is_master_roll),
                      payload: {},
                      created_at: new Date().toISOString(),
                    }
                    setEvents((prev) => [next, ...prev])
                    setToast('Бросок в ленте')
                    setLiveTab('feed')
                  }}
                />
              </Stack>
            )}
          </Stack>
        </Panel>

      </Stack>

      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
