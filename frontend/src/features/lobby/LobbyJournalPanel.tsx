import { useCallback, useEffect, useState } from 'react'
import {
  createJournalEntry,
  deleteJournalEntry,
  listJournal,
  updateJournalEntry,
  type JournalChapterRef,
  type JournalEntry,
  type LobbyMediaUsage,
  type SessionSummary,
  type SettingSummary,
} from '../../shared/api/lobbies'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Field, Input, Panel, Stack, Text } from '../../ui'
import { JournalComposer } from './JournalComposer'
import { JournalEntryCard } from './JournalEntryCard'
import { useLobbyRealtime } from './useLobbyRealtime'

type Props = {
  lobbyId: string
  isOwner: boolean
  settings: SettingSummary[]
  /** Сессии лобби — для T5 «Открыть за столом» */
  sessions?: SessionSummary[]
  mediaUsage?: LobbyMediaUsage | null
  onMediaUsageChange?: (next: LobbyMediaUsage) => void
  onPublishedAt?: (iso: string | null) => void
  onToast?: (message: string) => void
  onError?: (message: string) => void
}

const PAGE_SIZE = 20

export function LobbyJournalPanel({
  lobbyId,
  isOwner,
  settings,
  sessions = [],
  mediaUsage = null,
  onMediaUsageChange,
  onPublishedAt,
  onToast,
  onError,
}: Props) {
  const [items, setItems] = useState<JournalEntry[]>([])
  const [chapters, setChapters] = useState<JournalChapterRef[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [chapterFilter, setChapterFilter] = useState('')

  const load = useCallback(
    async (offset = 0, append = false) => {
      const page = await listJournal(lobbyId, {
        offset,
        limit: PAGE_SIZE,
        q: searchApplied || undefined,
        chapterId: chapterFilter || null,
      })
      setTotal(page.total)
      setChapters(page.chapters ?? [])
      setItems((prev) => (append ? [...prev, ...page.items] : page.items))
      onPublishedAt?.(page.last_journal_published_at ?? null)
    },
    [lobbyId, searchApplied, chapterFilter, onPublishedAt],
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

  useLobbyRealtime(lobbyId, (data) => {
    if (data.type === 'journal_changed') {
      void load(0, false).catch(() => undefined)
    }
  })

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

  function replaceEntry(next: JournalEntry) {
    setItems((prev) => prev.map((e) => (e.id === next.id ? next : e)))
  }

  return (
    <Panel title="Дневник">
      <Stack gap={14}>
        <Text tone="muted">
          {isOwner
            ? 'Инструмент мастера: посты, главы и итоги закрытых сессий. Черновики видите только вы.'
            : 'Дневник кампании — читают все участники лобби.'}
        </Text>

        {chapters.length > 0 ? (
          <nav className="journal-toc" aria-label="Оглавление">
            <Text as="h3" className="journal-toc__heading">
              Оглавление
            </Text>
            <ul className="journal-toc__list">
              {chapters.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="journal-toc__link"
                    onClick={() => {
                      setChapterFilter(c.id)
                      setSearchApplied('')
                      setSearch('')
                      const el = document.getElementById(`journal-entry-${c.id}`)
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                  >
                    {c.title || 'Без названия'}
                  </button>
                </li>
              ))}
            </ul>
            {chapterFilter ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setChapterFilter('')}
              >
                Показать все главы
              </Button>
            ) : null}
          </nav>
        ) : null}

        <form
          className="journal-search"
          onSubmit={(e) => {
            e.preventDefault()
            setSearchApplied(search.trim())
          }}
        >
          <Field label="Поиск">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Заголовок или текст…"
            />
          </Field>
          <Button type="submit" variant="secondary" disabled={busy || loading}>
            Найти
          </Button>
        </form>

        {isOwner ? (
          composerOpen ? (
            <JournalComposer
              lobbyId={lobbyId}
              settings={settings}
              chapters={chapters}
              busy={busy}
              mediaUsage={mediaUsage}
              onMediaUsageChange={onMediaUsageChange}
              onSubmit={async (payload) => {
                await run(async () => {
                  const created = await createJournalEntry(lobbyId, payload)
                  setItems((prev) => [created, ...prev])
                  setTotal((t) => t + 1)
                  if (created.entry_type === 'chapter' && !created.is_draft) {
                    setChapters((prev) => [...prev, { id: created.id, title: created.title }])
                  }
                  setComposerOpen(false)
                  onToast?.(created.is_draft ? 'Черновик сохранён' : 'Пост опубликован')
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
                  onPublish={(id) => {
                    void run(async () => {
                      const next = await updateJournalEntry(id, { is_draft: false })
                      replaceEntry(next)
                      onToast?.('Пост опубликован')
                    })
                  }}
                  onUnpublish={(id) => {
                    void run(async () => {
                      const next = await updateJournalEntry(id, { is_draft: true })
                      replaceEntry(next)
                      onToast?.('Снято с публикации')
                    })
                  }}
                  onRevealHidden={(id) => {
                    void run(async () => {
                      const next = await updateJournalEntry(id, { reveal_hidden: true })
                      replaceEntry(next)
                      onToast?.('Скрытый текст раскрыт')
                    })
                  }}
                  onDelete={(id) => {
                    void run(async () => {
                      await deleteJournalEntry(id)
                      setItems((prev) => prev.filter((e) => e.id !== id))
                      setChapters((prev) => prev.filter((c) => c.id !== id))
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
