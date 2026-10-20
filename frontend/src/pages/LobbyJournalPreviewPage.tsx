/**
 * Превью A4/T5: дневник мастера + «Открыть за столом».
 * /dev/lobby-journal-preview
 */
import { useMemo, useState } from 'react'
import { JournalComposer } from '../features/lobby/JournalComposer'
import { JournalEntryCard } from '../features/lobby/JournalEntryCard'
import { LobbyHubTabs, type LobbyHubTabId } from '../features/lobby/LobbyHubTabs'
import type { JournalEntry, SessionSummary, SettingSummary } from '../shared/api/lobbies'
import { Button, Panel, Stack, Text, Toast } from '../ui'

const DEMO_SETTINGS: SettingSummary[] = [
  {
    id: 'set1',
    lobby_id: 'lob1',
    name: 'Серые Болота',
    world_notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const now = Date.now()

/** Открытая сессия того же сеттинга — для T5 «Открыть за столом» */
const DEMO_SESSIONS: SessionSummary[] = [
  {
    id: 's-open',
    lobby_id: 'lob1',
    setting_id: 'set1',
    setting_name: 'Серые Болота',
    name: 'Глава 4 — Туннель',
    seat_count: 3,
    closed_at: null,
    created_at: new Date(now - 7200000).toISOString(),
    updated_at: new Date(now - 600000).toISOString(),
  },
  {
    id: 's1',
    lobby_id: 'lob1',
    setting_id: 'set1',
    setting_name: 'Серые Болота',
    name: 'Глава 3 — Мост',
    seat_count: 3,
    closed_at: new Date(now - 3600000).toISOString(),
    created_at: new Date(now - 86400000).toISOString(),
    updated_at: new Date(now - 3600000).toISOString(),
  },
]

const SEED: JournalEntry[] = [
  {
    id: 'j1',
    lobby_id: 'lob1',
    author_user_id: 'u0',
    entry_type: 'session_summary',
    title: 'Итог: Глава 3 — Мост',
    body: 'Партия удержала мост. Грок упал, но Вирра подняла его. Лира нашла тайный ход под опорами.',
    image_url: null,
    setting_id: null,
    setting_name: null,
    page_id: null,
    page_title: null,
    from_session_id: 's1',
    from_session_name: 'Глава 3 — Мост',
    created_at: new Date(now - 3600000).toISOString(),
    updated_at: new Date(now - 3600000).toISOString(),
  },
  {
    id: 'j-quest',
    lobby_id: 'lob1',
    author_user_id: 'u0',
    entry_type: 'quest_status',
    title: 'Квест закрыт: Найти Лиру',
    body: 'Статус: выполнено. Лира выведена из шахт.',
    image_url: null,
    setting_id: 'set1',
    setting_name: 'Серые Болота',
    page_id: 'page-quest-lira',
    page_title: 'Найти Лиру',
    from_session_id: 's-open',
    from_session_name: 'Глава 4 — Туннель',
    created_at: new Date(now - 1800000).toISOString(),
    updated_at: new Date(now - 1800000).toISOString(),
  },
  {
    id: 'j2',
    lobby_id: 'lob1',
    author_user_id: 'u0',
    entry_type: 'chapter',
    title: 'Глава 4 — Туннель',
    body: 'Следующая сцена: спуск в старые шахты гномов. Влажно, эхо, следы культа.',
    image_url: null,
    setting_id: null,
    setting_name: null,
    page_id: null,
    page_title: null,
    from_session_id: null,
    from_session_name: null,
    created_at: new Date(now - 7200000).toISOString(),
    updated_at: new Date(now - 7200000).toISOString(),
  },
  {
    id: 'j3',
    lobby_id: 'lob1',
    author_user_id: 'u0',
    entry_type: 'setting_link',
    title: '',
    body: 'Карта болот и ключевые NPC.',
    image_url: null,
    setting_id: 'set1',
    setting_name: 'Серые Болота',
    page_id: 'page-swamp',
    page_title: 'Карта болот',
    from_session_id: null,
    from_session_name: null,
    created_at: new Date(now - 86400000).toISOString(),
    updated_at: new Date(now - 86400000).toISOString(),
  },
  {
    id: 'j4',
    lobby_id: 'lob1',
    author_user_id: 'u0',
    entry_type: 'text',
    title: 'Заметка мастера',
    body: 'Не открывать культ раньше главы 5. Торин может узнать символ на стенах.',
    image_url: null,
    setting_id: null,
    setting_name: null,
    page_id: null,
    page_title: null,
    from_session_id: null,
    from_session_name: null,
    created_at: new Date(now - 172800000).toISOString(),
    updated_at: new Date(now - 172800000).toISOString(),
  },
]

export function LobbyJournalPreviewPage() {
  const [tab, setTab] = useState<LobbyHubTabId>('journal')
  const [items, setItems] = useState(SEED)
  const [composerOpen, setComposerOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [items],
  )

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <header className="app-header">
          <div>
            <Text as="h1">Эхо Рассвета</Text>
            <Text tone="muted">Превью A4/T5 · дневник → стол</Text>
          </div>
        </header>

        <Text tone="muted">/dev/lobby-journal-preview · только для скринов</Text>

        <LobbyHubTabs active={tab} onChange={setTab} />

        {tab === 'journal' ? (
          <Panel title="Дневник">
            <Stack gap={14}>
              <Text tone="muted">
                Инструмент мастера: посты, главы и итоги закрытых сессий.
              </Text>

              {composerOpen ? (
                <JournalComposer
                  settings={DEMO_SETTINGS}
                  onSubmit={(payload) => {
                    const next: JournalEntry = {
                      id: `local-${Date.now()}`,
                      lobby_id: 'lob1',
                      author_user_id: 'u0',
                      entry_type: payload.entry_type,
                      title: payload.title,
                      body: payload.body,
                      image_url: payload.image_url ?? null,
                      setting_id: payload.setting_id ?? null,
                      setting_name:
                        payload.setting_id === 'set1' ? 'Серые Болота' : null,
                      page_id: payload.page_id ?? null,
                      page_title:
                        payload.page_id === 'page-swamp' ? 'Карта болот' : null,
                      from_session_id: null,
                      from_session_name: null,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    }
                    setItems((prev) => [next, ...prev])
                    setComposerOpen(false)
                    setToast('Пост опубликован')
                  }}
                />
              ) : (
                <Button type="button" onClick={() => setComposerOpen(true)}>
                  Новый пост
                </Button>
              )}

              <ul className="journal-feed">
                {sorted.map((entry) => (
                  <li key={entry.id}>
                    <JournalEntryCard
                      entry={entry}
                      isOwner
                      sessions={DEMO_SESSIONS}
                      onDelete={(id) => {
                        setItems((prev) => prev.filter((e) => e.id !== id))
                        setToast('Пост удалён')
                      }}
                    />
                  </li>
                ))}
              </ul>
            </Stack>
          </Panel>
        ) : (
          <Panel title={tab}>
            <Text tone="muted">В превью открыт только дневник.</Text>
          </Panel>
        )}
      </Stack>

      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
