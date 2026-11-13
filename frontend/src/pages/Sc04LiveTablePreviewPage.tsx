/**
 * /dev/sc04-live-table-preview — tip-каркас живого стола SC-04 для скринов (без бэкенда).
 * ?role=master|player · ?tab=notes|chat|wiki · ?feed=1 (мобильная лента)
 */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ManualRollForm } from '../features/lobby/ManualRollForm'
import { SessionEventFeed, type FeedFilter } from '../features/lobby/SessionEventFeed'
import { SessionLiveTabs, type SessionLiveTabId } from '../features/lobby/SessionLiveTabs'
import type { SessionEvent, SessionSeat } from '../shared/api/lobbies'
import { Button, Panel, Stack, Text } from '../ui'

const SEATS: SessionSeat[] = [
  {
    character_id: 'c1',
    character_name: 'Араин',
    character_level: 5,
    character_class_name: 'Следопыт',
    character_race_name: 'Эльф',
    hp_current: 38,
    hp_max: 44,
    ac: 16,
    conditions: [],
    effects: [],
    companions: [],
    seated_at: '2026-11-13T10:00:00Z',
  },
  {
    character_id: 'c2',
    character_name: 'Моррен',
    character_level: 5,
    character_class_name: 'Клирик',
    character_race_name: 'Дварф',
    hp_current: 40,
    hp_max: 40,
    ac: 18,
    conditions: [],
    effects: [],
    companions: [],
    seated_at: '2026-11-13T10:00:00Z',
  },
]

const EVENTS: SessionEvent[] = [
  {
    id: 'e1',
    session_id: 's1',
    event_type: 'roll',
    character_id: 'c1',
    actor_user_id: 'u1',
    character_name: 'Араин',
    title: 'Проверка Внимательности 🎲',
    formula: '1d20+5',
    breakdown: '14+5',
    total: 19,
    is_master_roll: false,
    payload: { physical_dice: true },
    created_at: new Date().toISOString(),
  },
  {
    id: 'e2',
    session_id: 's1',
    event_type: 'combat',
    character_id: null,
    actor_user_id: 'u-master',
    character_name: 'Мастер',
    title: 'Раунд 2',
    formula: null,
    breakdown: null,
    total: null,
    is_master_roll: true,
    payload: {},
    created_at: new Date(Date.now() - 60_000).toISOString(),
  },
]

export function Sc04LiveTablePreviewPage() {
  const [params] = useSearchParams()
  const role = params.get('role') === 'player' ? 'player' : 'master'
  const initialSide = (params.get('tab') as 'notes' | 'chat' | 'wiki') || 'notes'
  const openFeed = params.get('feed') === '1'
  const diceOn = params.get('dice') === '1'

  const [liveTab, setLiveTab] = useState<SessionLiveTabId>(openFeed ? 'feed' : 'table')
  const [sideTab, setSideTab] = useState<'notes' | 'chat' | 'wiki'>(
    initialSide === 'chat' || initialSide === 'wiki' ? initialSide : 'notes',
  )
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')
  const [noteDraft, setNoteDraft] = useState('Черновик заметки — не должен пропасть')
  const [events, setEvents] = useState(EVENTS)

  const ownIds = useMemo(() => new Set(['c1']), [])
  const centerClass =
    role === 'player' ? 'session-center--player-focus' : 'session-center--master-desk'

  return (
    <main className="page page--app page--lobby-hub" data-sc04-preview>
      <Stack gap={14}>
        <Text tone="muted">
          /dev/sc04-live-table-preview · {role === 'master' ? 'мастер' : 'игрок'} · SC-04
        </Text>
        <Panel title="Живой стол">
          <Stack gap={14}>
            <div className="session-live-tabs--mobile-only">
              <SessionLiveTabs active={liveTab} onChange={setLiveTab} />
            </div>

            <div className={`session-live-desk is-mobile-tab-${liveTab}`}>
              <div className="session-live-desk__rail session-live-desk__desktop-only">
                <div className="session-live-desk__rail-head">
                  <Text as="h3">Инициатива и лента</Text>
                </div>
                <Text tone="muted">Бой ещё не начат — очередь появится здесь.</Text>
                {role === 'master' ? (
                  <label className="manual-roll-form__check">
                    <input type="checkbox" checked={diceOn} readOnly />
                    Кубики на столе
                  </label>
                ) : null}
                <SessionEventFeed
                  events={events}
                  filter={feedFilter}
                  onFilterChange={setFeedFilter}
                />
                <ManualRollForm
                  seats={SEATS}
                  ownCharacterIds={ownIds}
                  isOwner={role === 'master'}
                  diceOnTable={diceOn}
                  onSubmit={(payload) => {
                    setEvents((prev) => [
                      {
                        id: `local-${Date.now()}`,
                        session_id: 's1',
                        event_type: 'roll',
                        character_id: payload.character_id ?? null,
                        actor_user_id: 'u1',
                        character_name: payload.character_id ? 'Араин' : 'Мастер',
                        title: payload.title,
                        formula: payload.formula ?? null,
                        breakdown: payload.breakdown ?? null,
                        total: payload.total,
                        is_master_roll: Boolean(payload.is_master_roll),
                        payload: { physical_dice: true },
                        created_at: new Date().toISOString(),
                      },
                      ...prev,
                    ])
                  }}
                />
              </div>

              <div className={`session-live-desk__center ${centerClass}`}>
                <Stack gap={12}>
                  {role === 'master' ? (
                    <div className="session-center-slot session-center-slot--toolbar session-table-toolbar">
                      <div className="session-toolbar-group" aria-label="Бой">
                        <Text className="session-toolbar-group__label">Бой</Text>
                        <Button type="button" variant="secondary">
                          Бой
                        </Button>
                        <Button type="button" variant="secondary">
                          + Враги
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <div className="session-center-slot session-center-slot--cards">
                    <div className="session-table-grid">
                      {SEATS.map((seat) => (
                        <div key={seat.character_id} className="session-table-card">
                          <Text as="h3" className="session-table-card__name">
                            {seat.character_name}
                          </Text>
                          <Text tone="muted">
                            {seat.character_class_name} {seat.character_level}
                          </Text>
                          <Text>
                            HP {seat.hp_current}/{seat.hp_max} · КД {seat.ac}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                </Stack>
              </div>

              <aside className="session-live-desk__side session-live-desk__desktop-only">
                <div className="session-live-desk__side-head">
                  <div className="session-live-desk__side-tabs" role="tablist" aria-label="Боковая панель">
                    {(
                      [
                        ['notes', 'Заметки'],
                        ['chat', 'Чат'],
                        ['wiki', 'Вики'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={sideTab === id}
                        className={`session-live-desk__side-tab${sideTab === id ? ' is-on' : ''}`}
                        onClick={() => setSideTab(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="session-live-desk__side-body">
                  <div className="session-side-pane" hidden={sideTab !== 'notes'}>
                    <Stack gap={8}>
                      <Text as="h3">Быстрая заметка</Text>
                      <textarea
                        className="ui-input"
                        rows={5}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                      />
                    </Stack>
                  </div>
                  <div className="session-side-pane" hidden={sideTab !== 'chat'}>
                    <Text>Чат партии — один клик с вкладки.</Text>
                  </div>
                  <div className="session-side-pane" hidden={sideTab !== 'wiki'}>
                    <Text tone="muted">Вики сеттинга (компакт).</Text>
                  </div>
                </div>
              </aside>
            </div>

            <div className="session-live-desk__mobile-only session-live-mobile-panel">
              {liveTab === 'feed' ? (
                <Stack gap={14}>
                  <SessionEventFeed
                    events={events}
                    filter={feedFilter}
                    onFilterChange={setFeedFilter}
                  />
                  <ManualRollForm
                    seats={SEATS}
                    ownCharacterIds={ownIds}
                    isOwner={role === 'master'}
                    diceOnTable={diceOn}
                    onSubmit={() => undefined}
                  />
                </Stack>
              ) : null}
              {liveTab === 'more' ? (
                <Stack gap={12}>
                  <div className="session-live-desk__side-tabs" role="tablist">
                    {(
                      [
                        ['notes', 'Заметки'],
                        ['chat', 'Чат'],
                        ['wiki', 'Вики'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        className={`session-live-desk__side-tab${sideTab === id ? ' is-on' : ''}`}
                        onClick={() => setSideTab(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {sideTab === 'notes' ? <Text>Заметки (мобильные)</Text> : null}
                  {sideTab === 'chat' ? <Text>Чат (мобильные)</Text> : null}
                  {sideTab === 'wiki' ? <Text>Вики (мобильные)</Text> : null}
                </Stack>
              ) : null}
              {liveTab === 'table' ? (
                <div className="session-table-grid">
                  {SEATS.map((seat) => (
                    <div key={seat.character_id} className="session-table-card">
                      <Text as="h3" className="session-table-card__name">
                        {seat.character_name}
                      </Text>
                      <Text tone="muted">
                        {seat.character_class_name} {seat.character_level}
                      </Text>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Stack>
        </Panel>
      </Stack>
    </main>
  )
}
