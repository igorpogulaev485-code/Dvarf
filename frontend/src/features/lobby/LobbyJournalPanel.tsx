import { useCallback, useEffect, useState } from 'react'
import {
  createJournalEntry,
  deleteJournalEntry,
  listJournal,
  type JournalEntry,
  type SessionSummary,
  type SettingSummary,
} from '../../shared/api/lobbies'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Panel, Stack, Text } from '../../ui'
import { JournalComposer } from './JournalComposer'
import { JournalEntryCard } from './JournalEntryCard'

type Props = {
  lobbyId: string
  isOwner: boolean
  settings: SettingSummary[]
  /** Сессии лобби — для T5 «Открыть за столом» */
  sessions?: SessionSummary[]
  onToast?: (message: string) => void
  onError?: (message: string) => void
}

const PAGE_SIZE = 10

export function LobbyJournalPanel({
  lobbyId,
  isOwner,
  settings,
  sessions = [],
  onToast,
  onError,
}: Props) {
  const [items, setItems] = useState<JournalEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)

  const load = useCallback(
    async (offset = 0, append = false) => {
      const page = await listJournal(lobbyId, { offset, limit: PAGE_SIZE })
      setTotal(page.total)
      setItems((prev) => (append ? [...prev, ...page.items] : page.items))
    },
    [lobbyId],
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    load(0, false)
      .catch((err: unknown) => {
        if (!active) return
        onError?.(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить дневник')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [load, onError])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (err) {
      onError?.(err instanceof ApiRequestError ? err.message : 'Ошибка дневника')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Дневник">
      <Stack gap={14}>
        <Text tone="muted">
          {isOwner
            ? 'Инструмент мастера: посты, главы и итоги закрытых сессий.'
            : 'Дневник кампании — читают все участники лобби.'}
        </Text>

        {isOwner ? (
          composerOpen ? (
            <JournalComposer
              settings={settings}
              busy={busy}
              onSubmit={async (payload) => {
                await run(async () => {
                  const created = await createJournalEntry(lobbyId, payload)
                  setItems((prev) => [created, ...prev])
                  setTotal((t) => t + 1)
                  setComposerOpen(false)
                  onToast?.('Пост опубликован')
                })
              }}
            />
          ) : (
            <Button type="button" onClick={() => setComposerOpen(true)} disabled={busy}>
              Новый пост
            </Button>
          )
        ) : null}

        {loading ? (
          <Text tone="muted">Загрузка…</Text>
        ) : items.length === 0 ? (
          <Text tone="muted">
            {isOwner
              ? 'Пока пусто. Опубликуйте пост или закройте сессию с итогом.'
              : 'Мастер ещё ничего не записал.'}
          </Text>
        ) : (
          <ul className="journal-feed">
            {items.map((entry) => (
              <li key={entry.id}>
                <JournalEntryCard
                  entry={entry}
                  isOwner={isOwner}
                  busy={busy}
                  sessions={sessions}
                  onDelete={(id) => {
                    void run(async () => {
                      await deleteJournalEntry(id)
                      setItems((prev) => prev.filter((e) => e.id !== id))
                      setTotal((t) => Math.max(0, t - 1))
                      onToast?.('Пост удалён')
                    })
                  }}
                />
              </li>
            ))}
          </ul>
        )}

        {items.length < total ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy || loading}
            onClick={() => {
              void run(async () => {
                await load(items.length, true)
              })
            }}
          >
            Ещё ({items.length} из {total})
          </Button>
        ) : null}
      </Stack>
    </Panel>
  )
}
