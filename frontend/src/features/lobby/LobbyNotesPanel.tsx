import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiRequestError } from '../../shared/api/client'
import {
  createNote,
  deleteNote,
  exportNotes,
  listNotes,
  updateNote,
  type Note,
  type NoteScope,
} from '../../shared/api/notes'
import {
  getSetting,
  type SettingPage,
} from '../../shared/api/lobbies'
import { Button, Dialog, Field, Input, Panel, Stack, Text } from '../../ui'
import { downloadTextFile } from './joinConflict'
import { segmentNoteBody, toggleTaskAtLine } from './noteBody'
import { SettingMentionBody } from './SettingMentionBody'
import { useLobbyRealtime } from './useLobbyRealtime'

type Props = {
  lobbyId: string
  /** Владелец / сомастер (дневник, мастерский блокнот, чужие открытые личные). */
  canManageJournal?: boolean
  /** @deprecated используй canManageJournal; оставлен для превью/совместимости */
  isOwner?: boolean
  ownCharacterOptions: Array<{ id: string; name: string }>
  settingId?: string | null
  onToast?: (message: string) => void
  onError?: (message: string) => void
  /** Компактный режим: быстрая заметка на сессии */
  compact?: boolean
  defaultScope?: NoteScope
  /** L-06: крючок «В дневник» */
  onSendToJournal?: (note: Note) => void
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
  canManageJournal: canManageJournalProp,
  isOwner,
  ownCharacterOptions,
  settingId = null,
  onToast,
  onError,
  compact = false,
  defaultScope = 'party',
  onSendToJournal,
}: Props) {
  const canManageJournal = Boolean(canManageJournalProp ?? isOwner)
  const [filter, setFilter] = useState<NoteScope | 'all'>(compact ? defaultScope : 'all')
  const [search, setSearch] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [busy, setBusy] = useState(false)
  const [composing, setComposing] = useState(compact)
  const [scope, setScope] = useState<NoteScope>(defaultScope)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingUpdatedAt, setEditingUpdatedAt] = useState<string | null>(null)
  const [conflictNote, setConflictNote] = useState<Note | null>(null)
  const [wikiPages, setWikiPages] = useState<SettingPage[]>([])
  const [openPageId, setOpenPageId] = useState<string | null>(null)

  const visibleScopes = useMemo(() => {
    const base: NoteScope[] = ['personal', 'party']
    if (canManageJournal) base.push('master')
    return base
  }, [canManageJournal])

  const reload = useCallback(async () => {
    const scopeParam = filter === 'all' ? undefined : filter
    const list = await listNotes(lobbyId, scopeParam)
    setNotes(list)
  }, [lobbyId, filter])

  const notesFlight = useRef<Promise<void> | null>(null)
  const notesAgain = useRef(false)
  const pullNotes = useCallback(() => {
    if (notesFlight.current) {
      notesAgain.current = true
      return
    }
    const run = () => {
      const task = reload()
        .catch(() => undefined)
        .finally(() => {
          notesFlight.current = null
          if (notesAgain.current) {
            notesAgain.current = false
            run()
          }
        })
      notesFlight.current = task
    }
    run()
  }, [reload])

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

  useEffect(() => {
    if (!settingId) {
      setWikiPages([])
      return
    }
    let active = true
    getSetting(settingId)
      .then((detail) => {
        if (!active) return
        setWikiPages(detail.pages ?? [])
      })
      .catch(() => {
        if (!active) return
        setWikiPages([])
      })
    return () => {
      active = false
    }
  }, [settingId])

  useLobbyRealtime(
    lobbyId,
    (data) => {
      // Тело заметки с сокета не берём: личные и мастерские видны только после своего GET.
      if (
        data.type === 'notes_changed' ||
        data.type === 'note_upsert' ||
        data.type === 'note_delete' ||
        data.type === 'lobby_resync'
      ) {
        pullNotes()
      }
    },
    () => {
      pullNotes()
    },
  )

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.body || '').toLowerCase().includes(q),
    )
  }, [notes, search])

  const openWikiPage = wikiPages.find((p) => p.id === openPageId) ?? null

  function replaceNote(updated: Note) {
    setNotes((prev) =>
      prev
        .map((n) => (n.id === updated.id ? updated : n))
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        }),
    )
  }

  async function saveEdit() {
    if (!editingId || !editingUpdatedAt) return
    try {
      const updated = await updateNote(editingId, {
        title,
        body,
        updated_at: editingUpdatedAt,
      })
      replaceNote(updated)
      setEditingId(null)
      setEditingUpdatedAt(null)
      setTitle('')
      setBody('')
      if (!compact) setComposing(false)
      onToast?.('Заметка обновлена')
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        const fresh = notes.find((n) => n.id === editingId) ?? null
        // подтянуть свежий список и показать диалог
        const list = await listNotes(lobbyId)
        setNotes(list)
        const serverNote = list.find((n) => n.id === editingId) ?? fresh
        if (serverNote) setConflictNote(serverNote)
        return
      }
      throw err
    }
  }

  return (
    <Panel title={compact ? 'Быстрая заметка' : 'Заметки'}>
      <Stack gap={12}>
        {!compact ? (
          <Text tone="muted">
            Личный блокнот и общая доска пати
            {canManageJournal ? '; мастерский блокнот видят владелец и сомастер' : ''}. Личные заметки
            скрыты от мастера, пока не нажмёте «Показать мастеру».
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

        {!compact ? (
          <div className="notes-toolbar">
            <Field label="Поиск">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="По заголовку и тексту…"
                disabled={busy}
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const file = await exportNotes(lobbyId)
                  downloadTextFile(file.filename, file.content)
                  onToast?.('Заметки скачаны')
                })
              }
            >
              Скачать заметки
            </Button>
          </div>
        ) : null}

        {composing ? (
          <form
            className="notes-composer"
            onSubmit={(e) => {
              e.preventDefault()
              void run(async () => {
                if (editingId) {
                  await saveEdit()
                } else {
                  const created = await createNote(lobbyId, {
                    scope,
                    title,
                    body,
                    character_id: ownCharacterOptions[0]?.id,
                  })
                  setNotes((prev) => [created, ...prev.filter((n) => n.id !== created.id)])
                  onToast?.('Заметка сохранена')
                  setTitle('')
                  setBody('')
                  if (!compact) setComposing(false)
                }
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
                  placeholder="Что запомнить…  - [ ] задача  [[Страница вики]]"
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
                      setEditingUpdatedAt(null)
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
          <Text tone="muted">{search.trim() ? 'Ничего не найдено.' : 'Пока пусто.'}</Text>
        ) : (
          <ul className="notes-feed">
            {filtered.map((note) => (
              <li
                key={note.id}
                className={`notes-item notes-item--${note.scope}${note.pinned ? ' is-pinned' : ''}`}
              >
                <div className="notes-item__meta">
                  <span className="notes-item__scope">
                    {scopeLabel(note.scope)}
                    {note.pinned ? ' · закреплено' : ''}
                    {note.shared_with_master && note.scope === 'personal' ? ' · показано мастеру' : ''}
                  </span>
                  <Text tone="muted" className="notes-item__date">
                    {formatDate(note.updated_at)}
                  </Text>
                </div>
                {note.title ? (
                  <Text as="h3" className="notes-item__title">
                    {note.title}
                  </Text>
                ) : null}
                {note.scope === 'party' && note.updated_by_name ? (
                  <Text tone="muted" className="notes-item__who">
                    правил: {note.updated_by_name}
                  </Text>
                ) : null}
                {note.body.trim() ? (
                  <div className="notes-item__body">
                    {segmentNoteBody(note.body).map((seg, i) => {
                      if (seg.type === 'text') {
                        return (
                          <SettingMentionBody
                            key={i}
                            body={seg.text}
                            pages={wikiPages}
                            isOwner={canManageJournal}
                            onOpenPage={(id) => setOpenPageId(id)}
                          />
                        )
                      }
                      return (
                        <label key={i} className="notes-task">
                          <input
                            type="checkbox"
                            checked={seg.checked}
                            disabled={busy || !note.can_edit}
                            onChange={() => {
                              if (!note.can_edit) return
                              const next = toggleTaskAtLine(note.body, seg.lineIndex)
                              if (next == null) return
                              void run(async () => {
                                try {
                                  const updated = await updateNote(note.id, {
                                    body: next,
                                    updated_at: note.updated_at,
                                  })
                                  replaceNote(updated)
                                } catch (err) {
                                  if (err instanceof ApiRequestError && err.status === 409) {
                                    const list = await listNotes(lobbyId)
                                    setNotes(list)
                                    const serverNote = list.find((n) => n.id === note.id)
                                    if (serverNote) setConflictNote(serverNote)
                                    return
                                  }
                                  throw err
                                }
                              })
                            }}
                          />
                          <span>{seg.text}</span>
                        </label>
                      )
                    })}
                  </div>
                ) : null}
                <div className="chat-inline-actions">
                  {note.can_share_with_master ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const updated = await updateNote(note.id, {
                            shared_with_master: !note.shared_with_master,
                          })
                          replaceNote(updated)
                          onToast?.(
                            updated.shared_with_master
                              ? 'Показано мастеру'
                              : 'Скрыто от мастера',
                          )
                        })
                      }
                    >
                      {note.shared_with_master ? 'Скрыть от мастера' : 'Показать мастеру'}
                    </Button>
                  ) : null}
                  {note.can_pin ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const updated = await updateNote(note.id, { pinned: !note.pinned })
                          replaceNote(updated)
                        })
                      }
                    >
                      {note.pinned ? 'Открепить' : 'Закрепить'}
                    </Button>
                  ) : null}
                  {note.can_edit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(note.id)
                        setEditingUpdatedAt(note.updated_at)
                        setScope(note.scope as NoteScope)
                        setTitle(note.title)
                        setBody(note.body)
                        setComposing(true)
                      }}
                    >
                      Править
                    </Button>
                  ) : null}
                  {note.can_delete ? (
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
                  ) : null}
                  {note.can_send_to_journal ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy || !onSendToJournal}
                      title={onSendToJournal ? undefined : 'Дневник появится позже'}
                      onClick={() => onSendToJournal?.(note)}
                    >
                      В дневник
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Stack>

      <Dialog
        open={conflictNote != null}
        title="Запись изменилась"
        primaryLabel="Обновить"
        secondaryLabel="Оставить моё"
        onPrimary={() => {
          if (!conflictNote) return
          setEditingId(conflictNote.id)
          setEditingUpdatedAt(conflictNote.updated_at)
          setTitle(conflictNote.title)
          setBody(conflictNote.body)
          setScope(conflictNote.scope as NoteScope)
          setComposing(true)
          setConflictNote(null)
        }}
        onSecondary={() => {
          // оставить черновик в редакторе, сбросить known updated_at на серверный
          if (conflictNote) {
            setEditingId(conflictNote.id)
            setEditingUpdatedAt(conflictNote.updated_at)
            setComposing(true)
          }
          setConflictNote(null)
        }}
      >
        <Text>Запись изменилась, обновить? Ваш черновик в редакторе не затрётся, пока не сохраните.</Text>
      </Dialog>

      <Dialog
        open={openWikiPage != null}
        title={openWikiPage?.title ?? 'Страница'}
        primaryLabel="Закрыть"
        onPrimary={() => setOpenPageId(null)}
        onSecondary={() => setOpenPageId(null)}
      >
        {openWikiPage ? (
          <Stack gap={8}>
            {!openWikiPage.revealed && !canManageJournal ? (
              <Text tone="muted">Страница скрыта.</Text>
            ) : (
              <Text className="notes-item__body">{openWikiPage.body || 'Пусто.'}</Text>
            )}
          </Stack>
        ) : null}
      </Dialog>
    </Panel>
  )
}
