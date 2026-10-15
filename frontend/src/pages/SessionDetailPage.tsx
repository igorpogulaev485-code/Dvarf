import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { LobbyChatsPanel } from '../features/lobby/LobbyChatsPanel'
import { ManualRollForm } from '../features/lobby/ManualRollForm'
import { SessionAttendancePanel } from '../features/lobby/SessionAttendancePanel'
import { SessionEventFeed } from '../features/lobby/SessionEventFeed'
import { SessionLiveTabs, type SessionLiveTabId } from '../features/lobby/SessionLiveTabs'
import { SessionTableCard } from '../features/lobby/SessionTableCard'
import { useSessionRealtime } from '../features/lobby/useSessionRealtime'
import { letterBadge } from '../shared/api/chat'
import { normalizeVisibilityProfile } from '../features/lobby/visibilityProfile'
import { listCharacters } from '../shared/api/characters'
import { ApiRequestError } from '../shared/api/client'
import {
  closeSession,
  createSessionRoll,
  getSession,
  listSessionEvents,
  seatCharacter,
  unseatCharacter,
  updateSession,
  type SessionDetail,
  type SessionEvent,
} from '../shared/api/lobbies'
import { Button, Dialog, Field, Input, Panel, Stack, Text, Toast } from '../ui'

export function SessionDetailPage() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [ownCharacterIds, setOwnCharacterIds] = useState<Set<string>>(() => new Set())
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [rollsOnly, setRollsOnly] = useState(false)
  const [liveTab, setLiveTab] = useState<SessionLiveTabId>('table')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [draftPresentIds, setDraftPresentIds] = useState<Set<string>>(() => new Set())
  const [closeOpen, setCloseOpen] = useState(false)
  const [closeTitle, setCloseTitle] = useState('')
  const [closeSummary, setCloseSummary] = useState('')
  const [writeJournal, setWriteJournal] = useState(true)
  const [letterBadgeCount, setLetterBadgeCount] = useState(0)

  const reload = useCallback(async () => {
    const [detail, chars] = await Promise.all([getSession(sessionId), listCharacters()])
    setSession(detail)
    setOwnCharacterIds(new Set(chars.map((c) => c.id)))
  }, [sessionId])

  const reloadEvents = useCallback(async () => {
    const list = await listSessionEvents(sessionId, { rollsOnly })
    setEvents(list)
  }, [sessionId, rollsOnly])

  useEffect(() => {
    let active = true
    reload().catch((err: unknown) => {
      if (!active) return
      if (err instanceof ApiRequestError && err.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      setError(err instanceof ApiRequestError ? err.message : 'Сессия не найдена')
    })
    return () => {
      active = false
    }
  }, [navigate, reload])

  useEffect(() => {
    if (!session) return
    let active = true
    reloadEvents().catch((err: unknown) => {
      if (!active) return
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить ленту')
    })
    return () => {
      active = false
    }
  }, [session, reloadEvents])

  useSessionRealtime(session?.id, (incoming) => {
    setEvents((prev) => {
      if (prev.some((e) => e.id === incoming.id)) return prev
      if (rollsOnly && incoming.event_type !== 'roll') return prev
      return [incoming, ...prev]
    })
  })

  useEffect(() => {
    if (!session?.is_owner) {
      setLetterBadgeCount(0)
      return
    }
    let active = true
    letterBadge(session.lobby_id)
      .then((b) => {
        if (active) setLetterBadgeCount(b.count)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [session?.is_owner, session?.lobby_id, liveTab])

  const presentIds = useMemo(
    () => new Set(session?.seats.map((s) => s.character_id) ?? []),
    [session],
  )

  const visibility = useMemo(
    () => normalizeVisibilityProfile(session?.visibility_profile),
    [session?.visibility_profile],
  )

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  function openAttendanceEditor() {
    setDraftPresentIds(new Set(presentIds))
    setAttendanceOpen(true)
  }

  async function saveAttendance() {
    if (!session) return
    const current = presentIds
    const next = draftPresentIds
    const toAdd = [...next].filter((id) => !current.has(id))
    const toRemove = [...current].filter((id) => !next.has(id))
    await run(async () => {
      let latest = session
      for (const id of toAdd) {
        latest = await seatCharacter(latest.id, id)
      }
      for (const id of toRemove) {
        latest = await unseatCharacter(latest.id, id)
      }
      setSession(latest)
      setAttendanceOpen(false)
      setToast('Состав сессии обновлён')
    })
  }

  if (!session && !error) {
    return (
      <main className="page page--app page--lobby-hub">
        <Text tone="muted">Загрузка сессии…</Text>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="page page--app page--lobby-hub">
        <Text tone="danger">{error}</Text>
      </main>
    )
  }

  const historyOff = !session.is_owner && visibility.event_history === 'off'

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <AppHeader
          title={session.name}
          subtitle={
            session.setting_name ? `Сессия · ${session.setting_name}` : 'Сессия · ваншот'
          }
          onOfficialSite={() => setToast('Официальный сайт скоро появится')}
        />
        <div className="lobby-hub-top">
          <Text>
            <Link to={`/lobbies/${session.lobby_id}`}>← В лобби «{session.lobby_name}»</Link>
          </Text>
          <div className="session-top-actions">
            {session.is_owner && !session.closed_at ? (
              <Button type="button" variant="secondary" onClick={openAttendanceEditor} disabled={busy}>
                Кто пришёл
              </Button>
            ) : null}
            {session.is_owner && !session.closed_at ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setCloseTitle(`Итог: ${session.name}`)
                  setCloseSummary('')
                  setWriteJournal(true)
                  setCloseOpen(true)
                }}
              >
                Закрыть сессию
              </Button>
            ) : null}
          </div>
        </div>
        {error ? <Text tone="danger">{error}</Text> : null}
        {session.closed_at ? (
          <Text tone="muted">
            Сессия закрыта.{' '}
            <Link to={`/lobbies/${session.lobby_id}#journal`}>Открыть дневник</Link>
          </Text>
        ) : null}

        <Panel title="Сессия">
          <Stack gap={12}>
            {session.is_owner && !session.closed_at ? (
              <Field label="Название">
                <Input
                  value={session.name}
                  onChange={(e) => setSession({ ...session, name: e.target.value })}
                  onBlur={() =>
                    run(async () => {
                      const next = await updateSession(session.id, { name: session.name })
                      setSession(next)
                    })
                  }
                />
              </Field>
            ) : (
              <Text as="h2">{session.name}</Text>
            )}
            <Text tone="muted">
              {session.setting_name ? (
                <>
                  Мир:{' '}
                  <Link to={`/settings/${session.setting_id}`}>{session.setting_name}</Link>
                </>
              ) : (
                'Ваншот — без сеттинга'
              )}
              {' · '}
              за столом: {session.seats.length}
              {session.lobby_members.length > 0
                ? ` из ${session.lobby_members.length} в лобби`
                : ''}
              {session.closed_at ? ' · закрыта' : ''}
            </Text>
          </Stack>
        </Panel>

        <Panel title="Живой стол">
          <Stack gap={14}>
            <SessionLiveTabs
              active={liveTab}
              onChange={setLiveTab}
              moreBadge={letterBadgeCount}
            />

            {liveTab === 'table' ? (
              session.seats.length === 0 ? (
                <Text tone="muted">
                  Никого нет.
                  {session.is_owner
                    ? ' Откройте «Кто пришёл», отметьте игроков и сохраните.'
                    : ''}
                </Text>
              ) : (
                <div className="session-table-grid">
                  {session.seats.map((seat) => {
                    const isOwn = ownCharacterIds.has(seat.character_id)
                    return (
                      <SessionTableCard
                        key={seat.character_id}
                        seat={seat}
                        visibility={visibility}
                        revealAll={session.is_owner}
                        sheetLabel={session.is_owner && !isOwn ? 'Смотреть' : 'Лист'}
                      />
                    )
                  })}
                </div>
              )
            ) : null}

            {liveTab === 'feed' ? (
              <Stack gap={14}>
                {historyOff ? (
                  <Text tone="muted">Лента скрыта настройками видимости лобби.</Text>
                ) : (
                  <>
                    <label className="session-feed-filter">
                      <input
                        type="checkbox"
                        checked={rollsOnly}
                        onChange={(e) => setRollsOnly(e.target.checked)}
                      />
                      Только броски
                    </label>
                    <SessionEventFeed events={events} />
                  </>
                )}
                {!session.closed_at ? (
                  <ManualRollForm
                    seats={session.seats}
                    ownCharacterIds={ownCharacterIds}
                    isOwner={session.is_owner}
                    busy={busy}
                    onSubmit={async (payload) => {
                      await run(async () => {
                        const created = await createSessionRoll(session.id, payload)
                        setEvents((prev) => {
                          if (prev.some((e) => e.id === created.id)) return prev
                          if (rollsOnly && created.event_type !== 'roll') return prev
                          return [created, ...prev]
                        })
                        setToast('Бросок в ленте')
                        setLiveTab('feed')
                      })
                    }}
                  />
                ) : null}
              </Stack>
            ) : null}

            {liveTab === 'more' ? (
              <LobbyChatsPanel
                lobbyId={session.lobby_id}
                isOwner={session.is_owner}
                compact
                ownCharacterOptions={session.lobby_members
                  .filter((m) => ownCharacterIds.has(m.character_id))
                  .map((m) => ({ id: m.character_id, name: m.character_name }))}
                onToast={setToast}
                onError={setError}
              />
            ) : null}
          </Stack>
        </Panel>
      </Stack>

      <Dialog
        open={attendanceOpen}
        title="Кто пришёл"
        size="wide"
        primaryLabel={busy ? 'Сохраняем…' : 'Сохранить'}
        secondaryLabel="Отмена"
        busy={busy}
        onPrimary={() => void saveAttendance()}
        onSecondary={() => setAttendanceOpen(false)}
      >
        <SessionAttendancePanel
          mode="manage"
          members={session.lobby_members}
          presentIds={draftPresentIds}
          busy={busy}
          showPresentCards={false}
          onToggle={(characterId, nextPresent) => {
            setDraftPresentIds((prev) => {
              const next = new Set(prev)
              if (nextPresent) next.add(characterId)
              else next.delete(characterId)
              return next
            })
          }}
        />
      </Dialog>

      <Dialog
        open={closeOpen}
        title="Закрыть сессию"
        primaryLabel={busy ? 'Закрываем…' : writeJournal ? 'Закрыть и в дневник' : 'Закрыть'}
        secondaryLabel="Отмена"
        busy={busy}
        onPrimary={() => {
          void run(async () => {
            const result = await closeSession(session.id, {
              title: closeTitle.trim() || undefined,
              summary: closeSummary,
              write_journal: writeJournal,
            })
            setSession(result.session)
            setCloseOpen(false)
            if (result.journal_entry) {
              setToast('Сессия закрыта · итог в дневнике')
              navigate(`/lobbies/${session.lobby_id}#journal`, {
                state: { toast: 'Итог сессии в дневнике' },
              })
            } else {
              setToast('Сессия закрыта')
            }
          })
        }}
        onSecondary={() => setCloseOpen(false)}
      >
        <Stack gap={12}>
          <Text tone="muted">
            Закрытая сессия остаётся в истории. Итог можно сразу записать в дневник лобби.
          </Text>
          <label className="session-feed-filter">
            <input
              type="checkbox"
              checked={writeJournal}
              onChange={(e) => setWriteJournal(e.target.checked)}
            />
            Записать итог в дневник
          </label>
          {writeJournal ? (
            <>
              <Field label="Заголовок">
                <Input
                  value={closeTitle}
                  onChange={(e) => setCloseTitle(e.target.value)}
                  placeholder={`Итог: ${session.name}`}
                />
              </Field>
              <Field label="Что произошло">
                <textarea
                  className="ui-input ui-textarea"
                  rows={5}
                  value={closeSummary}
                  onChange={(e) => setCloseSummary(e.target.value)}
                  placeholder="Краткий итог сессии для дневника…"
                />
              </Field>
            </>
          ) : null}
        </Stack>
      </Dialog>

      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
