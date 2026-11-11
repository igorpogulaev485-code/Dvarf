/**
 * Превью A5: чаты + письмо мастеру (без dev-тумблеров).
 * /dev/lobby-chats-preview
 */
import { useState } from 'react'
import { LobbyHubTabs, type LobbyHubTabId } from '../features/lobby/LobbyHubTabs'
import type { ChatChannel, ChatMessage, MasterLetterSummary } from '../shared/api/chat'
import { Button, Field, Input, Panel, Stack, Text, Toast } from '../ui'

const CHANNELS: ChatChannel[] = [
  {
    id: 'ch1',
    lobby_id: 'lob1',
    name: 'общий',
    created_by_user_id: 'u0',
    created_at: new Date().toISOString(),
    message_count: 2,
  },
  {
    id: 'ch2',
    lobby_id: 'lob1',
    name: 'лут',
    created_by_user_id: 'u1',
    created_at: new Date().toISOString(),
    message_count: 1,
  },
]

const MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    channel_id: 'ch1',
    author_user_id: 'u1',
    character_id: 'c1',
    character_name: 'Эларион',
    body: 'Идём через мост или в обход?',
    created_at: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'm2',
    channel_id: 'ch1',
    author_user_id: 'u0',
    character_id: null,
    character_name: 'Мастер',
    body: 'Слышите топот с той стороны. Решайте быстро.',
    created_at: new Date(Date.now() - 60000).toISOString(),
  },
]

const LETTERS: MasterLetterSummary[] = [
  {
    id: 'l1',
    lobby_id: 'lob1',
    character_id: 'c5',
    character_name: 'Торин',
    subject: 'Символ на стене',
    status: 'waiting_master',
    last_message_at: new Date().toISOString(),
    preview: 'Я видел такой знак в гримуаре. Можно проверить?',
  },
]

export function LobbyChatsPreviewPage() {
  const [tab, setTab] = useState<LobbyHubTabId>('chats')
  const [mode, setMode] = useState<'channels' | 'letters'>('channels')
  const [activeChannelId, setActiveChannelId] = useState('ch1')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState(MESSAGES)
  const [toast, setToast] = useState<string | null>(null)

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <header className="app-header">
          <div>
            <Text as="h1">Эхо Рассвета</Text>
            <Text tone="muted">Превью A5 · чаты и письмо мастеру</Text>
          </div>
        </header>

        <Text tone="muted">/dev/lobby-chats-preview · только для скринов</Text>
        <LobbyHubTabs active={tab} onChange={setTab} />

        {tab === 'chats' ? (
          <Panel title="Чаты">
            <Stack gap={12}>
              <Text tone="muted">
                Публичные каналы (создаёт любой) и письмо мастеру с бейджем по персонажу.
              </Text>

              <div className="chat-mode-tabs">
                <button
                  type="button"
                  className={`session-live-tab${mode === 'channels' ? ' is-active' : ''}`}
                  onClick={() => setMode('channels')}
                >
                  Каналы
                </button>
                <button
                  type="button"
                  className={`session-live-tab${mode === 'letters' ? ' is-active' : ''}`}
                  onClick={() => setMode('letters')}
                >
                  Письмо мастеру
                  <span className="chat-badge">1</span>
                </button>
              </div>

              {mode === 'channels' ? (
                <div className="chat-layout">
                  <div className="chat-channels">
                    <ul className="chat-channel-list">
                      {CHANNELS.map((ch) => (
                        <li key={ch.id}>
                          <button
                            type="button"
                            className={`chat-channel-item${ch.id === activeChannelId ? ' is-active' : ''}`}
                            onClick={() => setActiveChannelId(ch.id)}
                          >
                            <span>#{ch.name}</span>
                            <span className="chat-channel-item__count">{ch.message_count}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Button type="button" variant="secondary">
                      Новый канал
                    </Button>
                  </div>
                  <div className="chat-thread">
                    <Text as="h3" className="chat-thread__title">
                      #{CHANNELS.find((c) => c.id === activeChannelId)?.name}
                    </Text>
                    <ul className="chat-message-list">
                      {messages
                        .filter((m) => m.channel_id === activeChannelId)
                        .map((m) => (
                          <li key={m.id} className="chat-message">
                            <div className="chat-message__head">
                              <strong>{m.character_name}</strong>
                              <span>
                                {new Date(m.created_at).toLocaleTimeString('ru-RU', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <Text className="chat-message__body">{m.body}</Text>
                          </li>
                        ))}
                    </ul>
                    <form
                      className="chat-composer"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!draft.trim()) return
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: `local-${Date.now()}`,
                            channel_id: activeChannelId,
                            author_user_id: 'u0',
                            character_id: null,
                            character_name: 'Мастер',
                            body: draft.trim(),
                            created_at: new Date().toISOString(),
                          },
                        ])
                        setDraft('')
                        setToast('Сообщение отправлено')
                      }}
                    >
                      <textarea
                        className="ui-input ui-textarea"
                        rows={3}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Сообщение…"
                      />
                      <Button type="submit">Отправить</Button>
                    </form>
                  </div>
                </div>
              ) : (
                <Stack gap={12}>
                  <div className="letter-badge-row">
                    <button type="button" className="letter-badge-chip">
                      Торин
                    </button>
                  </div>
                  <ul className="letter-list">
                    {LETTERS.map((letter) => (
                      <li key={letter.id}>
                        <button type="button" className="letter-list__item">
                          <div className="letter-list__head">
                            <strong>{letter.subject}</strong>
                            <span>Ждёт мастера</span>
                          </div>
                          <Text tone="muted" className="letter-list__meta">
                            {letter.character_name} · {letter.preview}
                          </Text>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <Field label="Ответ мастера">
                    <Input placeholder="Да, проверь — это ключ к главе 5" />
                  </Field>
                  <Button type="button" onClick={() => setToast('Ответ отправлен')}>
                    Ответить
                  </Button>
                </Stack>
              )}
            </Stack>
          </Panel>
        ) : (
          <Panel title={tab}>
            <Text tone="muted">В превью открыты только чаты.</Text>
          </Panel>
        )}
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
