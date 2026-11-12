import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { openProductSite } from '../shared/brand/creed20'
import { LobbyChatsPanel } from '../features/lobby/LobbyChatsPanel'
import { LobbyNotesPanel } from '../features/lobby/LobbyNotesPanel'
import { ManualRollForm } from '../features/lobby/ManualRollForm'
import { AddCombatantDialog } from '../features/lobby/AddCombatantDialog'
import { ApplyConditionDialog } from '../features/lobby/ApplyConditionDialog'
import { ApplyEffectDialog } from '../features/lobby/ApplyEffectDialog'
import { AwardLootDialog } from '../features/lobby/AwardLootDialog'
import { AwardXpDialog } from '../features/lobby/AwardXpDialog'
import { PietyAwardDialog } from '../features/lobby/PietyAwardDialog'
import { CombatTrack } from '../features/lobby/CombatTrack'
import { EnemyCard } from '../features/lobby/EnemyCard'
import { SessionLoreBindDialog } from '../features/lobby/SessionLoreBindDialog'
import { SessionLorePanel } from '../features/lobby/SessionLorePanel'
import { SessionQuestStatusDialog } from '../features/lobby/SessionQuestStatusDialog'
import { SettingPagePreviewDialog } from '../features/lobby/SettingPagePreviewDialog'
import { SettingTableHandoffDialog } from '../features/lobby/SettingTableHandoffDialog'
import { SettingTableRevealDialog } from '../features/lobby/SettingTableRevealDialog'
import { draftFromCombatant, type SettingHandoffDraft } from '../features/lobby/settingHandoff'
import { StartCombatDialog } from '../features/lobby/StartCombatDialog'
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
  addSeatCompanion,
  addSessionCombatants,
  awardLobbyPiety,
  awardSessionLoot,
  awardSessionXp,
  closeSession,
  createSessionRoll,
  deleteSeatCompanion,
  deleteSession,
  deleteSessionCombatant,
  createSettingPage,
  getLobby,
  getSession,
  getSetting,
  listSessionEvents,
  revealSessionPage,
  updateSessionQuestStatus,
  patchSeatCombat,
  shareLobbyEffect,
  patchSessionCombat,
  patchSessionCombatant,
  seatCharacter,
  startSessionCombat,
  unseatCharacter,
  updateSession,
  type SeatCondition,
  type SeatEffect,
  type SessionDetail,
  type SessionEvent,
  type SessionCombatant,
  type SessionLorePage,
  type SettingArtifact,
  type SettingDetail,
  type SettingPage,
  type SettingSummary,
} from '../shared/api/lobbies'
import { Button, Dialog, Field, Input, NumberInput, Panel, Stack, Text, Toast } from '../ui'

const SIDE_PANEL_KEY = 'dvarf.session.sidePanelOpen'

function sessionCanRun(session: { can_run_session?: boolean; is_owner?: boolean } | null | undefined): boolean {
  if (!session) return false
  return Boolean(session.can_run_session ?? session.is_owner)
}

function sessionCanSeeHidden(
  session: { can_see_hidden?: boolean; can_run_session?: boolean; is_owner?: boolean } | null | undefined,
): boolean {
  if (!session) return false
  return Boolean(session.can_see_hidden ?? session.can_run_session ?? session.is_owner)
}

function sessionCanDelete(
  session: { can_delete_session?: boolean; is_owner?: boolean } | null | undefined,
): boolean {
  if (!session) return false
  return Boolean(session.can_delete_session ?? session.is_owner)
}

function readSidePanelOpen(): boolean {
  try {
    const raw = localStorage.getItem(SIDE_PANEL_KEY)
    if (raw === null) return true
    return raw !== '0'
  } catch {
    return true
  }
}

export function SessionDetailPage() {
  const { sessionId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const pageFromQuery = searchParams.get('page')
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
  const [companionOpen, setCompanionOpen] = useState(false)
  const [companionHostId, setCompanionHostId] = useState<string | null>(null)
  const [companionName, setCompanionName] = useState('')
  const [companionHp, setCompanionHp] = useState<number | null>(11)
  const [companionAc, setCompanionAc] = useState<number | null>(13)
  const [conditionOpen, setConditionOpen] = useState(false)
  const [effectOpen, setEffectOpen] = useState(false)
  const [combatantOpen, setCombatantOpen] = useState(false)
  const [combatStartOpen, setCombatStartOpen] = useState(false)
  const [xpOpen, setXpOpen] = useState(false)
  const [pietySeatId, setPietySeatId] = useState<string | null>(null)
  const [lootOpen, setLootOpen] = useState(false)
  const [settingArtifacts, setSettingArtifacts] = useState<SettingArtifact[]>([])
  const [lobbySettings, setLobbySettings] = useState<SettingSummary[]>([])
  const [sidePanelOpen, setSidePanelOpen] = useState(readSidePanelOpen)
  const [seatPickOpen, setSeatPickOpen] = useState(false)
  const [seatPickId, setSeatPickId] = useState('')
  const [bindSettingOpen, setBindSettingOpen] = useState(false)
  const [bindSettingId, setBindSettingId] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [restStub, setRestStub] = useState<string | null>(null)
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [handoffDraft, setHandoffDraft] = useState<SettingHandoffDraft | null>(null)
  const [handoffSetting, setHandoffSetting] = useState<SettingDetail | null>(null)
  const [handoffLink, setHandoffLink] = useState<string | null>(null)
  const [revealOpen, setRevealOpen] = useState(false)
  const [revealSetting, setRevealSetting] = useState<SettingDetail | null>(null)
  const [loreBindOpen, setLoreBindOpen] = useState(false)
  const [loreSetting, setLoreSetting] = useState<SettingDetail | null>(null)
  const [previewPageId, setPreviewPageId] = useState<string | null>(null)
  const [questDialogOpen, setQuestDialogOpen] = useState(false)
  const [questTarget, setQuestTarget] = useState<SessionLorePage | null>(null)
  const isOwnerRef = useRef(false)
  /** T5: ?page= из дневника — открыть превью один раз */
  const pageDeepLinkDone = useRef(false)

  const reload = useCallback(async () => {
    const [detail, chars] = await Promise.all([getSession(sessionId), listCharacters()])
    setSession(detail)
    setOwnCharacterIds(new Set(chars.map((c) => c.id)))
    try {
      const lobby = await getLobby(detail.lobby_id)
      setLobbySettings(lobby.settings ?? [])
    } catch {
      setLobbySettings([])
    }
    if (sessionCanRun(detail) && detail.setting_id) {
      try {
        const setting = await getSetting(detail.setting_id)
        setSettingArtifacts(setting.artifacts ?? [])
      } catch {
        setSettingArtifacts([])
      }
    } else {
      setSettingArtifacts([])
    }
  }, [sessionId])

  const reloadEvents = useCallback(async () => {
    const list = await listSessionEvents(sessionId, { rollsOnly })
    setEvents(list)
  }, [sessionId, rollsOnly])

  const pullGate = useRef({ inflight: false, again: false })
  const pullSessionRef = useRef<() => void>(() => undefined)
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId
  const pullSession = useCallback(() => {
    if (!sessionId) return
    const gate = pullGate.current
    if (gate.inflight) {
      gate.again = true
      return
    }
    gate.inflight = true
    const requestedId = sessionId
    void (async () => {
      try {
        const detail = await getSession(requestedId)
        if (sessionIdRef.current === requestedId) setSession(detail)
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate('/login', { replace: true })
        }
      } finally {
        gate.inflight = false
        if (gate.again) {
          gate.again = false
          pullSessionRef.current()
        }
      }
    })()
  }, [navigate, sessionId])
  pullSessionRef.current = pullSession

  useEffect(() => {
    pageDeepLinkDone.current = false
  }, [sessionId])

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

  // T5: дневник → /sessions/{id}?page=… → превью лора
  useEffect(() => {
    if (!session || !pageFromQuery || pageDeepLinkDone.current) return
    if (!session.setting_id) return
    pageDeepLinkDone.current = true
    const settingId = session.setting_id
    let cancelled = false
    setLiveTab('table')
    setBusy(true)
    setError(null)
    void (async () => {
      try {
        const setting = await getSetting(settingId)
        if (cancelled) return
        setLoreSetting(setting)
        if (setting.pages.some((p) => p.id === pageFromQuery)) {
          setPreviewPageId(pageFromQuery)
        }
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof ApiRequestError
            ? err.message
            : 'Не удалось открыть страницу из дневника',
        )
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session, pageFromQuery])

  isOwnerRef.current = sessionCanRun(session)

  useSessionRealtime(session?.id, {
    onEvent: (incoming) => {
      setEvents((prev) => {
        if (prev.some((e) => e.id === incoming.id)) return prev
        if (rollsOnly && incoming.event_type !== 'roll') return prev
        return [incoming, ...prev]
      })
      // T2/T4: игрокам toast при reveal / квесте (мастер уже тостнул локально)
      if (
        (incoming.event_type === 'reveal' || incoming.event_type === 'quest_status') &&
        !isOwnerRef.current &&
        incoming.title
      ) {
        setToast(incoming.title)
      }
    },
    onSessionUpdate: (next) => {
      setSession(next)
    },
    onSessionChanged: () => {
      pullSession()
    },
    onReconnect: () => {
      pullSession()
      void reloadEvents()
    },
  })

  const canRunSession = sessionCanRun(session)

  useEffect(() => {
    if (!canRunSession || !session) {
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
  }, [canRunSession, session, liveTab])

  const presentIds = useMemo(
    () => new Set(session?.seats.map((s) => s.character_id) ?? []),
    [session],
  )

  const seatCandidates = useMemo(() => {
    if (!session || session.closed_at) return []
    return session.lobby_members.filter(
      (m) => ownCharacterIds.has(m.character_id) && !presentIds.has(m.character_id),
    )
  }, [session, ownCharacterIds, presentIds])

  const visibility = useMemo(
    () => normalizeVisibilityProfile(session?.visibility_profile),
    [session?.visibility_profile],
  )

  function toggleSidePanel(next: boolean) {
    setSidePanelOpen(next)
    try {
      localStorage.setItem(SIDE_PANEL_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

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

  async function openHandoff(enemy: SessionCombatant) {
    if (!session?.setting_id) {
      setToast('Привяжи сеттинг к сессии')
      return
    }
    setHandoffLink(null)
    setHandoffDraft(
      draftFromCombatant(enemy, { sessionName: session.name }),
    )
    setHandoffOpen(true)
    setBusy(true)
    setError(null)
    try {
      const setting = await getSetting(session.setting_id)
      setHandoffSetting(setting)
    } catch (err) {
      setHandoffOpen(false)
      setHandoffDraft(null)
      setError(
        err instanceof ApiRequestError ? err.message : 'Не удалось открыть сеттинг',
      )
    } finally {
      setBusy(false)
    }
  }

  async function openRevealDialog() {
    if (!session?.setting_id) {
      setToast('Привяжи сеттинг к сессии')
      return
    }
    setRevealOpen(true)
    setBusy(true)
    setError(null)
    try {
      const setting = await getSetting(session.setting_id)
      setRevealSetting(setting)
    } catch (err) {
      setRevealOpen(false)
      setError(
        err instanceof ApiRequestError ? err.message : 'Не удалось открыть сеттинг',
      )
    } finally {
      setBusy(false)
    }
  }

  async function ensureLoreSetting(): Promise<SettingDetail | null> {
    if (!session?.setting_id) {
      setToast('Привяжи сеттинг к сессии')
      return null
    }
    if (loreSetting && loreSetting.id === session.setting_id) {
      return loreSetting
    }
    setBusy(true)
    setError(null)
    try {
      const setting = await getSetting(session.setting_id)
      setLoreSetting(setting)
      return setting
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Не удалось открыть сеттинг',
      )
      return null
    } finally {
      setBusy(false)
    }
  }

  async function openLoreBind() {
    const setting = await ensureLoreSetting()
    if (!setting) return
    setLoreBindOpen(true)
  }

  async function openLorePreview(pageId: string) {
    const setting = await ensureLoreSetting()
    if (!setting) return
    setPreviewPageId(pageId)
  }

  const previewPage: SettingPage | null = useMemo(() => {
    if (!previewPageId || !loreSetting) return null
    return loreSetting.pages.find((p) => p.id === previewPageId) ?? null
  }, [previewPageId, loreSetting])

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

  const historyOff = !sessionCanSeeHidden(session) && visibility.event_history === 'off'
  const canSeeHidden = sessionCanSeeHidden(session)
  const canRun = sessionCanRun(session)

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <AppHeader
          title={session.name}
          subtitle={
            session.setting_name ? `Сессия · ${session.setting_name}` : 'Сессия · ваншот'
          }
          onOfficialSite={openProductSite}
        />
        <div className="lobby-hub-top">
          <Text>
            <Link to={`/lobbies/${session.lobby_id}`}>← В лобби «{session.lobby_name}»</Link>
          </Text>
          <div className="session-top-actions">
            {!session.closed_at && seatCandidates.length > 0 && !sessionCanRun(session) ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  if (seatCandidates.length === 1) {
                    void run(async () => {
                      const updated = await seatCharacter(session.id, seatCandidates[0].character_id)
                      setSession(updated)
                      setToast('Вы за столом')
                    })
                  } else {
                    setSeatPickId(seatCandidates[0]?.character_id ?? '')
                    setSeatPickOpen(true)
                  }
                }}
              >
                Сесть за стол
              </Button>
            ) : null}
            {sessionCanRun(session) && !session.closed_at ? (
              <Button type="button" variant="secondary" onClick={openAttendanceEditor} disabled={busy}>
                Кто пришёл
              </Button>
            ) : null}
            {sessionCanRun(session) && !session.closed_at ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  void run(async () => {
                    let latest = session
                    if (latest.combat?.active) {
                      latest = await patchSessionCombat(latest.id, { action: 'end' })
                      setSession(latest)
                      setToast('Бой окончен')
                    }
                    setCloseTitle(`Итог: ${latest.name}`)
                    setCloseSummary('')
                    setWriteJournal(true)
                    setCloseOpen(true)
                  })
                }}
              >
                Закрыть сессию
              </Button>
            ) : null}
            {sessionCanDelete(session) ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setDeleteConfirmName('')
                  setDeleteOpen(true)
                }}
              >
                Удалить сессию
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
            {sessionCanRun(session) && !session.closed_at ? (
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
            <div className="session-live-tabs--mobile-only">
              <SessionLiveTabs
                active={liveTab}
                onChange={setLiveTab}
                moreBadge={letterBadgeCount}
              />
            </div>

            <div
              className={`session-live-desk${sidePanelOpen ? '' : ' is-side-collapsed'}`}
            >
              <div className="session-live-desk__rail session-live-desk__desktop-only">
                <div className="session-live-desk__rail-head">
                  <Text as="h3">Инициатива и лента</Text>
                </div>
                {session.combat?.active ? (
                  <CombatTrack
                    combat={session.combat}
                    masterControls={canRun && !session.closed_at}
                    busy={busy}
                    onNext={() => {
                      void run(async () => {
                        const updated = await patchSessionCombat(session.id, {
                          action: 'next',
                        })
                        setSession(updated)
                      })
                    }}
                    onPrev={() => {
                      void run(async () => {
                        const updated = await patchSessionCombat(session.id, {
                          action: 'prev',
                        })
                        setSession(updated)
                      })
                    }}
                    onEnd={() => {
                      void run(async () => {
                        const updated = await patchSessionCombat(session.id, {
                          action: 'end',
                        })
                        setSession(updated)
                        setToast('Бой окончен')
                        setXpOpen(true)
                      })
                    }}
                    onSelect={(index) => {
                      void run(async () => {
                        const updated = await patchSessionCombat(session.id, {
                          active_index: index,
                        })
                        setSession(updated)
                      })
                    }}
                  />
                ) : (
                  <Text tone="muted">Бой ещё не начат — очередь появится здесь.</Text>
                )}
                <Stack gap={12}>
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
                    isOwner={canRun}
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
              </div>

              <div className="session-live-desk__center">
                <Stack gap={12}>
                  <SessionLorePanel
                    hasSetting={Boolean(session.setting_id)}
                    locationPage={session.location_page ?? null}
                    involvedPages={session.involved_pages ?? []}
                    isOwner={canRun && !session.closed_at}
                    busy={busy}
                    onOpenPage={(id) => void openLorePreview(id)}
                    onEdit={() => void openLoreBind()}
                    onBindSetting={() => {
                      setBindSettingId(lobbySettings[0]?.id ?? '')
                      setBindSettingOpen(true)
                    }}
                    onQuestStatus={(page) => {
                      setQuestTarget(page)
                      setQuestDialogOpen(true)
                    }}
                  />
                  {!session.closed_at && canRun ? (
                  <div className="session-table-toolbar">
                    <div className="session-toolbar-group" aria-label="Бой">
                      <Text className="session-toolbar-group__label">Бой</Text>
                      {!session.combat?.active ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={
                            busy ||
                            (session.seats.length === 0 &&
                              (session.combatants?.length ?? 0) === 0)
                          }
                          onClick={() => setCombatStartOpen(true)}
                        >
                          Бой
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => {
                            void run(async () => {
                              const updated = await patchSessionCombat(session.id, {
                                action: 'end',
                              })
                              setSession(updated)
                              setToast('Бой окончен')
                              setXpOpen(true)
                            })
                          }}
                        >
                          Конец боя
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setCombatantOpen(true)}
                      >
                        + Враги
                      </Button>
                      {session.seats.length > 0 ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => setConditionOpen(true)}
                        >
                          Состояние
                        </Button>
                      ) : null}
                      {session.seats.length > 0 ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => setEffectOpen(true)}
                        >
                          Эффект
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        disabled
                        title="генератор боя будет позже"
                      >
                        Генератор
                      </Button>
                    </div>
                    <div className="session-toolbar-group" aria-label="Награды">
                      <Text className="session-toolbar-group__label">Награды</Text>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || session.seats.length === 0}
                        onClick={() => setXpOpen(true)}
                      >
                        Опыт
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || session.seats.length === 0}
                        onClick={() => setLootOpen(true)}
                      >
                        Лут
                      </Button>
                    </div>
                    <div className="session-toolbar-group" aria-label="Сюжет">
                      <Text className="session-toolbar-group__label">Сюжет</Text>
                      {!session.setting_id ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => {
                            setBindSettingId(lobbySettings[0]?.id ?? '')
                            setBindSettingOpen(true)
                          }}
                        >
                          Привязать сеттинг
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => void openRevealDialog()}
                          >
                            Раскрыть
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => void openLoreBind()}
                          >
                            Локация
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={busy || (session.involved_pages ?? []).every((p) => p.page_kind !== 'quest')}
                            onClick={() => {
                              const quest = (session.involved_pages ?? []).find(
                                (p) => p.page_kind === 'quest',
                              )
                              if (!quest) {
                                setToast('Нет квеста в лоре сессии')
                                return
                              }
                              setQuestTarget(quest)
                              setQuestDialogOpen(true)
                            }}
                          >
                            Статус квеста
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setRestStub('Короткий отдых будет в S-07')}
                      >
                        Короткий отдых
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setRestStub('Долгий отдых будет в S-07')}
                      >
                        Долгий отдых
                      </Button>
                    </div>
                  </div>
                  ) : null}
                  {!session.closed_at &&
                  !canRun &&
                  session.seats.some((s) => ownCharacterIds.has(s.character_id)) ? (
                    <div className="session-table-toolbar">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setEffectOpen(true)}
                      >
                        Эффект
                      </Button>
                    </div>
                  ) : null}

                  <div className="session-live-desk__mobile-only">
                    {session.combat?.active ? (
                  <CombatTrack
                    combat={session.combat}
                    masterControls={canRun && !session.closed_at}
                    busy={busy}
                    onNext={() => {
                      void run(async () => {
                        const updated = await patchSessionCombat(session.id, {
                          action: 'next',
                        })
                        setSession(updated)
                      })
                    }}
                    onPrev={() => {
                      void run(async () => {
                        const updated = await patchSessionCombat(session.id, {
                          action: 'prev',
                        })
                        setSession(updated)
                      })
                    }}
                    onEnd={() => {
                      void run(async () => {
                        const updated = await patchSessionCombat(session.id, {
                          action: 'end',
                        })
                        setSession(updated)
                        setToast('Бой окончен')
                        setXpOpen(true)
                      })
                    }}
                    onSelect={(index) => {
                      void run(async () => {
                        const updated = await patchSessionCombat(session.id, {
                          active_index: index,
                        })
                        setSession(updated)
                      })
                    }}
                  />
                    ) : null}
                  </div>

                  {session.seats.length === 0 ? (
                    <Text tone="muted">
                      Игроков за столом нет.
                      {canRun
                        ? ' Откройте «Кто пришёл» или посадите противников.'
                        : seatCandidates.length > 0
                          ? ' Можно сесть за стол самому.'
                          : ''}
                    </Text>
                  ) : (
                    <div className="session-table-grid">
{session.seats.map((seat) => {
                      const isOwn = ownCharacterIds.has(seat.character_id)
                      const canControl = canRun || isOwn
                      return (
                        <SessionTableCard
                          key={seat.character_id}
                          seat={seat}
                          visibility={visibility}
                          revealAll={canSeeHidden}
                          masterControls={canControl && !session.closed_at && !session.is_observer}
                          busy={busy}
                          sheetLabel={canRun && !isOwn ? 'Смотреть' : 'Лист'}
                          onToggleInspiration={(next) => {
                            void run(async () => {
                              const updated = await patchSeatCombat(
                                session.id,
                                seat.character_id,
                                { inspiration: next },
                              )
                              setSession(updated)
                            })
                          }}
                          onAwardPiety={
                            canRun && !session.closed_at
                              ? () => setPietySeatId(seat.character_id)
                              : undefined
                          }
                          onRemoveCondition={(condition: SeatCondition) => {
                            void run(async () => {
                              const current = seat.conditions ?? []
                              const next = current.filter((c) => c.slug !== condition.slug)
                              const updated = await patchSeatCombat(
                                session.id,
                                seat.character_id,
                                { conditions: next },
                              )
                              setSession(updated)
                            })
                          }}
                          onRemoveEffect={(effect: SeatEffect) => {
                            void run(async () => {
                              const current = seat.effects ?? []
                              const next = current.filter((e) => e.id !== effect.id)
                              const updated = await patchSeatCombat(
                                session.id,
                                seat.character_id,
                                { effects: next },
                              )
                              setSession(updated)
                            })
                          }}
                          onClearConcentration={() => {
                            void run(async () => {
                              const updated = await patchSeatCombat(
                                session.id,
                                seat.character_id,
                                { clear_concentration: true },
                              )
                              setSession(updated)
                              setToast('Концентрация снята · связанные эффекты убраны')
                            })
                          }}
                          onAddCompanion={
                            canControl && !session.closed_at
                              ? () => {
                                  setCompanionHostId(seat.character_id)
                                  setCompanionName('')
                                  setCompanionHp(11)
                                  setCompanionAc(13)
                                  setCompanionOpen(true)
                                }
                              : undefined
                          }
                          onRemoveCompanion={(companionId) => {
                            void run(async () => {
                              const updated = await deleteSeatCompanion(
                                session.id,
                                seat.character_id,
                                companionId,
                              )
                              setSession(updated)
                            })
                          }}
                        />
                      )
                    })}
                    </div>
                  )}

                  {(session.combatants?.length ?? 0) > 0 ? (
                    <Stack gap={8}>
                      <Text as="h3" className="session-enemies-title">
                        Противники
                      </Text>
                      <div className="session-table-grid session-enemies-grid">
{session.combatants!.map((enemy) => {
                        const activeEntry =
                          session.combat?.active
                            ? session.combat.entries[session.combat.active_index]
                            : undefined
                        const isActiveTurn =
                          activeEntry?.kind === 'enemy' &&
                          activeEntry.ref_id === enemy.id
                        return (
                        <EnemyCard
                          key={enemy.id}
                          combatant={enemy}
                          visibility={visibility}
                          revealAll={canSeeHidden}
                          masterControls={canRun && !session.closed_at}
                          forceAbilitiesOpen={Boolean(isActiveTurn && canRun)}
                          busy={busy}
                          canSaveToSetting={Boolean(
                            canRun &&
                              !session.closed_at &&
                              session.setting_id,
                          )}
                          onSaveToSetting={() => {
                            void openHandoff(enemy)
                          }}
                          onDamage={(amount, memberId) => {
                            void run(async () => {
                              const updated = await patchSessionCombatant(
                                session.id,
                                enemy.id,
                                {
                                  damage: amount,
                                  member_id: memberId,
                                },
                              )
                              setSession(updated)
                            })
                          }}
                          onRemove={() => {
                            void run(async () => {
                              const updated = await deleteSessionCombatant(
                                session.id,
                                enemy.id,
                              )
                              setSession(updated)
                              setToast(`Убран: ${enemy.name}`)
                            })
                          }}
                        />
                        )
                      })}
                      </div>
                    </Stack>
                  ) : null}
                </Stack>
              </div>

              <aside className="session-live-desk__side session-live-desk__desktop-only">
                <div className="session-live-desk__side-head">
                  <Text as="h3">Заметки / Чат</Text>
                  <Button
                    type="button"
                    variant="ghost"
                    className="session-live-desk__side-toggle"
                    onClick={() => toggleSidePanel(!sidePanelOpen)}
                  >
                    {sidePanelOpen ? 'Свернуть' : 'Открыть'}
                  </Button>
                </div>
                <div className="session-live-desk__side-body">
                  <Stack gap={16}>
                <LobbyNotesPanel
                  lobbyId={session.lobby_id}
                  isOwner={canSeeHidden}
                  compact
                  defaultScope="party"
                  ownCharacterOptions={session.lobby_members
                    .filter((m) => ownCharacterIds.has(m.character_id))
                    .map((m) => ({ id: m.character_id, name: m.character_name }))}
                  onToast={setToast}
                  onError={setError}
                />
                <LobbyChatsPanel
                  lobbyId={session.lobby_id}
                  isOwner={canSeeHidden}
                  compact
                  ownCharacterOptions={session.lobby_members
                    .filter((m) => ownCharacterIds.has(m.character_id))
                    .map((m) => ({ id: m.character_id, name: m.character_name }))}
                  onToast={setToast}
                  onError={setError}
                />
                  </Stack>
                </div>
              </aside>
            </div>

            <div className="session-live-desk__mobile-only">
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
                    isOwner={canRun}
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
                <Stack gap={16}>
                <LobbyNotesPanel
                  lobbyId={session.lobby_id}
                  isOwner={canSeeHidden}
                  compact
                  defaultScope="party"
                  ownCharacterOptions={session.lobby_members
                    .filter((m) => ownCharacterIds.has(m.character_id))
                    .map((m) => ({ id: m.character_id, name: m.character_name }))}
                  onToast={setToast}
                  onError={setError}
                />
                <LobbyChatsPanel
                  lobbyId={session.lobby_id}
                  isOwner={canSeeHidden}
                  compact
                  ownCharacterOptions={session.lobby_members
                    .filter((m) => ownCharacterIds.has(m.character_id))
                    .map((m) => ({ id: m.character_id, name: m.character_name }))}
                  onToast={setToast}
                  onError={setError}
                />
                </Stack>
              ) : null}
            </div>
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

      <ApplyConditionDialog
        open={conditionOpen}
        seats={session.seats}
        busy={busy}
        onClose={() => setConditionOpen(false)}
        onApply={(condition, characterIds) => {
          void run(async () => {
            let latest = session
            for (const characterId of characterIds) {
              const seat = latest.seats.find((s) => s.character_id === characterId)
              const current = seat?.conditions ?? []
              if (current.some((c) => c.slug === condition.slug)) continue
              latest = await patchSeatCombat(latest.id, characterId, {
                conditions: [...current, condition],
              })
            }
            setSession(latest)
            setConditionOpen(false)
            setToast(
              characterIds.length === 1
                ? `Состояние: ${condition.name}`
                : `Состояние: ${condition.name} · ${characterIds.length}`,
            )
          })
        }}
      />

      <ApplyEffectDialog
        open={effectOpen}
        seats={session.seats}
        preferredSourceId={
          session.seats.find((s) => ownCharacterIds.has(s.character_id))?.character_id ??
          null
        }
        busy={busy}
        onClose={() => setEffectOpen(false)}
        onApply={(effect, characterIds) => {
          void run(async () => {
            const { buildBuffEffect, serializeActiveEffect } = await import(
              '../shared/dnd/activeEffects'
            )
            const sourceId = effect.source_character_id
            const built = buildBuffEffect({
              name: effect.name,
              sourceCharacterId: sourceId,
              sourceName: effect.source_name,
              linkedConcentration: effect.linked_concentration,
            })
            if (sourceId && built) {
              const payload = serializeActiveEffect(built)
              await shareLobbyEffect(session.lobby_id, {
                source_character_id: sourceId,
                name: String(payload.name),
                target_character_ids: characterIds,
                linked_concentration: Boolean(payload.linked_concentration),
                kind: typeof payload.kind === 'string' ? payload.kind : undefined,
                slug: typeof payload.slug === 'string' ? payload.slug : undefined,
                charges: typeof payload.charges === 'number' ? payload.charges : undefined,
                mods: Array.isArray(payload.mods)
                  ? (payload.mods as Array<{
                      target: string
                      op: string
                      value?: number
                      dice?: string
                      once?: boolean
                    }>)
                  : undefined,
                duration:
                  payload.duration && typeof payload.duration === 'object'
                    ? (payload.duration as {
                        unit: string
                        value?: number
                        remaining_rounds?: number
                      })
                    : undefined,
              })
            }
            let latest = session
            for (const characterId of characterIds) {
              const seat = latest.seats.find((s) => s.character_id === characterId)
              const current = seat?.effects ?? []
              const seatEffect = built
                ? {
                    ...effect,
                    id: `${built.id}-${characterId}`,
                    name: built.name,
                    linked_concentration: Boolean(built.linked_concentration),
                  }
                : { ...effect, id: `${effect.id}-${characterId}` }
              latest = await patchSeatCombat(latest.id, characterId, {
                effects: [...current, seatEffect],
              })
            }
            setSession(latest)
            setEffectOpen(false)
            setToast(
              characterIds.length === 1
                ? `Эффект: ${effect.name}`
                : `Эффект: ${effect.name} · ${characterIds.length}`,
            )
          })
        }}
      />

      <SessionQuestStatusDialog
        open={questDialogOpen}
        busy={busy}
        quest={questTarget}
        onClose={() => {
          setQuestDialogOpen(false)
          setQuestTarget(null)
        }}
        onSave={(payload) => {
          void run(async () => {
            const result = await updateSessionQuestStatus(session.id, payload)
            setSession(result.session)
            setEvents((prev) => {
              if (prev.some((e) => e.id === result.event.id)) return prev
              return [result.event, ...prev]
            })
            setQuestDialogOpen(false)
            setQuestTarget(null)
            setToast(
              result.journal_entry
                ? `${result.event.title} · в дневнике`
                : result.event.title,
            )
          })
        }}
      />

      <SessionLoreBindDialog
        open={loreBindOpen}
        busy={busy}
        pages={loreSetting?.pages ?? []}
        locationPageId={session.location_page_id ?? null}
        involvedPageIds={session.involved_page_ids ?? []}
        onClose={() => setLoreBindOpen(false)}
        onSave={(payload) => {
          void run(async () => {
            const next = await updateSession(session.id, {
              location_page_id: payload.location_page_id,
              clear_location_page: payload.clear_location_page,
              involved_page_ids: payload.involved_page_ids,
            })
            setSession(next)
            setLoreBindOpen(false)
            setToast('Лор сессии обновлён')
          })
        }}
      />

      <SettingPagePreviewDialog
        open={Boolean(previewPageId)}
        page={previewPage}
        pages={loreSetting?.pages ?? []}
        templates={loreSetting?.templates ?? []}
        isOwner={sessionCanRun(session)}
        settingId={session.setting_id}
        onClose={() => setPreviewPageId(null)}
        onOpenPage={(id) => setPreviewPageId(id)}
        onOpenInWiki={(id) => {
          if (!session.setting_id) return
          navigate(`/settings/${session.setting_id}?page=${id}`)
        }}
      />

      <SettingTableRevealDialog
        open={revealOpen}
        busy={busy}
        settingId={session.setting_id}
        settingName={session.setting_name ?? revealSetting?.name}
        pages={revealSetting?.pages ?? []}
        onClose={() => {
          setRevealOpen(false)
        }}
        onReveal={(payload) => {
          void run(async () => {
            const result = await revealSessionPage(session.id, {
              page_id: payload.page_id,
              reveal_subtree: payload.reveal_subtree,
              revealed: true,
            })
            setSession(result.session)
            setEvents((prev) => {
              if (prev.some((e) => e.id === result.event.id)) return prev
              return [result.event, ...prev]
            })
            if (revealSetting) {
              const rootId = result.page_id
              const byParent = new Map<string | null, string[]>()
              for (const p of revealSetting.pages) {
                const list = byParent.get(p.parent_id) ?? []
                list.push(p.id)
                byParent.set(p.parent_id, list)
              }
              const ids = new Set<string>([rootId])
              if (result.reveal_subtree) {
                const walk = (id: string) => {
                  for (const child of byParent.get(id) ?? []) {
                    ids.add(child)
                    walk(child)
                  }
                }
                walk(rootId)
              }
              setRevealSetting({
                ...revealSetting,
                pages: revealSetting.pages.map((p) =>
                  ids.has(p.id) ? { ...p, revealed: true } : p,
                ),
              })
            }
            setRevealOpen(false)
            setToast(result.event.title)
          })
        }}
      />

      <SettingTableHandoffDialog
        open={handoffOpen}
        busy={busy}
        settingName={session.setting_name ?? handoffSetting?.name}
        draft={handoffDraft}
        templates={handoffSetting?.templates ?? []}
        pages={handoffSetting?.pages ?? []}
        onClose={() => {
          setHandoffOpen(false)
          setHandoffDraft(null)
        }}
        onCreate={(payload) => {
          if (!session.setting_id) return
          void run(async () => {
            const next = await createSettingPage(session.setting_id!, {
              title: payload.title,
              body: payload.body,
              gm_body: payload.gm_body,
              parent_id: payload.parent_id,
              page_kind: payload.page_kind,
              template_id: payload.template_id,
              fields: payload.fields,
              tags: payload.tags,
            })
            setHandoffSetting(next)
            const created = [...next.pages]
              .filter((p) => p.title === payload.title)
              .sort(
                (a, b) =>
                  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
              )[0]
            const href = created
              ? `/settings/${session.setting_id}?page=${created.id}`
              : `/settings/${session.setting_id}`
            setHandoffLink(href)
            setHandoffOpen(false)
            setHandoffDraft(null)
            setToast(`В сеттинг: ${payload.title}`)
          })
        }}
      />

      <AddCombatantDialog
        open={combatantOpen}
        busy={busy}
        onClose={() => setCombatantOpen(false)}
        onSubmit={(payload) => {
          void run(async () => {
            const updated = await addSessionCombatants(session.id, payload)
            setSession(updated)
            setCombatantOpen(false)
            const n = payload.count ?? 1
            setToast(n > 1 ? `На столе: ${n}` : 'Противник на столе')
          })
        }}
      />

      <StartCombatDialog
        open={combatStartOpen}
        busy={busy}
        seats={session.seats}
        combatants={session.combatants ?? []}
        onClose={() => setCombatStartOpen(false)}
        onSubmit={(entries) => {
          void run(async () => {
            const updated = await startSessionCombat(session.id, { entries })
            setSession(updated)
            setCombatStartOpen(false)
            setToast('Бой начат')
          })
        }}
      />

      <AwardXpDialog
        open={xpOpen}
        busy={busy}
        seats={session.seats}
        combatants={session.combatants ?? []}
        onClose={() => setXpOpen(false)}
        onSubmit={(payload) => {
          void run(async () => {
            const result = await awardSessionXp(session.id, payload)
            setSession(result.session)
            setXpOpen(false)
            setToast(
              result.awarded_each > 0
                ? `+${result.awarded_each} XP · ${result.recipients.join(', ')}`
                : 'XP: 0',
            )
            await reloadEvents()
          })
        }}
      />

      <PietyAwardDialog
        open={pietySeatId != null}
        busy={busy}
        characterName={
          session.seats.find((s) => s.character_id === pietySeatId)?.character_name ?? ''
        }
        currentScore={
          session.seats.find((s) => s.character_id === pietySeatId)?.piety_score ?? null
        }
        onClose={() => setPietySeatId(null)}
        onSubmit={({ delta, comment }) => {
          const characterId = pietySeatId
          if (!characterId) return
          void run(async () => {
            const result = await awardLobbyPiety(session.lobby_id, {
              character_id: characterId,
              delta,
              comment,
            })
            setSession((prev) =>
              prev
                ? {
                    ...prev,
                    seats: prev.seats.map((s) =>
                      s.character_id === characterId
                        ? { ...s, piety_score: result.score, piety_god: result.god }
                        : s,
                    ),
                  }
                : prev,
            )
            setPietySeatId(null)
            setToast(`Благочестие: ${delta > 0 ? '+' : ''}${delta} → ${result.score}`)
          })
        }}
      />

      <AwardLootDialog
        open={lootOpen}
        busy={busy}
        seats={session.seats}
        artifacts={settingArtifacts}
        onClose={() => setLootOpen(false)}
        onSubmit={(payload) => {
          void run(async () => {
            const result = await awardSessionLoot(session.id, payload)
            setSession(result.session)
            setLootOpen(false)
            setToast(`Лут: ${result.summary}`)
            await reloadEvents()
          })
        }}
      />

      <Dialog
        open={companionOpen}
        title="Напарник"
        primaryLabel={busy ? 'Добавляем…' : 'Добавить'}
        secondaryLabel="Отмена"
        busy={busy}
        onPrimary={() => {
          if (!companionHostId || !companionName.trim()) return
          void run(async () => {
            const updated = await addSeatCompanion(session.id, companionHostId, {
              name: companionName.trim(),
              hp_current: companionHp,
              hp_max: companionHp,
              ac: companionAc,
            })
            setSession(updated)
            setCompanionOpen(false)
            setToast('Напарник за столом')
          })
        }}
        onSecondary={() => setCompanionOpen(false)}
      >
        <Stack gap={12}>
          <Text tone="muted">Отдельная карточка под хозяином — видно союзникам по видимости.</Text>
          <Field label="Имя">
            <Input
              value={companionName}
              onChange={(e) => setCompanionName(e.target.value)}
              placeholder="Волк / скакун / фамильяр"
            />
          </Field>
          <div className="manual-roll-form__row">
            <Field label="ХП">
              <NumberInput value={companionHp} min={0} max={9999} onValueChange={setCompanionHp} />
            </Field>
            <Field label="КД">
              <NumberInput value={companionAc} min={0} max={40} onValueChange={setCompanionAc} />
            </Field>
          </div>
        </Stack>
      </Dialog>

      <Dialog
        open={seatPickOpen}
        title="Сесть за стол"
        primaryLabel={busy ? 'Сажаем…' : 'Сесть'}
        secondaryLabel="Отмена"
        busy={busy}
        onPrimary={() => {
          if (!seatPickId) return
          void run(async () => {
            const updated = await seatCharacter(session.id, seatPickId)
            setSession(updated)
            setSeatPickOpen(false)
            setToast('Вы за столом')
          })
        }}
        onSecondary={() => setSeatPickOpen(false)}
      >
        <Stack gap={12}>
          <Text tone="muted">Выберите персонажа из состава лобби.</Text>
          <Field label="Персонаж">
            <select
              className="ui-input"
              value={seatPickId}
              disabled={busy}
              onChange={(e) => setSeatPickId(e.target.value)}
            >
              {seatCandidates.map((m) => (
                <option key={m.character_id} value={m.character_id}>
                  {m.character_name}
                </option>
              ))}
            </select>
          </Field>
        </Stack>
      </Dialog>

      <Dialog
        open={bindSettingOpen}
        title="Привязать сеттинг"
        primaryLabel={busy ? 'Сохраняем…' : 'Привязать'}
        secondaryLabel="Отмена"
        busy={busy}
        onPrimary={() => {
          if (!bindSettingId) {
            setToast('Сначала создайте сеттинг в лобби')
            return
          }
          void run(async () => {
            const next = await updateSession(session.id, { setting_id: bindSettingId })
            setSession(next)
            setBindSettingOpen(false)
            setToast('Сеттинг привязан')
            await reload()
          })
        }}
        onSecondary={() => setBindSettingOpen(false)}
      >
        <Stack gap={12}>
          {lobbySettings.length === 0 ? (
            <Text tone="muted">
              В лобби ещё нет сеттинга.{' '}
              <a href={`/lobbies/${session.lobby_id}#setting`}>Создать в лобби</a>
            </Text>
          ) : (
            <Field label="Сеттинг лобби">
              <select
                className="ui-input"
                value={bindSettingId}
                disabled={busy}
                onChange={(e) => setBindSettingId(e.target.value)}
              >
                {lobbySettings.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </Stack>
      </Dialog>

      <Dialog
        open={deleteOpen}
        title="Удалить сессию"
        primaryLabel={busy ? 'Удаляем…' : 'Удалить'}
        secondaryLabel="Отмена"
        busy={busy}
        onPrimary={() => {
          if (deleteConfirmName.trim() !== session.name) {
            setError('Введите точное название сессии')
            return
          }
          void run(async () => {
            await deleteSession(session.id)
            setDeleteOpen(false)
            navigate(`/lobbies/${session.lobby_id}#sessions`, {
              state: { toast: 'Сессия удалена' },
            })
          })
        }}
        onSecondary={() => setDeleteOpen(false)}
      >
        <Stack gap={12}>
          <Text tone="muted">
            Удаление необратимо. Введите название сессии «{session.name}» для подтверждения.
          </Text>
          <Field label="Название сессии">
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={session.name}
            />
          </Field>
        </Stack>
      </Dialog>

      <Dialog
        open={Boolean(restStub)}
        title="Отдых"
        primaryLabel="Понятно"
        onPrimary={() => setRestStub(null)}
        onSecondary={() => setRestStub(null)}
      >
        <Text tone="muted">{restStub}</Text>
      </Dialog>

      <Toast
        message={toast}
        onClose={() => {
          setToast(null)
          setHandoffLink(null)
        }}
        durationMs={handoffLink ? 6000 : 2800}
      />
      {handoffLink && toast ? (
        <div className="session-handoff-toast-link">
          <Link to={handoffLink} onClick={() => setHandoffLink(null)}>
            Открыть в вики →
          </Link>
        </div>
      ) : null}
    </main>
  )
}
