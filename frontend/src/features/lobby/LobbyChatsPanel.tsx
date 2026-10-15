import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  closeLetter,
  createChannel,
  createLetter,
  getLetter,
  letterBadge,
  listChannelMessages,
  listChannels,
  listLetters,
  postChannelMessage,
  replyLetter,
  type ChatChannel,
  type ChatMessage,
  type MasterLetter,
  type MasterLetterBadge,
  type MasterLetterSummary,
} from '../../shared/api/chat'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Field, Input, Panel, Stack, Text } from '../../ui'
import { useLobbyRealtime } from './useLobbyRealtime'

type Props = {
  lobbyId: string
  isOwner: boolean
  /** Персонажи текущего пользователя в лобби */
  ownCharacterOptions: Array<{ id: string; name: string }>
  onToast?: (message: string) => void
  onError?: (message: string) => void
  /** Компактный режим для сайдбара сессии */
  compact?: boolean
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function statusLabel(status: string): string {
  if (status === 'waiting_master') return 'Ждёт мастера'
  if (status === 'waiting_player') return 'Ждёт игрока'
  if (status === 'closed') return 'Закрыто'
  return status
}

export function LobbyChatsPanel({
  lobbyId,
  isOwner,
  ownCharacterOptions,
  onToast,
  onError,
  compact = false,
}: Props) {
  const [mode, setMode] = useState<'channels' | 'letters'>('channels')
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [newChannelName, setNewChannelName] = useState('')
  const [creatingChannel, setCreatingChannel] = useState(false)

  const [letters, setLetters] = useState<MasterLetterSummary[]>([])
  const [badge, setBadge] = useState<MasterLetterBadge>({ count: 0, items: [] })
  const [activeLetter, setActiveLetter] = useState<MasterLetter | null>(null)
  const [letterSubject, setLetterSubject] = useState('')
  const [letterBody, setLetterBody] = useState('')
  const [letterReply, setLetterReply] = useState('')
  const [composingLetter, setComposingLetter] = useState(false)
  const [busy, setBusy] = useState(false)

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? null,
    [channels, activeChannelId],
  )

  const reloadChannels = useCallback(async () => {
    const list = await listChannels(lobbyId)
    setChannels(list)
    setActiveChannelId((prev) => prev ?? list[0]?.id ?? null)
  }, [lobbyId])

  const reloadMessages = useCallback(async (channelId: string) => {
    const list = await listChannelMessages(channelId)
    setMessages(list)
  }, [])

  const reloadLetters = useCallback(async () => {
    const [list, badgeData] = await Promise.all([
      listLetters(lobbyId),
      isOwner ? letterBadge(lobbyId) : Promise.resolve({ count: 0, items: [] }),
    ])
    setLetters(list)
    setBadge(badgeData)
  }, [lobbyId, isOwner])

  useEffect(() => {
    let active = true
    Promise.all([reloadChannels(), reloadLetters()])
      .catch((err: unknown) => {
        if (!active) return
        onError?.(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить чаты')
      })
    return () => {
      active = false
    }
  }, [reloadChannels, reloadLetters, onError])

  useEffect(() => {
    if (!activeChannelId) {
      setMessages([])
      return
    }
    let active = true
    reloadMessages(activeChannelId).catch((err: unknown) => {
      if (!active) return
      onError?.(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить сообщения')
    })
    return () => {
      active = false
    }
  }, [activeChannelId, reloadMessages, onError])

  useLobbyRealtime(lobbyId, (data) => {
    if (data.type === 'chat_message') {
      const message = data.message as ChatMessage
      if (message.channel_id === activeChannelId) {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
      }
      setChannels((prev) =>
        prev.map((c) =>
          c.id === message.channel_id ? { ...c, message_count: c.message_count + 1 } : c,
        ),
      )
    }
    if (data.type === 'master_letter' || data.type === 'master_letter_message') {
      void reloadLetters()
      if (activeLetter && data.type === 'master_letter_message' && data.letter_id === activeLetter.id) {
        void getLetter(activeLetter.id).then(setActiveLetter).catch(() => undefined)
      }
    }
  })

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (err) {
      onError?.(err instanceof ApiRequestError ? err.message : 'Ошибка чата')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title={compact ? 'Чаты' : 'Чаты'}>
      <Stack gap={12}>
        {!compact ? (
          <Text tone="muted">
            Публичные каналы (создаёт любой) и письмо мастеру с бейджем по персонажу.
          </Text>
        ) : null}

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
            {isOwner && badge.count > 0 ? (
              <span className="chat-badge" title={badge.items.map((i) => i.character_name).join(', ')}>
                {badge.count}
              </span>
            ) : null}
          </button>
        </div>

        {mode === 'channels' ? (
          <div className={`chat-layout${compact ? ' chat-layout--compact' : ''}`}>
            <div className="chat-channels">
              {channels.length === 0 ? (
                <Text tone="muted">Каналов пока нет.</Text>
              ) : (
                <ul className="chat-channel-list">
                  {channels.map((ch) => (
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
              )}

              {creatingChannel ? (
                <Stack gap={8}>
                  <Field label="Название канала">
                    <Input
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="общий"
                      disabled={busy}
                    />
                  </Field>
                  <div className="chat-inline-actions">
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const created = await createChannel(lobbyId, newChannelName)
                          setChannels((prev) => [...prev, created])
                          setActiveChannelId(created.id)
                          setNewChannelName('')
                          setCreatingChannel(false)
                          onToast?.('Канал создан')
                        })
                      }
                    >
                      Создать
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setCreatingChannel(false)}
                    >
                      Отмена
                    </Button>
                  </div>
                </Stack>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setCreatingChannel(true)}
                >
                  Новый канал
                </Button>
              )}
            </div>

            <div className="chat-thread">
              {activeChannel ? (
                <>
                  <Text as="h3" className="chat-thread__title">
                    #{activeChannel.name}
                  </Text>
                  <ul className="chat-message-list">
                    {messages.length === 0 ? (
                      <li>
                        <Text tone="muted">Пока тихо — напишите первым.</Text>
                      </li>
                    ) : (
                      messages.map((m) => (
                        <li key={m.id} className="chat-message">
                          <div className="chat-message__head">
                            <strong>{m.character_name || 'Участник'}</strong>
                            <span>{formatTime(m.created_at)}</span>
                          </div>
                          <Text className="chat-message__body">{m.body}</Text>
                        </li>
                      ))
                    )}
                  </ul>
                  <form
                    className="chat-composer"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!draft.trim() || !activeChannelId) return
                      void run(async () => {
                        const created = await postChannelMessage(activeChannelId, {
                          body: draft,
                          character_id: ownCharacterOptions[0]?.id,
                        })
                        setMessages((prev) =>
                          prev.some((m) => m.id === created.id) ? prev : [...prev, created],
                        )
                        setDraft('')
                      })
                    }}
                  >
                    <textarea
                      className="ui-input ui-textarea"
                      rows={compact ? 2 : 3}
                      value={draft}
                      disabled={busy}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Сообщение…"
                    />
                    <Button type="submit" disabled={busy || !draft.trim()}>
                      Отправить
                    </Button>
                  </form>
                </>
              ) : (
                <Text tone="muted">Выберите или создайте канал.</Text>
              )}
            </div>
          </div>
        ) : (
          <Stack gap={12}>
            {isOwner && badge.count > 0 ? (
              <div className="letter-badge-row">
                {badge.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="letter-badge-chip"
                    onClick={() => {
                      void run(async () => {
                        const full = await getLetter(item.id)
                        setActiveLetter(full)
                        setComposingLetter(false)
                      })
                    }}
                  >
                    {item.character_name}
                  </button>
                ))}
              </div>
            ) : null}

            {activeLetter ? (
              <Stack gap={10}>
                <div className="chat-inline-actions">
                  <Button type="button" variant="ghost" onClick={() => setActiveLetter(null)}>
                    ← К списку
                  </Button>
                  {activeLetter.status !== 'closed' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const closed = await closeLetter(activeLetter.id)
                          setActiveLetter(closed)
                          await reloadLetters()
                          onToast?.('Письмо закрыто')
                        })
                      }
                    >
                      Закрыть тикет
                    </Button>
                  ) : null}
                </div>
                <Text as="h3">{activeLetter.subject}</Text>
                <Text tone="muted">
                  {activeLetter.character_name} · {statusLabel(activeLetter.status)}
                </Text>
                <ul className="chat-message-list">
                  {activeLetter.messages.map((m) => (
                    <li key={m.id} className="chat-message">
                      <div className="chat-message__head">
                        <strong>{m.is_master ? 'Мастер' : activeLetter.character_name}</strong>
                        <span>{formatTime(m.created_at)}</span>
                      </div>
                      <Text className="chat-message__body">{m.body}</Text>
                    </li>
                  ))}
                </ul>
                {activeLetter.status !== 'closed' ? (
                  <form
                    className="chat-composer"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!letterReply.trim()) return
                      void run(async () => {
                        const updated = await replyLetter(activeLetter.id, letterReply)
                        setActiveLetter(updated)
                        setLetterReply('')
                        await reloadLetters()
                      })
                    }}
                  >
                    <textarea
                      className="ui-input ui-textarea"
                      rows={3}
                      value={letterReply}
                      disabled={busy}
                      onChange={(e) => setLetterReply(e.target.value)}
                      placeholder={isOwner ? 'Ответ мастера…' : 'Продолжить диалог…'}
                    />
                    <Button type="submit" disabled={busy || !letterReply.trim()}>
                      Отправить
                    </Button>
                  </form>
                ) : null}
              </Stack>
            ) : composingLetter && !isOwner ? (
              <form
                className="chat-composer"
                onSubmit={(e) => {
                  e.preventDefault()
                  void run(async () => {
                    const created = await createLetter(lobbyId, {
                      subject: letterSubject,
                      body: letterBody,
                      character_id: ownCharacterOptions[0]?.id,
                    })
                    setActiveLetter(created)
                    setComposingLetter(false)
                    setLetterSubject('')
                    setLetterBody('')
                    await reloadLetters()
                    onToast?.('Письмо отправлено мастеру')
                  })
                }}
              >
                <Stack gap={10}>
                  <Field label="Тема">
                    <Input
                      value={letterSubject}
                      disabled={busy}
                      onChange={(e) => setLetterSubject(e.target.value)}
                      placeholder="Вопрос по сюжету"
                    />
                  </Field>
                  <Field label="Сообщение">
                    <textarea
                      className="ui-input ui-textarea"
                      rows={4}
                      value={letterBody}
                      disabled={busy}
                      onChange={(e) => setLetterBody(e.target.value)}
                      placeholder="Напишите мастеру…"
                    />
                  </Field>
                  <div className="chat-inline-actions">
                    <Button
                      type="submit"
                      disabled={busy || !letterSubject.trim() || !letterBody.trim()}
                    >
                      Отправить мастеру
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setComposingLetter(false)}
                    >
                      Отмена
                    </Button>
                  </div>
                </Stack>
              </form>
            ) : (
              <Stack gap={10}>
                {!isOwner ? (
                  <Button type="button" onClick={() => setComposingLetter(true)} disabled={busy}>
                    Написать мастеру
                  </Button>
                ) : null}
                {letters.length === 0 ? (
                  <Text tone="muted">
                    {isOwner
                      ? 'Пока нет писем. Когда игрок напишет — здесь будет бейдж с именем персонажа.'
                      : 'Можно спросить мастера в любой момент — тикет с ответом.'}
                  </Text>
                ) : (
                  <ul className="letter-list">
                    {letters.map((letter) => (
                      <li key={letter.id}>
                        <button
                          type="button"
                          className="letter-list__item"
                          onClick={() => {
                            void run(async () => {
                              const full = await getLetter(letter.id)
                              setActiveLetter(full)
                            })
                          }}
                        >
                          <div className="letter-list__head">
                            <strong>{letter.subject}</strong>
                            <span>{statusLabel(letter.status)}</span>
                          </div>
                          <Text tone="muted" className="letter-list__meta">
                            {letter.character_name}
                            {letter.preview ? ` · ${letter.preview}` : ''}
                          </Text>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Stack>
            )}
          </Stack>
        )}
      </Stack>
    </Panel>
  )
}
