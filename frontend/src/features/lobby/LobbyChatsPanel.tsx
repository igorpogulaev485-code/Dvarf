import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  chatsBadge,
  closeLetter,
  createChannel,
  createLetter,
  getLetter,
  letterBadge,
  listChannelMessages,
  listChannels,
  listLetters,
  listWhisperFacts,
  listWhisperMessages,
  listWhisperPeers,
  listWhispers,
  markChatRead,
  openWhisper,
  postChannelMessage,
  postWhisperMessage,
  replyLetter,
  type ChatChannel,
  type ChatMessage,
  type ChatsBadge,
  type MasterLetter,
  type MasterLetterBadge,
  type MasterLetterSummary,
  type WhisperFact,
  type WhisperMessage,
  type WhisperPeer,
  type WhisperThread,
} from '../../shared/api/chat'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Field, Input, Panel, Stack, Text } from '../../ui'
import { ChatBodyText } from './ChatBodyText'
import { useLobbyRealtime } from './useLobbyRealtime'

type Mode = 'channels' | 'letters' | 'whispers'

type Props = {
  lobbyId: string
  /** Владелец/сомастер: письма и факт шёпота (can_manage_journal) */
  isOwner: boolean
  /** Персонажи текущего пользователя в лобби */
  ownCharacterOptions: Array<{ id: string; name: string }>
  onToast?: (message: string) => void
  onError?: (message: string) => void
  /** Компактный режим для сайдбара сессии */
  compact?: boolean
  /** Хаб: обновить точку на вкладке «Чаты» */
  onBadgeChange?: (badge: ChatsBadge) => void
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

const EMPTY_BADGE: ChatsBadge = { letters: 0, channels: 0, whispers: 0, total: 0 }

export function LobbyChatsPanel({
  lobbyId,
  isOwner,
  ownCharacterOptions,
  onToast,
  onError,
  compact = false,
  onBadgeChange,
}: Props) {
  const [mode, setMode] = useState<Mode>('channels')
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [newChannelName, setNewChannelName] = useState('')
  const [creatingChannel, setCreatingChannel] = useState(false)

  const [letters, setLetters] = useState<MasterLetterSummary[]>([])
  const [letterBadgeData, setLetterBadgeData] = useState<MasterLetterBadge>({
    count: 0,
    items: [],
  })
  const [activeLetter, setActiveLetter] = useState<MasterLetter | null>(null)
  const [letterSubject, setLetterSubject] = useState('')
  const [letterBody, setLetterBody] = useState('')
  const [letterReply, setLetterReply] = useState('')
  const [composingLetter, setComposingLetter] = useState(false)

  const [whispers, setWhispers] = useState<WhisperThread[]>([])
  const [whisperPeers, setWhisperPeers] = useState<WhisperPeer[]>([])
  const [whisperFacts, setWhisperFacts] = useState<WhisperFact[]>([])
  const [activeWhisperId, setActiveWhisperId] = useState<string | null>(null)
  const [whisperMessages, setWhisperMessages] = useState<WhisperMessage[]>([])
  const [whisperDraft, setWhisperDraft] = useState('')
  const [pickingPeer, setPickingPeer] = useState(false)

  const [hubBadge, setHubBadge] = useState<ChatsBadge>(EMPTY_BADGE)
  const [busy, setBusy] = useState(false)

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? null,
    [channels, activeChannelId],
  )
  const activeWhisper = useMemo(
    () => whispers.find((w) => w.id === activeWhisperId) ?? null,
    [whispers, activeWhisperId],
  )

  const pushBadge = useCallback(
    (next: ChatsBadge) => {
      setHubBadge(next)
      onBadgeChange?.(next)
    },
    [onBadgeChange],
  )

  const reloadBadge = useCallback(async () => {
    const badge = await chatsBadge(lobbyId)
    pushBadge(badge)
    return badge
  }, [lobbyId, pushBadge])

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
    setLetterBadgeData(badgeData)
  }, [lobbyId, isOwner])

  const reloadWhispers = useCallback(async () => {
    const [threads, peers] = await Promise.all([
      listWhispers(lobbyId),
      listWhisperPeers(lobbyId).catch(() => [] as WhisperPeer[]),
    ])
    setWhispers(threads)
    setWhisperPeers(peers)
    if (isOwner) {
      const facts = await listWhisperFacts(lobbyId).catch(() => [] as WhisperFact[])
      setWhisperFacts(facts)
    } else {
      setWhisperFacts([])
    }
  }, [lobbyId, isOwner])

  const reloadWhisperMessages = useCallback(async (threadId: string) => {
    const list = await listWhisperMessages(threadId)
    setWhisperMessages(list)
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([reloadChannels(), reloadLetters(), reloadWhispers(), reloadBadge()])
      .catch((err: unknown) => {
        if (!active) return
        onError?.(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить чаты')
      })
    return () => {
      active = false
    }
  }, [reloadChannels, reloadLetters, reloadWhispers, reloadBadge, onError])

  useEffect(() => {
    if (!activeChannelId) {
      setMessages([])
      return
    }
    let active = true
    reloadMessages(activeChannelId)
      .then(() => markChatRead(lobbyId, 'channel', activeChannelId).then(pushBadge))
      .catch((err: unknown) => {
        if (!active) return
        onError?.(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить сообщения')
      })
    return () => {
      active = false
    }
  }, [activeChannelId, reloadMessages, lobbyId, pushBadge, onError])

  useEffect(() => {
    if (!activeWhisperId) {
      setWhisperMessages([])
      return
    }
    let active = true
    reloadWhisperMessages(activeWhisperId)
      .then(() => markChatRead(lobbyId, 'whisper', activeWhisperId).then(pushBadge))
      .catch((err: unknown) => {
        if (!active) return
        onError?.(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить шёпот')
      })
    return () => {
      active = false
    }
  }, [activeWhisperId, reloadWhisperMessages, lobbyId, pushBadge, onError])

  const refreshChats = useCallback(() => {
    void reloadChannels()
    if (activeChannelId) void reloadMessages(activeChannelId)
    void reloadLetters()
    void reloadWhispers()
    void reloadBadge()
    if (activeLetter) {
      void getLetter(activeLetter.id).then(setActiveLetter).catch(() => undefined)
    }
    if (activeWhisperId) {
      void reloadWhisperMessages(activeWhisperId)
    }
  }, [
    activeChannelId,
    activeLetter,
    activeWhisperId,
    reloadBadge,
    reloadChannels,
    reloadLetters,
    reloadMessages,
    reloadWhisperMessages,
    reloadWhispers,
  ])

  useLobbyRealtime(
    lobbyId,
    (data) => {
      if (data.type === 'chat_message' && data.message && typeof data.message === 'object') {
        const message = data.message as ChatMessage
        if (message.channel_id === activeChannelId) {
          setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
          void markChatRead(lobbyId, 'channel', message.channel_id).then(pushBadge)
        } else {
          void reloadBadge()
        }
        setChannels((prev) =>
          prev.map((c) =>
            c.id === message.channel_id ? { ...c, message_count: c.message_count + 1 } : c,
          ),
        )
      }
      if (data.type === 'chat_refresh' || data.type === 'lobby_resync') {
        refreshChats()
      }
      if (
        data.type === 'letters_changed' ||
        data.type === 'master_letter' ||
        data.type === 'master_letter_message'
      ) {
        void reloadLetters()
        void reloadBadge()
        if (activeLetter) {
          void getLetter(activeLetter.id).then(setActiveLetter).catch(() => undefined)
        }
      }
      if (data.type === 'whisper_changed') {
        void reloadWhispers()
        void reloadBadge()
        if (activeWhisperId && data.thread_id === activeWhisperId) {
          void reloadWhisperMessages(activeWhisperId).then(() =>
            markChatRead(lobbyId, 'whisper', activeWhisperId).then(pushBadge),
          )
        }
      }
      if (data.type === 'whisper_fact' && isOwner) {
        void reloadWhispers()
      }
    },
    () => {
      refreshChats()
    },
  )

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

  const whisperUnread = whispers.reduce((sum, w) => sum + (w.unread_count || 0), 0)

  return (
    <Panel title="Чаты">
      <Stack gap={12}>
        {!compact ? (
          <Text tone="muted">
            Публичные каналы, письмо мастеру (тикет) и шёпот (личный чат). Это разные разделы.
          </Text>
        ) : null}

        <div className="chat-mode-tabs" role="tablist" aria-label="Режимы чата">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'channels'}
            className={`chat-mode-tab${mode === 'channels' ? ' is-active' : ''}`}
            onClick={() => setMode('channels')}
          >
            Каналы
            {hubBadge.channels > 0 ? (
              <span className="chat-badge" title="Непрочитанные сообщения">
                {hubBadge.channels}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'letters'}
            className={`chat-mode-tab${mode === 'letters' ? ' is-active' : ''}`}
            onClick={() => setMode('letters')}
          >
            Письмо мастеру
            {isOwner && letterBadgeData.count > 0 ? (
              <span
                className="chat-badge"
                title={letterBadgeData.items.map((i) => i.character_name).join(', ')}
              >
                {letterBadgeData.count}
              </span>
            ) : !isOwner && hubBadge.letters > 0 ? (
              <span className="chat-badge">{hubBadge.letters}</span>
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'whispers'}
            className={`chat-mode-tab${mode === 'whispers' ? ' is-active' : ''}`}
            onClick={() => setMode('whispers')}
          >
            Шёпот
            {whisperUnread > 0 || hubBadge.whispers > 0 ? (
              <span className="chat-badge">{whisperUnread || hubBadge.whispers}</span>
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
                          <Text className="chat-message__body">
                            <ChatBodyText body={m.body} />
                          </Text>
                        </li>
                      ))
                    )}
                  </ul>
                  <form
                    className={`chat-composer${compact ? '' : ' chat-composer--sticky'}`}
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
                      className="ui-input ui-input--touch ui-textarea chat-composer__input"
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
        ) : null}

        {mode === 'letters' ? (
          <Stack gap={12}>
            <Text tone="muted">
              Тикет с темой и статусами. Чтобы написать первым без тикета — раздел «Шёпот».
            </Text>
            {isOwner && letterBadgeData.count > 0 ? (
              <div className="letter-badge-row">
                {letterBadgeData.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="letter-badge-chip"
                    onClick={() => {
                      void run(async () => {
                        const full = await getLetter(item.id)
                        setActiveLetter(full)
                        setComposingLetter(false)
                        pushBadge(await markChatRead(lobbyId, 'letter', item.id))
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
                          pushBadge(await markChatRead(lobbyId, 'letter', closed.id))
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
                      <Text className="chat-message__body">
                        <ChatBodyText body={m.body} />
                      </Text>
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
                        pushBadge(await markChatRead(lobbyId, 'letter', updated.id))
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
                    pushBadge(await markChatRead(lobbyId, 'letter', created.id))
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
                              pushBadge(await markChatRead(lobbyId, 'letter', letter.id))
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
        ) : null}

        {mode === 'whispers' ? (
          <Stack gap={12}>
            <Text tone="muted">
              Личный чат с мастером или одним игроком. Мастер видит факт чужой переписки, но не
              текст.
            </Text>

            {isOwner && whisperFacts.length > 0 ? (
              <div className="whisper-facts">
                <Text as="h3" className="chat-thread__title">
                  Идут шёпоты
                </Text>
                <ul className="whisper-facts__list">
                  {whisperFacts.map((f) => (
                    <li key={f.thread_id}>
                      <Text>
                        {f.label_a} и {f.label_b} переписываются
                      </Text>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className={`chat-layout${compact ? ' chat-layout--compact' : ''}`}>
              <div className="chat-channels">
                {whispers.length === 0 ? (
                  <Text tone="muted">Шёпотов пока нет.</Text>
                ) : (
                  <ul className="chat-channel-list">
                    {whispers.map((w) => (
                      <li key={w.id}>
                        <button
                          type="button"
                          className={`chat-channel-item${w.id === activeWhisperId ? ' is-active' : ''}`}
                          onClick={() => setActiveWhisperId(w.id)}
                        >
                          <span>{w.peer_label}</span>
                          {w.unread_count > 0 ? (
                            <span className="chat-badge">{w.unread_count}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {pickingPeer ? (
                  <Stack gap={8}>
                    <Text tone="muted">Кому шепнуть:</Text>
                    <ul className="chat-channel-list">
                      {whisperPeers.map((p) => (
                        <li key={p.user_id}>
                          <button
                            type="button"
                            className="chat-channel-item"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const thread = await openWhisper(lobbyId, p.user_id)
                                setWhispers((prev) => {
                                  if (prev.some((t) => t.id === thread.id)) {
                                    return prev.map((t) => (t.id === thread.id ? thread : t))
                                  }
                                  return [thread, ...prev]
                                })
                                setActiveWhisperId(thread.id)
                                setPickingPeer(false)
                              })
                            }
                          >
                            <span>
                              {p.label}
                              {p.is_master ? ' · мастер' : ''}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Button type="button" variant="ghost" onClick={() => setPickingPeer(false)}>
                      Отмена
                    </Button>
                  </Stack>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || whisperPeers.length === 0}
                    onClick={() => setPickingPeer(true)}
                  >
                    Новый шёпот
                  </Button>
                )}
              </div>

              <div className="chat-thread">
                {activeWhisper ? (
                  <>
                    <Text as="h3" className="chat-thread__title">
                      Шёпот · {activeWhisper.peer_label}
                    </Text>
                    <ul className="chat-message-list">
                      {whisperMessages.length === 0 ? (
                        <li>
                          <Text tone="muted">Напишите первым — это не письмо-тикет.</Text>
                        </li>
                      ) : (
                        whisperMessages.map((m) => (
                          <li key={m.id} className="chat-message">
                            <div className="chat-message__head">
                              <strong>{m.character_name || 'Участник'}</strong>
                              <span>{formatTime(m.created_at)}</span>
                            </div>
                            <Text className="chat-message__body">
                              <ChatBodyText body={m.body} />
                            </Text>
                          </li>
                        ))
                      )}
                    </ul>
                    <form
                      className={`chat-composer${compact ? '' : ' chat-composer--sticky'}`}
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!whisperDraft.trim() || !activeWhisperId) return
                        void run(async () => {
                          const created = await postWhisperMessage(activeWhisperId, {
                            body: whisperDraft,
                            character_id: ownCharacterOptions[0]?.id,
                          })
                          setWhisperMessages((prev) =>
                            prev.some((m) => m.id === created.id) ? prev : [...prev, created],
                          )
                          setWhisperDraft('')
                          await reloadWhispers()
                        })
                      }}
                    >
                      <textarea
                        className="ui-input ui-input--touch ui-textarea chat-composer__input"
                        rows={compact ? 2 : 3}
                        value={whisperDraft}
                        disabled={busy}
                        onChange={(e) => setWhisperDraft(e.target.value)}
                        placeholder="Шёпот…"
                      />
                      <Button type="submit" disabled={busy || !whisperDraft.trim()}>
                        Отправить
                      </Button>
                    </form>
                  </>
                ) : (
                  <Text tone="muted">Выберите шёпот или начните новый.</Text>
                )}
              </div>
            </div>
          </Stack>
        ) : null}
      </Stack>
    </Panel>
  )
}
