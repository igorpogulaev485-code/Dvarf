/**
 * Превью A6: заметки — личное / общая доска / мастер.
 * /dev/lobby-notes-preview
 */
import { useMemo, useState } from 'react'
import { LobbyHubTabs, type LobbyHubTabId } from '../features/lobby/LobbyHubTabs'
import type { Note, NoteScope } from '../shared/api/notes'
import { Button, Field, Input, Panel, Stack, Text, Toast } from '../ui'

function seedNote(partial: Partial<Note> & Pick<Note, 'id' | 'scope' | 'title' | 'body'>): Note {
  const now = new Date().toISOString()
  return {
    lobby_id: 'lob1',
    author_user_id: 'u0',
    character_id: null,
    character_name: null,
    shared_with_master: false,
    pinned: false,
    updated_by_user_id: 'u0',
    updated_by_name: 'Мастер',
    created_at: now,
    updated_at: now,
    can_edit: true,
    can_delete: true,
    can_pin: partial.scope === 'party',
    can_share_with_master: partial.scope === 'personal',
    can_send_to_journal: partial.scope === 'party',
    ...partial,
  }
}

const SEED: Note[] = [
  seedNote({
    id: 'n1',
    scope: 'party',
    title: 'План на мост',
    body: 'Лира идёт первой. Вирра держит лечение. Не шуметь до сигнала.\n- [ ] сигнал\n[[Мост]]',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    pinned: true,
  }),
  seedNote({
    id: 'n2',
    scope: 'personal',
    author_user_id: 'u5',
    character_id: 'c5',
    character_name: 'Торин',
    title: 'Символ культа',
    body: 'Три спирали — как в гримуаре дяди. Спросить мастера после сессии.',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    updated_by_user_id: 'u5',
    updated_by_name: 'Торин',
  }),
  seedNote({
    id: 'n3',
    scope: 'master',
    title: 'Секрет главы 5',
    body: 'Не открывать культ раньше времени. Торин может узнать знак.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  }),
]

function scopeLabel(scope: string): string {
  if (scope === 'party') return 'Общая доска'
  if (scope === 'master') return 'Мастер'
  return 'Личное'
}

export function LobbyNotesPreviewPage() {
  const [tab, setTab] = useState<LobbyHubTabId>('notes')
  const [filter, setFilter] = useState<NoteScope | 'all'>('all')
  const [notes, setNotes] = useState(SEED)
  const [composing, setComposing] = useState(false)
  const [scope, setScope] = useState<NoteScope>('party')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const filtered = useMemo(
    () => (filter === 'all' ? notes : notes.filter((n) => n.scope === filter)),
    [notes, filter],
  )

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <header className="app-header">
          <div>
            <Text as="h1">Эхо Рассвета</Text>
            <Text tone="muted">Превью A6 · заметки</Text>
          </div>
        </header>
        <Text tone="muted">/dev/lobby-notes-preview · только для скринов</Text>
        <LobbyHubTabs active={tab} onChange={setTab} />

        {tab === 'notes' ? (
          <Panel title="Заметки">
            <Stack gap={12}>
              <Text tone="muted">
                Личный блокнот и общая доска; личные скрыты от мастера, пока не «Показать мастеру».
              </Text>
              <div className="chat-mode-tabs">
                {(['all', 'personal', 'party', 'master'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`session-live-tab${filter === s ? ' is-active' : ''}`}
                    onClick={() => setFilter(s)}
                  >
                    {s === 'all' ? 'Все' : scopeLabel(s)}
                  </button>
                ))}
              </div>

              {composing ? (
                <form
                  className="notes-composer"
                  onSubmit={(e) => {
                    e.preventDefault()
                    setNotes((prev) => [
                      seedNote({
                        id: `local-${Date.now()}`,
                        scope,
                        character_id: scope === 'personal' ? 'c1' : null,
                        character_name: scope === 'personal' ? 'Эларион' : null,
                        title: title.trim(),
                        body,
                      }),
                      ...prev,
                    ])
                    setTitle('')
                    setBody('')
                    setComposing(false)
                    setToast('Заметка сохранена')
                  }}
                >
                  <Stack gap={10}>
                    <Field label="Куда">
                      <select
                        className="ui-input"
                        value={scope}
                        onChange={(e) => setScope(e.target.value as NoteScope)}
                      >
                        <option value="personal">Личное</option>
                        <option value="party">Общая доска</option>
                        <option value="master">Мастер</option>
                      </select>
                    </Field>
                    <Field label="Заголовок">
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                    </Field>
                    <Field label="Текст">
                      <textarea
                        className="ui-input ui-textarea"
                        rows={4}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                      />
                    </Field>
                    <div className="chat-inline-actions">
                      <Button type="submit">Добавить</Button>
                      <Button type="button" variant="ghost" onClick={() => setComposing(false)}>
                        Отмена
                      </Button>
                    </div>
                  </Stack>
                </form>
              ) : (
                <Button type="button" onClick={() => setComposing(true)}>
                  Новая заметка
                </Button>
              )}

              <ul className="notes-feed">
                {filtered.map((note) => (
                  <li key={note.id} className={`notes-item notes-item--${note.scope}`}>
                    <div className="notes-item__meta">
                      <span className="notes-item__scope">{scopeLabel(note.scope)}</span>
                      <Text tone="muted" className="notes-item__date">
                        {new Date(note.updated_at).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </div>
                    {note.title ? (
                      <Text as="h3" className="notes-item__title">
                        {note.title}
                      </Text>
                    ) : null}
                    {note.character_name ? (
                      <Text tone="muted" className="notes-item__who">
                        {note.character_name}
                      </Text>
                    ) : null}
                    <Text className="notes-item__body">{note.body}</Text>
                  </li>
                ))}
              </ul>
            </Stack>
          </Panel>
        ) : (
          <Panel title={tab}>
            <Text tone="muted">В превью открыты только заметки.</Text>
          </Panel>
        )}
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
