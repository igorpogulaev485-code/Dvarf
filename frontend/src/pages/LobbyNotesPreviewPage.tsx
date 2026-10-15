/**
 * Превью A6: заметки — личное / общая доска / мастер.
 * /dev/lobby-notes-preview
 */
import { useMemo, useState } from 'react'
import { LobbyHubTabs, type LobbyHubTabId } from '../features/lobby/LobbyHubTabs'
import type { Note, NoteScope } from '../shared/api/notes'
import { Button, Field, Input, Panel, Stack, Text, Toast } from '../ui'

const SEED: Note[] = [
  {
    id: 'n1',
    lobby_id: 'lob1',
    scope: 'party',
    author_user_id: 'u0',
    character_id: null,
    character_name: null,
    title: 'План на мост',
    body: 'Лира идёт первой. Вирра держит лечение. Не шуметь до сигнала.',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    can_edit: true,
  },
  {
    id: 'n2',
    lobby_id: 'lob1',
    scope: 'personal',
    author_user_id: 'u5',
    character_id: 'c5',
    character_name: 'Торин',
    title: 'Символ культа',
    body: 'Три спирали — как в гримуаре дяди. Спросить мастера после сессии.',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    can_edit: true,
  },
  {
    id: 'n3',
    lobby_id: 'lob1',
    scope: 'master',
    author_user_id: 'u0',
    character_id: null,
    character_name: null,
    title: 'Секрет главы 5',
    body: 'Не открывать культ раньше времени. Торин может узнать знак.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    can_edit: true,
  },
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
                Личный блокнот, общая доска пати и мастерские заметки (мастер видит и чужие
                личные).
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
                      {
                        id: `local-${Date.now()}`,
                        lobby_id: 'lob1',
                        scope,
                        author_user_id: 'u0',
                        character_id: scope === 'personal' ? 'c1' : null,
                        character_name: scope === 'personal' ? 'Эларион' : null,
                        title: title.trim(),
                        body,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        can_edit: true,
                      },
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
