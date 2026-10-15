/**
 * Превью A3: экран сессии как в продукте (без dev-переключателей).
 * Видимость берётся из настроек лобби; мастер = владелец лобби.
 * /dev/session-live-table-preview
 */
import { useMemo, useState } from 'react'
import { ManualRollForm } from '../features/lobby/ManualRollForm'
import { SessionEventFeed } from '../features/lobby/SessionEventFeed'
import { SessionLiveTabs, type SessionLiveTabId } from '../features/lobby/SessionLiveTabs'
import { SessionTableCard } from '../features/lobby/SessionTableCard'
import { defaultVisibilityProfile } from '../features/lobby/visibilityProfile'
import type { SessionEvent, SessionSeat } from '../shared/api/lobbies'
import { Button, Dialog, Field, Input, Panel, Stack, Text, Toast } from '../ui'

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
    conditions: [],
    companions: [
      {
        id: 'comp1',
        name: 'Скакун',
        hp_current: 19,
        hp_max: 19,
        ac: 11,
        conditions: [],
      },
    ],
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
    conditions: [{ slug: 'poisoned', name: 'Отравленный', catalog_id: null }],
    companions: [],
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
  const [rollsOnly, setRollsOnly] = useState(false)
  const [events, setEvents] = useState<SessionEvent[]>(SEED_EVENTS)
  const [toast, setToast] = useState<string | null>(null)
  const [closed, setClosed] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [closeTitle, setCloseTitle] = useState('Итог: Глава 3 — Мост')
  const [closeSummary, setCloseSummary] = useState('')
  const [writeJournal, setWriteJournal] = useState(true)
  const [seats, setSeats] = useState(DEMO_SEATS)

  // Как в продукте: профиль из настроек лобби; здесь — дефолт (всё видно игрокам).
  // Мастер на реальном экране = is_owner лобби, не отдельный переключатель.
  const visibility = useMemo(() => defaultVisibilityProfile(), [])

  const visibleEvents = useMemo(() => {
    let list = events
    if (rollsOnly) list = list.filter((e) => e.event_type === 'roll')
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [events, rollsOnly])

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <header className="app-header">
          <div>
            <Text as="h1">Эхо Рассвета</Text>
            <Text tone="muted">
              Превью A3 · сессия · за столом {DEMO_SEATS.length}
            </Text>
          </div>
        </header>

        <Text tone="muted">/dev/session-live-table-preview · только для скринов</Text>

        <div className="lobby-hub-top">
          <Text>
            <span className="back-link">← В лобби «Эхо Рассвета»</span>
          </Text>
          {!closed ? (
            <div className="session-top-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setToast('Состав — через «Кто пришёл» (A2)')}
              >
                Кто пришёл
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCloseOpen(true)}>
                Закрыть сессию
              </Button>
            </div>
          ) : null}
        </div>

        {closed ? (
          <Text tone="muted">Сессия закрыта. Итог — во вкладке «Дневник» лобби.</Text>
        ) : null}

        <Panel title="Сессия">
          <Stack gap={8}>
            <Text as="h2">Глава 3 — Мост</Text>
            <Text tone="muted">
              Ваншот — без сеттинга · за столом: {DEMO_SEATS.length}
              {closed ? ' · закрыта' : ''}
            </Text>
          </Stack>
        </Panel>

        <Panel title="Живой стол">
          <Stack gap={14}>
            <SessionLiveTabs active={liveTab} onChange={setLiveTab} />

            {liveTab === 'table' ? (
              <div className="session-table-grid">
                {seats.map((seat) => (
                  <SessionTableCard
                    key={seat.character_id}
                    seat={seat}
                    visibility={visibility}
                    revealAll
                    masterControls={!closed}
                    sheetLabel="Смотреть"
                    onToggleInspiration={(next) => {
                      setSeats((prev) =>
                        prev.map((s) =>
                          s.character_id === seat.character_id
                            ? { ...s, inspiration: next }
                            : s,
                        ),
                      )
                      setToast(next ? 'Вдохновение выдано' : 'Вдохновение снято')
                    }}
                    onToggleCondition={(condition) => {
                      setSeats((prev) =>
                        prev.map((s) => {
                          if (s.character_id !== seat.character_id) return s
                          const current = s.conditions ?? []
                          const exists = current.some((c) => c.slug === condition.slug)
                          return {
                            ...s,
                            conditions: exists
                              ? current.filter((c) => c.slug !== condition.slug)
                              : [...current, condition],
                          }
                        }),
                      )
                    }}
                    onAddCompanion={() =>
                      setToast('На живой сессии: диалог «+ Напарник»')
                    }
                    onRemoveCompanion={(id) => {
                      setSeats((prev) =>
                        prev.map((s) =>
                          s.character_id === seat.character_id
                            ? {
                                ...s,
                                companions: (s.companions ?? []).filter((c) => c.id !== id),
                              }
                            : s,
                        ),
                      )
                    }}
                  />
                ))}
              </div>
            ) : null}

            {liveTab === 'feed' ? (
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
                  seats={seats}
                  ownCharacterIds={new Set(['c1'])}
                  isOwner
                  onSubmit={(payload) => {
                    const next: SessionEvent = {
                      id: `local-${Date.now()}`,
                      session_id: 's1',
                      event_type: 'roll',
                      character_id: payload.character_id ?? null,
                      actor_user_id: 'u-demo',
                      character_name: payload.character_id
                        ? seats.find((s) => s.character_id === payload.character_id)
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
            ) : null}

            {liveTab === 'more' ? (
              <Stack gap={10}>
                <Text tone="muted">
                  На живой сессии здесь: быстрая заметка + чаты. Превью заметок:{' '}
                  /dev/lobby-notes-preview · чаты: /dev/lobby-chats-preview
                </Text>
              </Stack>
            ) : null}
          </Stack>
        </Panel>
      </Stack>

      <Dialog
        open={closeOpen}
        title="Закрыть сессию"
        primaryLabel={writeJournal ? 'Закрыть и в дневник' : 'Закрыть'}
        secondaryLabel="Отмена"
        onPrimary={() => {
          setClosed(true)
          setCloseOpen(false)
          setToast(writeJournal ? 'Сессия закрыта · итог в дневнике' : 'Сессия закрыта')
        }}
        onSecondary={() => setCloseOpen(false)}
      >
        <Stack gap={12}>
          <Text tone="muted">
            Закрытая сессия остаётся в истории. Итог можно сразу записать в дневник лобби.
          </Text>
          <label className="session-feed-filter">
            <input
              type="checkbox"
              checked={writeJournal}
              onChange={(e) => setWriteJournal(e.target.checked)}
            />
            Записать итог в дневник
          </label>
          {writeJournal ? (
            <>
              <Field label="Заголовок">
                <Input value={closeTitle} onChange={(e) => setCloseTitle(e.target.value)} />
              </Field>
              <Field label="Что произошло">
                <textarea
                  className="ui-input ui-textarea"
                  rows={5}
                  value={closeSummary}
                  onChange={(e) => setCloseSummary(e.target.value)}
                  placeholder="Краткий итог сессии для дневника…"
                />
              </Field>
            </>
          ) : null}
        </Stack>
      </Dialog>

      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
