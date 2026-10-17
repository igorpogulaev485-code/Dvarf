import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { LobbyChatsPanel } from '../features/lobby/LobbyChatsPanel'
import { LobbyNotesPanel } from '../features/lobby/LobbyNotesPanel'
import { ManualRollForm } from '../features/lobby/ManualRollForm'
import { AddCombatantDialog } from '../features/lobby/AddCombatantDialog'
import { ApplyConditionDialog } from '../features/lobby/ApplyConditionDialog'
import { ApplyEffectDialog } from '../features/lobby/ApplyEffectDialog'
import { AwardLootDialog } from '../features/lobby/AwardLootDialog'
import { AwardXpDialog } from '../features/lobby/AwardXpDialog'
import { CombatTrack } from '../features/lobby/CombatTrack'
import { EncounterGenerateDialog } from '../features/lobby/EncounterGenerateDialog'
import { EncounterTemplatesDialog } from '../features/lobby/EncounterTemplatesDialog'
import { EnemyCard } from '../features/lobby/EnemyCard'
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
  awardSessionLoot,
  awardSessionXp,
  closeSession,
  createSessionRoll,
  deleteLobbyEncounterTemplate,
  deleteSeatCompanion,
  deleteSessionCombatant,
  deploySessionEncounterTemplate,
  createLobbyEncounterTemplate,
  createSettingPage,
  generateSessionEncounter,
  getLobby,
  getSession,
  getSetting,
  listSessionEvents,
  revealSessionPage,
  patchSeatCombat,
  patchSessionCombat,
  patchSessionCombatant,
  saveSessionEncounterTemplate,
  seatCharacter,
  startSessionCombat,
  unseatCharacter,
  updateSession,
  type EncounterGenerateResult,
  type EncounterTemplate,
  type SeatCondition,
  type SeatEffect,
  type SessionDetail,
  type SessionEvent,
  type SessionCombatant,
  type SettingDetail,
} from '../shared/api/lobbies'
import { Button, Dialog, Field, Input, NumberInput, Panel, Stack, Text, Toast } from '../ui'

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
  const [lootOpen, setLootOpen] = useState(false)
  const [encounterOpen, setEncounterOpen] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [generatorResult, setGeneratorResult] = useState<EncounterGenerateResult | null>(
    null,
  )
  const [templates, setTemplates] = useState<EncounterTemplate[]>([])
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [handoffDraft, setHandoffDraft] = useState<SettingHandoffDraft | null>(null)
  const [handoffSetting, setHandoffSetting] = useState<SettingDetail | null>(null)
  const [handoffLink, setHandoffLink] = useState<string | null>(null)
  const [revealOpen, setRevealOpen] = useState(false)
  const [revealSetting, setRevealSetting] = useState<SettingDetail | null>(null)
  const isOwnerRef = useRef(false)

  const reload = useCallback(async () => {
    const [detail, chars] = await Promise.all([getSession(sessionId), listCharacters()])
    setSession(detail)
    setOwnCharacterIds(new Set(chars.map((c) => c.id)))
    if (detail.is_owner) {
      try {
        const lobby = await getLobby(detail.lobby_id)
        setTemplates(lobby.encounter_templates ?? [])
      } catch {
        setTemplates([])
      }
    }
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

  isOwnerRef.current = Boolean(session?.is_owner)

  useSessionRealtime(session?.id, {
    onEvent: (incoming) => {
      setEvents((prev) => {
        if (prev.some((e) => e.id === incoming.id)) return prev
        if (rollsOnly && incoming.event_type !== 'roll') return prev
        return [incoming, ...prev]
      })
      // T2: игрокам toast при раскрытии со стола (мастер уже тостнул локально)
      if (
        incoming.event_type === 'reveal' &&
        !isOwnerRef.current &&
        incoming.title
      ) {
        setToast(incoming.title)
      }
    },
    onSessionUpdate: (next) => {
      setSession(next)
    },
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
              <Stack gap={12}>
                {!session.closed_at &&
                (session.is_owner ||
                  session.seats.some((s) => ownCharacterIds.has(s.character_id))) ? (
                  <div className="session-table-toolbar">
                    {session.is_owner && session.seats.length > 0 ? (
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
                    {session.is_owner ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setCombatantOpen(true)}
                      >
                        + Противник
                      </Button>
                    ) : null}
                    {session.is_owner && !session.combat?.active ? (
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
                    ) : null}
                    {session.is_owner ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || session.seats.length === 0}
                        onClick={() => setXpOpen(true)}
                      >
                        XP
                      </Button>
                    ) : null}
                    {session.is_owner ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || session.seats.length === 0}
                        onClick={() => setLootOpen(true)}
                      >
                        Лут
                      </Button>
                    ) : null}
                    {session.is_owner ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setEncounterOpen(true)}
                      >
                        Энкаунтер
                      </Button>
                    ) : null}
                    {session.is_owner && session.setting_id && !session.closed_at ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void openRevealDialog()}
                      >
                        Раскрыть
                      </Button>
                    ) : null}
                    {session.is_owner ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || session.seats.length === 0}
                        onClick={() => {
                          setGeneratorResult(null)
                          setGeneratorOpen(true)
                        }}
                      >
                        Генератор
                      </Button>
                    ) : null}
                    <Text tone="muted" className="session-table-toolbar__hint">
                      Генератор — подобрать бой. Энкаунтер — шаблон.
                    </Text>
                  </div>
                ) : null}

                {session.combat?.active ? (
                  <CombatTrack
                    combat={session.combat}
                    masterControls={session.is_owner && !session.closed_at}
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

                {session.seats.length === 0 ? (
                  <Text tone="muted">
                    Игроков за столом нет.
                    {session.is_owner
                      ? ' Откройте «Кто пришёл» или посадите противников.'
                      : ''}
                  </Text>
                ) : (
                  <div className="session-table-grid">
                    {session.seats.map((seat) => {
                      const isOwn = ownCharacterIds.has(seat.character_id)
                      const canControl = session.is_owner || isOwn
                      return (
                        <SessionTableCard
                          key={seat.character_id}
                          seat={seat}
                          visibility={visibility}
                          revealAll={session.is_owner}
                          masterControls={canControl && !session.closed_at}
                          busy={busy}
                          sheetLabel={session.is_owner && !isOwn ? 'Смотреть' : 'Лист'}
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
                          revealAll={session.is_owner}
                          masterControls={session.is_owner && !session.closed_at}
                          forceAbilitiesOpen={Boolean(isActiveTurn && session.is_owner)}
                          busy={busy}
                          canSaveToSetting={Boolean(
                            session.is_owner &&
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
              <Stack gap={16}>
                <LobbyNotesPanel
                  lobbyId={session.lobby_id}
                  isOwner={session.is_owner}
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
                  isOwner={session.is_owner}
                  compact
                  ownCharacterOptions={session.lobby_members
                    .filter((m) => ownCharacterIds.has(m.character_id))
                    .map((m) => ({ id: m.character_id, name: m.character_name }))}
                  onToast={setToast}
                  onError={setError}
                />
              </Stack>
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
            let latest = session
            for (const characterId of characterIds) {
              const seat = latest.seats.find((s) => s.character_id === characterId)
              const current = seat?.effects ?? []
              latest = await patchSeatCombat(latest.id, characterId, {
                effects: [...current, { ...effect, id: `${effect.id}-${characterId}` }],
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

      <AwardLootDialog
        open={lootOpen}
        busy={busy}
        seats={session.seats}
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

      <EncounterTemplatesDialog
        open={encounterOpen}
        busy={busy}
        templates={templates}
        canSaveFromTable={(session.combatants?.length ?? 0) > 0}
        onClose={() => setEncounterOpen(false)}
        onSaveFromTable={(name) => {
          void run(async () => {
            const lobby = await saveSessionEncounterTemplate(session.id, { name })
            setTemplates(lobby.encounter_templates ?? [])
            setToast(`Шаблон «${name}» сохранён`)
          })
        }}
        onDeploy={(templateId) => {
          void run(async () => {
            const updated = await deploySessionEncounterTemplate(session.id, templateId)
            setSession(updated)
            setEncounterOpen(false)
            setToast('Энкаунтер на столе')
          })
        }}
        onDelete={(templateId) => {
          void run(async () => {
            const lobby = await deleteLobbyEncounterTemplate(
              session.lobby_id,
              templateId,
            )
            setTemplates(lobby.encounter_templates ?? [])
            setToast('Шаблон удалён')
          })
        }}
      />

      <EncounterGenerateDialog
        open={generatorOpen}
        busy={busy}
        result={generatorResult}
        onClose={() => {
          setGeneratorOpen(false)
          setGeneratorResult(null)
        }}
        onInvalidate={() => setGeneratorResult(null)}
        onGenerate={(payload) => {
          void run(async () => {
            const next = await generateSessionEncounter(session.id, payload)
            setGeneratorResult(next)
            if (!next.waves.some((w) => w.boss.options.length || w.pack.options.length)) {
              setToast('Пустой пул — смени темы или локацию')
            }
          })
        }}
        onDeploy={({ boss, pack, packCount }) => {
          void run(async () => {
            let updated = await addSessionCombatants(session.id, {
              slug: boss.slug,
              count: 1,
            })
            updated = await addSessionCombatants(session.id, {
              slug: pack.slug,
              count: Math.max(1, Math.min(20, packCount)),
            })
            setSession(updated)
            setGeneratorOpen(false)
            setGeneratorResult(null)
            setToast(
              `На столе: ${boss.name_ru} + ${pack.name_ru}${
                packCount > 1 ? `×${packCount}` : ''
              }`,
            )
          })
        }}
        onSaveAsTemplate={({ name, boss, pack, packCount }) => {
          void run(async () => {
            const lobby = await createLobbyEncounterTemplate(session.lobby_id, {
              name,
              entries: [
                { name: boss.name_ru, slug: boss.slug, count: 1, xp: boss.xp },
                {
                  name: pack.name_ru,
                  slug: pack.slug,
                  count: Math.max(1, Math.min(20, packCount)),
                  xp: pack.xp,
                },
              ],
            })
            setTemplates(lobby.encounter_templates ?? [])
            setToast(`Шаблон «${name}» сохранён`)
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
