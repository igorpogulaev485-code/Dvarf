import { useCallback, useEffect, useState } from 'react'
import {
  listAdminFeedback,
  patchAdminFeedback,
  type AdminFeedbackItem,
  type FeedbackStatus,
  type FeedbackTopic,
} from '../../shared/api/feedback'
import { ApiRequestError } from '../../shared/api/client'
import {
  Button,
  Chip,
  ChipStack,
  EmptyState,
  Field,
  Panel,
  Select,
  Stack,
  Text,
  Textarea,
} from '../../ui'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Все статусы' },
  { value: 'new', label: 'Новое' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'closed', label: 'Закрыто' },
  { value: 'not_bug', label: 'Не ошибка' },
]

const TOPIC_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Все темы' },
  { value: 'bug', label: 'Ошибка' },
  { value: 'question', label: 'Вопрос' },
  { value: 'idea', label: 'Идея' },
  { value: 'name', label: 'Название в справочнике' },
]

const STATUS_ACTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: 'new', label: 'Новое' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'closed', label: 'Закрыто' },
  { value: 'not_bug', label: 'Не ошибка' },
]

function formatEkaterinburg(value: string): string {
  try {
    return new Date(value).toLocaleString('ru-RU', {
      timeZone: 'Asia/Yekaterinburg',
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

type Props = {
  onToast: (message: string) => void
  onOpenHelp: (userId: string) => void
  initialUserId?: string | null
}

export function AdminFeedbackSection({ onToast, onOpenHelp, initialUserId }: Props) {
  const [status, setStatus] = useState('')
  const [topic, setTopic] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AdminFeedbackItem[]>([])
  const [total, setTotal] = useState(0)
  const [newCount, setNewCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listAdminFeedback({
        status: status || undefined,
        topic: (topic as FeedbackTopic) || undefined,
        page,
        page_size: 20,
      })
      setItems(data.items)
      setTotal(data.total)
      setNewCount(data.new_count)
      setNoteDrafts((prev) => {
        const next = { ...prev }
        for (const item of data.items) {
          if (next[item.id] === undefined) {
            next[item.id] = item.admin_note || ''
          }
        }
        return next
      })
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Не удалось загрузить сообщения'
      onToast(message)
    } finally {
      setLoading(false)
    }
  }, [status, topic, page, onToast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!initialUserId || items.length === 0) return
    const match = items.find((item) => item.author?.id === initialUserId)
    if (match) setExpandedId(match.id)
  }, [initialUserId, items])

  async function changeStatus(item: AdminFeedbackItem, next: FeedbackStatus) {
    if (item.status === next) return
    setBusyId(item.id)
    try {
      const updated = await patchAdminFeedback(item.id, { status: next })
      setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
      onToast('Статус обновлён')
      void load()
    } catch (err) {
      onToast(err instanceof ApiRequestError ? err.message : 'Не удалось сменить статус')
    } finally {
      setBusyId(null)
    }
  }

  async function saveNote(item: AdminFeedbackItem) {
    setBusyId(item.id)
    try {
      const note = (noteDrafts[item.id] || '').trim()
      const updated = await patchAdminFeedback(item.id, {
        admin_note: note || null,
      })
      setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
      setNoteDrafts((prev) => ({ ...prev, [item.id]: updated.admin_note || '' }))
      onToast('Заметка сохранена')
    } catch (err) {
      onToast(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить заметку')
    } finally {
      setBusyId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <Panel
      title="Обратная связь"
      titleAside={
        <ChipStack>
          <Chip>Новых: {newCount}</Chip>
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            Обновить
          </Button>
        </ChipStack>
      }
    >
      <Stack gap={16}>
        <Stack gap={8}>
          <Field label="Статус">
            <Select
              aria-label="Фильтр по статусу"
              value={status}
              onChange={(e) => {
                setPage(1)
                setStatus(e.target.value)
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all-status'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Тема">
            <Select
              aria-label="Фильтр по теме"
              value={topic}
              onChange={(e) => {
                setPage(1)
                setTopic(e.target.value)
              }}
            >
              {TOPIC_OPTIONS.map((opt) => (
                <option key={opt.value || 'all-topic'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
        </Stack>

        {loading ? <Text tone="muted">Загружаем очередь…</Text> : null}

        {!loading && items.length === 0 ? (
          <EmptyState title="Пока пусто" description="Сообщений с такими фильтрами нет" />
        ) : null}

        <Stack gap={12}>
          {items.map((item) => {
            const open = expandedId === item.id
            const busy = busyId === item.id
            return (
              <Panel
                key={item.id}
                title={`${item.topic_label} · ${item.status_label}`}
                titleAside={
                  <Button
                    variant="ghost"
                    onClick={() => setExpandedId(open ? null : item.id)}
                  >
                    {open ? 'Свернуть' : 'Открыть'}
                  </Button>
                }
              >
                <Stack gap={8}>
                  <Text tone="muted">
                    {formatEkaterinburg(item.created_at)} · Екатеринбург (UTC+5)
                  </Text>
                  <Text>{item.body}</Text>
                  {!open ? null : (
                    <Stack gap={12}>
                      {item.is_anonymous || !item.author ? (
                        <Text tone="muted">Автор скрыт (анонимно)</Text>
                      ) : (
                        <Stack gap={6}>
                          <Text>
                            Автор:{' '}
                            {item.author.display_name || item.author.email || 'без имени'}
                            {item.author.email ? ` · ${item.author.email}` : ''}
                          </Text>
                          <div>
                            <Button
                              variant="secondary"
                              onClick={() => onOpenHelp(item.author!.id)}
                            >
                              Перейти к аккаунту
                            </Button>
                          </div>
                        </Stack>
                      )}
                      {item.character_name || item.lobby_name || item.page_path ? (
                        <Text tone="muted">
                          {[
                            item.character_name ? `Персонаж: ${item.character_name}` : null,
                            item.lobby_name ? `Лобби: ${item.lobby_name}` : null,
                            item.page_path ? `Страница: ${item.page_path}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      ) : null}
                      <Field label="Статус">
                        <Select
                          aria-label="Сменить статус"
                          value={item.status}
                          disabled={busy}
                          onChange={(e) => {
                            void changeStatus(item, e.target.value as FeedbackStatus)
                          }}
                        >
                          {STATUS_ACTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Внутренняя заметка">
                        <Textarea
                          value={noteDrafts[item.id] ?? item.admin_note ?? ''}
                          maxLength={4000}
                          rows={3}
                          disabled={busy}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <div>
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => {
                            void saveNote(item)
                          }}
                        >
                          Сохранить заметку
                        </Button>
                      </div>
                    </Stack>
                  )}
                </Stack>
              </Panel>
            )
          })}
        </Stack>

        {totalPages > 1 ? (
          <Stack gap={8}>
            <Text tone="muted">
              Страница {page} из {totalPages} · всего {total}
            </Text>
            <ChipStack>
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </Button>
            </ChipStack>
          </Stack>
        ) : null}
      </Stack>
    </Panel>
  )
}
