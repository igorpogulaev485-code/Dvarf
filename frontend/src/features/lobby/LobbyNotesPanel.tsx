import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiRequestError } from '../../shared/api/client'
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
  type Note,
  type NoteScope,
} from '../../shared/api/notes'
import { Button, Field, Input, Panel, Stack, Text } from '../../ui'
import { useLobbyRealtime } from './useLobbyRealtime'

type Props = {
  lobbyId: string
  isOwner: boolean
  ownCharacterOptions: Array<{ id: string; name: string }>
  onToast?: (message: string) => void
  onError?: (message: string) => void
  /** Компактный режим: быстрая заметка на сессии */
  compact?: boolean
  defaultScope?: NoteScope
}

function scopeLabel(scope: string): string {
  if (scope === 'party') return 'Общая доска'
  if (scope === 'master') return 'Мастер'
  return 'Личное'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function LobbyNotesPanel({
  lobbyId,
  isOwner,
  ownCharacterOptions,
  onToast,
  onError,
  compact = false,
  defaultScope = 'party',
}: Props) {
  const [filter, setFilter] = useState<NoteScope | 'all'>(compact ? defaultScope : 'all')
  const [notes, setNotes] = useState<Note[]>([])
  const [busy, setBusy] = useState(false)
  const [composing, setComposing] = useState(compact)
  const [scope, setScope] = useState<NoteScope>(defaultScope)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const visibleScopes = useMemo(() => {
    const base: NoteScope[] = ['personal', 'party']
    if (isOwner) base.push('master')
    return base
  }, [isOwner])

  const reload = useCallback(async () => {
    const scopeParam = filter === 'all' ? undefined : filter
    const list = await listNotes(lobbyId, scopeParam)
    setNotes(list)
  }, [lobbyId, filter])

  useEffect(() => {
    let active = true
    reload().catch((err: unknown) => {
      if (!active) return
      onError?.(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить заметки')
    })
    return () => {
      active = false
    }
  }, [reload, onError])

  useLobbyRealtime(lobbyId, (data) => {
    if (data.type === 'note_upsert') {
      const note = data.note as Note
      setNotes((prev) => {
        const without = prev.filter((n) => n.id !== note.id)
        if (filter !== 'all' && note.scope !== filter) return without
        if (!isOwner && note.scope === 'master') return without
        if (
          !isOwner &&
          note.scope === 'personal' &&
          !ownCharacterOptions.some((c) => c.id === note.character_id)
        ) {
          return without
        }
        return [note, ...without].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
      })
    }
    if (data.type === 'note_delete' && typeof data.note_id === 'string') {
      setNotes((prev) => prev.filter((n) => n.id !== data.note_id))
    }
  })

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (err) {
      onError?.(err instanceof ApiRequestError ? err.message : 'Ошибка заметок')
    } finally {
      setBusy(false)
    }
  }

  const filtered = notes

  return (
    <Panel title={compact ? 'Быстрая заметка' : 'Заметки'}>
      <Stack gap={12}>
        {!compact ? (
          <Text tone="muted">
            Личный блокнот, общая доска пати
            {isOwner ? ' и мастерские заметки (мастер видит и чужие личные)' : ''}.
          </Text>
        ) : (
          <Text tone="muted">Запишите мысль, не уходя со стола.</Text>
        )}

        {!compact ? (
          <div className="chat-mode-tabs">
            <button
              type="button"
              className={`session-live-tab${filter === 'all' ? ' is-active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Все
            </button>
            {visibleScopes.map((s) => (
              <button
                key={s}
                type="button"
                className={`session-live-tab${filter === s ? ' is-active' : ''}`}
                onClick={() => setFilter(s)}
              >
                {scopeLabel(s)}
              </button>
            ))}
          </div>
        ) : null}

        {composing ? (
          <form
            className="notes-composer"
            onSubmit={(e) => {
              e.preventDefault()
              void run(async () => {
                if (editingId) {
                  const updated = await updateNote(editingId, { title, body })
                  setNotes((prev) =>
                    prev
                      .map((n) => (n.id === updated.id ? updated : n))
                      .sort(
                        (a, b) =>
                          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
                      ),
                  )
                  setEditingId(null)
                  onToast?.('Заметка обновлена')
                } else {
                  const created = await createNote(lobbyId, {
                    scope,
                    title,
                    body,
                    character_id: ownCharacterOptions[0]?.id,
                  })
                  setNotes((prev) => [created, ...prev.filter((n) => n.id !== created.id)])
                  onToast?.('Заметка сохранена')
                }
                setTitle('')
                setBody('')
                if (!compact) setComposing(false)
              })
            }}
          >
            <Stack gap={10}>
              {!editingId ? (
                <Field label="Куда">
                  <select
                    className="ui-input"
                    value={scope}
                    disabled={busy}
                    onChange={(e) => setScope(e.target.value as NoteScope)}
                  >
                    {visibleScopes.map((s) => (
                      <option key={s} value={s}>
                        {scopeLabel(s)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Заголовок">
                <Input
                  value={title}
                  disabled={busy}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Опционально"
                />
              </Field>
              <Field label="Текст">
                <textarea
                  className="ui-input ui-textarea"
                  rows={compact ? 3 : 4}
                  value={body}
                  disabled={busy}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Что запомнить…"
                />
              </Field>
              <div className="chat-inline-actions">
                <Button type="submit" disabled={busy || (!title.trim() && !body.trim())}>
                  {busy ? 'Сохраняем…' : editingId ? 'Сохранить' : 'Добавить'}
                </Button>
                {!compact || editingId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setComposing(false)
                      setEditingId(null)
                      setTitle('')
                      setBody('')
                    }}
                  >
                    Отмена
                  </Button>
                ) : null}
              </div>
            </Stack>
          </form>
        ) : (
          <Button type="button" onClick={() => setComposing(true)} disabled={busy}>
            Новая заметка
          </Button>
        )}

        {filtered.length === 0 ? (
          <Text tone="muted">Пока пусто.</Text>
        ) : (
          <ul className="notes-feed">
            {filtered.map((note) => (
              <li key={note.id} className={`notes-item notes-item--${note.scope}`}>
                <div className="notes-item__meta">
                  <span className="notes-item__scope">{scopeLabel(note.scope)}</span>
                  <Text tone="muted" className="notes-item__date">
                    {formatDate(note.updated_at)}
                  </Text>
                </div>
                {note.title ? (
                  <Text as="h3" className="notes-item__title">
                    {note.title}
                  </Text>
                ) : null}
                {note.scope === 'personal' && note.character_name ? (
                  <Text tone="muted" className="notes-item__who">
                    {note.character_name}
                  </Text>
                ) : null}
                {note.body.trim() ? (
                  <Text className="notes-item__body">{note.body}</Text>
                ) : null}
                {note.can_edit ? (
                  <div className="chat-inline-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(note.id)
                        setScope(note.scope as NoteScope)
                        setTitle(note.title)
                        setBody(note.body)
                        setComposing(true)
                      }}
                    >
                      Править
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await deleteNote(note.id)
                          setNotes((prev) => prev.filter((n) => n.id !== note.id))
                          onToast?.('Заметка удалена')
                        })
                      }
                    >
                      Удалить
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Stack>
    </Panel>
  )
}
