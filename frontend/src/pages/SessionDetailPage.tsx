import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { openProductSite } from '../shared/brand/creed20'
import { LobbyChatsPanel } from '../features/lobby/LobbyChatsPanel'
import { LobbyNotesPanel } from '../features/lobby/LobbyNotesPanel'
import { ManualRollForm } from '../features/lobby/ManualRollForm'
import { AddCombatantDialog } from '../features/lobby/AddCombatantDialog'
import { AddStoryCompanionDialog } from '../features/lobby/AddStoryCompanionDialog'
import { seatCompanionInInitiativeSeed } from '../features/lobby/companionCombatSeat'
import {
  EnemyAttackDialog,
  blockFromKitKind,
  type EnemyAttackSubmit,
} from '../features/lobby/EnemyAttackDialog'
import { ReactionPromptDialog } from '../features/lobby/ReactionPromptDialog'
import type { FeedFilter } from '../features/lobby/SessionEventFeed'
import { ApplyConditionDialog } from '../features/lobby/ApplyConditionDialog'
import { ApplyEffectDialog } from '../features/lobby/ApplyEffectDialog'
import { LootChestBoard, RewardsDialog } from '../features/lobby/RewardsDialog'
import { MasterGrantDialog } from '../features/lobby/MasterGrantDialog'
import { PietyAwardDialog } from '../features/lobby/PietyAwardDialog'
import { CombatTrack } from '../features/lobby/CombatTrack'
import {
  EncounterGenerateDialog,
  type EncounterDeployPick,
  type EncounterWikiParent,
} from '../features/lobby/EncounterGenerateDialog'
import { COMBAT_PARENT_KINDS } from '../features/lobby/settingKinds'
import { EnemyCard } from '../features/lobby/EnemyCard'
import { SessionLoreBindDialog } from '../features/lobby/SessionLoreBindDialog'
import { SessionLorePanel } from '../features/lobby/SessionLorePanel'
import { SessionQuestStatusDialog } from '../features/lobby/SessionQuestStatusDialog'
import { SettingPagePreviewDialog } from '../features/lobby/SettingPagePreviewDialog'
import { SettingTableHandoffDialog } from '../features/lobby/SettingTableHandoffDialog'
import { SettingTableRevealDialog } from '../features/lobby/SettingTableRevealDialog'
import { draftFromCombatant, type SettingHandoffDraft } from '../features/lobby/settingHandoff'
import { StartCombatDialog } from '../features/lobby/StartCombatDialog'
import { EndCombatDialog } from '../features/lobby/EndCombatDialog'
import { SideSwitchDialog } from '../features/lobby/SideSwitchDialog'
import { sideLabel as combatSideLabel } from '../features/lobby/combatSides'
import { InitiativeRollDialog } from '../features/lobby/InitiativeRollDialog'
import { SessionAttendancePanel } from '../features/lobby/SessionAttendancePanel'
import { SessionEventFeed } from '../features/lobby/SessionEventFeed'
import { SessionLiveTabs, type SessionLiveTabId } from '../features/lobby/SessionLiveTabs'
import { SessionTableCard } from '../features/lobby/SessionTableCard'
import { SettingWikiReader } from '../features/lobby/SettingWikiReader'
import { useSessionRealtime } from '../features/lobby/useSessionRealtime'
import { letterBadge } from '../shared/api/chat'
import { normalizeCampaignRules } from '../features/lobby/campaignRules'
import { normalizeVisibilityProfile } from '../features/lobby/visibilityProfile'
import { getCharacter, listCharacters, updateCharacter } from '../shared/api/characters'
import {
  emptyTurnEconomy,
  readTurnEconomy,
  serializeTurnEconomy,
  toggleTurnMark,
  type TurnEconomyMarkKey,
  type TurnEconomyState,
} from '../shared/dnd/turnEconomy'
import { asRecord } from '../features/characters/sheetTypes'
import { ApiRequestError } from '../shared/api/client'
import {
  addSeatCompanion,
  addSessionCombatants,
  awardLobbyPiety,
  awardSessionXp,
  grantSessionInventory,
  sessionLootChest,
  startPartyRest,
  closeSession,
  createSessionRoll,
  deleteSeatCompanion,
  patchSeatCompanion,
  deleteSession,
  deleteSessionCombatant,
  createSettingPage,
  generateSessionEncounter,
  getLobby,
  getSession,
  getSetting,
  listSessionEvents,
  listSessionWikiCombats,
  revealSessionPage,
  updateSessionQuestStatus,
  patchSeatCombat,
  shareLobbyEffect,
  patchSessionCombat,
  patchSessionCombatant,
  resolveSessionCombatAttack,
  resolveSessionCombatReaction,
  resolveStudySessionCombatant,
  shareStudiedSessionCombatant,
  studySessionCombatant,
  rollSessionCombatInitiative,
  seatCharacter,
  startCombatFromWiki,
  startSessionCombat,
  type CombatantAction,
  type CombatEntry,
  type CombatEntryInput,
  type EncounterGenerateResult,
  type EncounterWikiPick,
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
  type WikiCombatPage,
} from '../shared/api/lobbies'
import { Button, Dialog, Field, Input, Panel, Stack, Text, Toast } from '../ui'

const SIDE_PANEL_KEY = 'dvarf.session.sidePanelOpen'

function sessionCanRun(session: { can_run_session?: boolean; is_owner?: boolean } | null | undefined): boolean {
  if (!session) return false
  return Boolean(session.can_run_session ?? session.is_owner)
}

/** G-01: высадка через S-02 (combatants + start / скрытые волны). */
async function deployGeneratorToTable(
  session: SessionDetail,
  picks: EncounterDeployPick[],
): Promise<SessionDetail> {
  const active = Boolean(session.combat?.active)
  let latest = session
  const waveIds = new Map<number, string[]>()

  let nextHiddenWave = 2
  if (active) {
    for (const w of session.combat?.waves ?? []) {
      nextHiddenWave = Math.max(nextHiddenWave, (w.index ?? 1) + 1)
    }
  }

  for (const pick of picks) {
    const roles: Array<{ slug: string; count: number }> = []
    if (pick.boss) roles.push({ slug: pick.boss.slug, count: 1 })
    if (pick.pack && pick.packCount >= 1) {
      roles.push({ slug: pick.pack.slug, count: pick.packCount })
    }
    if (roles.length === 0) continue

    const waveIndex = active ? nextHiddenWave : pick.waveIndex
    const condition =
      pick.waveIndex <= 1 ? 'сразу' : `волна ${pick.waveIndex}`
    const ids: string[] = []
    for (const role of roles) {
      const before = new Set((latest.combatants ?? []).map((c) => c.id))
      latest = await addSessionCombatants(session.id, {
        slug: role.slug,
        count: role.count,
        wave_index: waveIndex,
        wave_condition_text: condition,
      })
      const added = (latest.combatants ?? []).filter((c) => !before.has(c.id))
      for (const row of added) ids.push(row.id)
    }
    waveIds.set(pick.waveIndex, ids)
    if (active) nextHiddenWave += 1
  }

  if (active) return latest

  const entries: CombatEntryInput[] = []
  for (const seat of latest.seats) {
    entries.push({
      kind: 'pc',
      ref_id: seat.character_id,
      name: seat.character_name,
      initiative: null,
      initiative_pending: true,
      dex_mod: seat.dex_mod ?? null,
    })
    for (const companion of seat.companions ?? []) {
      if (!seatCompanionInInitiativeSeed(companion)) continue
      entries.push({
        kind: 'companion',
        ref_id: seat.character_id,
        companion_id: companion.id,
        name: `${companion.name} (${seat.character_name})`,
        initiative: null,
        initiative_pending: true,
        dex_mod: companion.dex_mod ?? null,
      })
    }
  }
  for (const [, ids] of waveIds) {
    for (const id of ids) {
      const enemy = (latest.combatants ?? []).find((c) => c.id === id)
      const label =
        enemy && (enemy.member_count ?? 1) > 1
          ? `${enemy.name} ×${enemy.alive_count ?? enemy.member_count}`
          : enemy?.name || 'Враг'
      entries.push({
        kind: 'enemy',
        ref_id: id,
        name: label,
        initiative: 10 + (enemy?.dex_mod ?? 0),
        initiative_pending: false,
        dex_mod: enemy?.dex_mod ?? null,
      })
    }
  }

  const waves = [...waveIds.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, combatant_ids]) => ({
      index,
      condition_text: index <= 1 ? 'сразу' : `волна ${index}`,
      combatant_ids,
      released: index === 1 ? true : false,
    }))

  if (entries.length === 0 || waves.length === 0) return latest
  return startSessionCombat(session.id, { entries, waves })
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
  const [ownTurnEconomy, setOwnTurnEconomy] = useState<TurnEconomyState>(() =>
    emptyTurnEconomy(),
  )
  const [ownTurnSheetVersion, setOwnTurnSheetVersion] = useState<number | null>(null)
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')
  const [liveTab, setLiveTab] = useState<SessionLiveTabId>('table')
  const [attackOpen, setAttackOpen] = useState(false)
  const [attackCombatant, setAttackCombatant] = useState<SessionCombatant | null>(null)
  const [attackAction, setAttackAction] = useState<CombatantAction | null>(null)
  const [attackBlock, setAttackBlock] = useState<EnemyAttackSubmit['action_block']>('actions')
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
  const [conditionOpen, setConditionOpen] = useState(false)
  const [effectOpen, setEffectOpen] = useState(false)
  const [combatantOpen, setCombatantOpen] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [generatorResult, setGeneratorResult] = useState<EncounterGenerateResult | null>(
    null,
  )
  const [wikiCombats, setWikiCombats] = useState<WikiCombatPage[]>([])
  const [wikiCombatPickOpen, setWikiCombatPickOpen] = useState(false)
  const [wikiCombatListOpen, setWikiCombatListOpen] = useState(false)
  const [wikiCombatPickId, setWikiCombatPickId] = useState('')
  const [combatStartOpen, setCombatStartOpen] = useState(false)
  const [combatEndOpen, setCombatEndOpen] = useState(false)
  const [endCombatThenClose, setEndCombatThenClose] = useState(false)
  const [initRollEntry, setInitRollEntry] = useState<CombatEntry | null>(null)
  const [sideEntry, setSideEntry] = useState<CombatEntry | null>(null)
  const [rewardsOpen, setRewardsOpen] = useState(false)
  const [rewardsFocus, setRewardsFocus] = useState<'combat' | 'manual' | 'loot'>('combat')
  const [pietySeatId, setPietySeatId] = useState<string | null>(null)
  const [settingArtifacts, setSettingArtifacts] = useState<SettingArtifact[]>([])
  const [lobbySettings, setLobbySettings] = useState<SettingSummary[]>([])
  const [sidePanelOpen, setSidePanelOpen] = useState(readSidePanelOpen)
  const [sideTab, setSideTab] = useState<'notes' | 'wiki'>('notes')
  const [wikiSetting, setWikiSetting] = useState<SettingDetail | null>(null)
  const [seatPickOpen, setSeatPickOpen] = useState(false)
  const [seatPickId, setSeatPickId] = useState('')
  const [bindSettingOpen, setBindSettingOpen] = useState(false)
  const [bindSettingId, setBindSettingId] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [grantOpen, setGrantOpen] = useState(false)
  const [grantSeatId, setGrantSeatId] = useState<string | null>(null)
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
        setLoreSetting(setting)
      } catch {
        setSettingArtifacts([])
      }
      try {
        const wiki = await listSessionWikiCombats(detail.id)
        setWikiCombats(wiki.pages ?? [])
      } catch {
        setWikiCombats([])
      }
    } else {
      setSettingArtifacts([])
      setWikiCombats([])
    }
  }, [sessionId])

  function picksToWikiPicks(picks: EncounterDeployPick[]): EncounterWikiPick[] {
    return picks
      .filter((p) => p.boss || (p.pack && p.packCount >= 1))
      .map((p) => ({
        wave_index: p.waveIndex,
        condition_text:
          p.waveIndex <= 1 ? 'сразу' : 'когда пала предыдущая',
        boss_slug: p.boss?.slug ?? null,
        boss_name: p.boss?.name_ru ?? null,
        boss_xp: p.boss?.xp ?? null,
        pack_slug: p.pack?.slug ?? null,
        pack_name: p.pack?.name_ru ?? null,
        pack_xp: p.pack?.xp ?? null,
        pack_count: p.pack && p.packCount >= 1 ? p.packCount : 0,
      }))
  }

  const reloadEvents = useCallback(async () => {
    const list = await listSessionEvents(sessionId, {
      feedFilter: feedFilter === 'all' ? undefined : feedFilter,
      rollsOnly: feedFilter === 'rolls',
    })
    setEvents(list)
  }, [sessionId, feedFilter])

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
        if (feedFilter === 'rolls' && incoming.event_type !== 'roll') return prev
        if (
          feedFilter === 'combat' &&
          incoming.event_type !== 'combat' &&
          !(incoming.payload as { combat_journal?: boolean } | undefined)?.combat_journal
        ) {
          return prev
        }
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
    onPartyRest: (msg) => {
      if (isOwnerRef.current) return
      setToast(
        msg.summary ||
          (msg.kind === 'short'
            ? msg.short_label || 'Короткий отдых'
            : msg.long_label || 'Долгий отдых') + ' — открой лист',
      )
    },
    onReconnect: () => {
      pullSession()
      void reloadEvents()
    },
  })

  const canManageLetters = Boolean(session?.is_owner || session?.is_comaster)

  useEffect(() => {
    if (!canManageLetters || !session) {
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
  }, [canManageLetters, session, liveTab])

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
  const campaignRules = useMemo(
    () => normalizeCampaignRules(session?.campaign_rules),
    [session?.campaign_rules],
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

  const activeCombatEntry =
    session?.combat?.active ? session.combat.entries[session.combat.active_index] : undefined
  const yourTurnCharacterId =
    activeCombatEntry?.kind === 'pc' &&
    !activeCombatEntry.initiative_pending &&
    ownCharacterIds.has(activeCombatEntry.ref_id)
      ? activeCombatEntry.ref_id
      : null

  useEffect(() => {
    if (!yourTurnCharacterId) {
      setOwnTurnEconomy(emptyTurnEconomy())
      setOwnTurnSheetVersion(null)
      return
    }
    let cancelled = false
    void getCharacter(yourTurnCharacterId)
      .then((detail) => {
        if (cancelled) return
        const combat = asRecord(asRecord(detail.sheet).combat)
        setOwnTurnEconomy(readTurnEconomy(combat.turn_economy))
        setOwnTurnSheetVersion(detail.sheet_version)
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [yourTurnCharacterId, session?.combat?.active_index, session?.combat?.round])

  const onToggleOwnTurnMark = useCallback(
    (mark: TurnEconomyMarkKey) => {
      if (!yourTurnCharacterId || ownTurnSheetVersion == null) return
      const next = toggleTurnMark(ownTurnEconomy, mark)
      setOwnTurnEconomy(next)
      void getCharacter(yourTurnCharacterId)
        .then((detail) => {
          const sheet = { ...(detail.sheet as Record<string, unknown>) }
          const combat = { ...asRecord(sheet.combat), turn_economy: serializeTurnEconomy(next) }
          sheet.combat = combat
          return updateCharacter(yourTurnCharacterId, {
            sheet_version: detail.sheet_version,
            sheet,
          })
        })
        .then((fresh) => {
          setOwnTurnSheetVersion(fresh.sheet_version)
          const combat = asRecord(asRecord(fresh.sheet).combat)
          setOwnTurnEconomy(readTurnEconomy(combat.turn_economy))
        })
        .catch(() => null)
    },
    [yourTurnCharacterId, ownTurnEconomy, ownTurnSheetVersion],
  )

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

  const finishCombat = async (payload: {
    keep_unreleased_waves: boolean
    summary: string
  }) => {
    const updated = await patchSessionCombat(session.id, {
      action: 'end',
      keep_unreleased_waves: payload.keep_unreleased_waves,
      summary: payload.summary,
    })
    setSession(updated)
    setCombatEndOpen(false)
    setToast('Бой завершён')
    setRewardsFocus('combat')
    setRewardsOpen(true)
    await reloadEvents()
    // Диалог закрытия сессии — после наград (afterCombatRewards)
  }

  const afterCombatRewards = () => {
    if (!endCombatThenClose) return
    setEndCombatThenClose(false)
    setCloseTitle(`Итог: ${session.name}`)
    setCloseSummary('')
    setWriteJournal(true)
    setCloseOpen(true)
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
                      setEndCombatThenClose(true)
                      setCombatEndOpen(true)
                      return
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
                    seats={session.seats}
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
                      setEndCombatThenClose(false)
                      setCombatEndOpen(true)
                    }}
                    ownCharacterIds={ownCharacterIds}
                    onRollInitiative={(entry) => setInitRollEntry(entry)}
                    onReleaseWave={(waveId) => {
                      void run(async () => {
                        const updated = await patchSessionCombat(session.id, {
                          action: 'release_wave',
                          wave_id: waveId,
                        })
                        setSession(updated)
                        setToast('Волна выпущена')
                      })
                    }}
                    onRestoreFallen={(fallenId) => {
                      void run(async () => {
                        const hpRaw = window.prompt('Хиты после возврата (пусто = 1)', '1')
                        const restore_hp =
                          hpRaw == null || hpRaw.trim() === ''
                            ? 1
                            : Math.max(1, Number.parseInt(hpRaw, 10) || 1)
                        const updated = await patchSessionCombat(session.id, {
                          action: 'restore_fallen',
                          fallen_id: fallenId,
                          restore_hp,
                        })
                        setSession(updated)
                        setToast('Вернули из павших')
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
                    onSideClick={(entry) => setSideEntry(entry)}
                  />
                ) : (
                  <Text tone="muted">Бой ещё не начат — очередь появится здесь.</Text>
                )}
                <Stack gap={12}>
                {canRun && !session.closed_at ? (
                  <label className="manual-roll-form__check">
                    <input
                      type="checkbox"
                      checked={Boolean(session.combat?.dice_on_table)}
                      disabled={busy}
                      onChange={() => {
                        void run(async () => {
                          const updated = await patchSessionCombat(session.id, {
                            action: 'set_dice_on_table',
                            dice_on_table: !session.combat?.dice_on_table,
                          })
                          setSession(updated)
                          setToast(
                            updated.combat?.dice_on_table
                              ? 'Кубики на столе включены'
                              : 'Обычный цифровой бросок',
                          )
                        })
                      }}
                    />
                    Кубики на столе
                  </label>
                ) : session.combat?.dice_on_table ? (
                  <Text tone="muted">Режим: кубики на столе</Text>
                ) : null}
                {session.combat?.waiting_reaction && canRun ? (
                  <Text className="session-combat-track__reaction">
                    ждём реакцию
                    {session.combat.reaction_hint ? ` — ${session.combat.reaction_hint}` : ''}
                  </Text>
                ) : null}
                {session.combat?.pending_fumble && canRun ? (
                  <Stack gap={6}>
                    <Text>
                      Провал на 1: {session.combat.pending_fumble.actor} —{' '}
                      {session.combat.pending_fumble.action_name}
                    </Text>
                    <div className="session-attack-actions">
                      {(
                        [
                          ['drop_weapon', 'Уронил оружие'],
                          ['hit_ally', 'Задел союзника'],
                          ['lose_reaction', 'Потерял реакцию'],
                        ] as const
                      ).map(([id, label]) => (
                        <Button
                          key={id}
                          type="button"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            void run(async () => {
                              const updated = await patchSessionCombat(session.id, {
                                action: 'resolve_fumble',
                                fumble_consequence_id: id,
                              })
                              setSession(updated)
                              await reloadEvents()
                              setToast(label)
                            })
                          }}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </Stack>
                ) : null}
                {historyOff ? (
                  <Text tone="muted">Лента скрыта настройками видимости лобби.</Text>
                ) : (
                  <SessionEventFeed
                    events={events}
                    filter={feedFilter}
                    onFilterChange={setFeedFilter}
                  />
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
                          if (feedFilter === 'rolls' && created.event_type !== 'roll') return prev
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
                  {yourTurnCharacterId ? (
                    <div className="session-your-turn-banner" role="status">
                      Твой ход
                    </div>
                  ) : null}
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
                    combatPages={
                      session.location_page_id
                        ? wikiCombats.filter(
                            (p) => p.parent_id === session.location_page_id,
                          )
                        : wikiCombats
                    }
                    onPickCombat={(page) => {
                      if (session.combat?.active) {
                        setToast('Бой уже идёт')
                        return
                      }
                      void run(async () => {
                        const updated = await startCombatFromWiki(session.id, page.id)
                        setSession(updated)
                        setToast(`Бой «${page.title}» со стола вики`)
                      })
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
                            setEndCombatThenClose(false)
                            setCombatEndOpen(true)
                          }}
                        >
                          Завершить бой
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || Boolean(session.combat?.active)}
                        title={
                          session.combat?.active
                            ? 'Бой уже идёт'
                            : !session.setting_id
                              ? 'Нужен сеттинг сессии'
                              : 'Высадить страницу «Бой» из вики'
                        }
                        onClick={() => {
                          setWikiCombatPickId(wikiCombats[0]?.id ?? '')
                          setWikiCombatPickOpen(true)
                          if (wikiCombats.length === 0 && session.setting_id) {
                            void run(async () => {
                              const wiki = await listSessionWikiCombats(session.id)
                              setWikiCombats(wiki.pages ?? [])
                            })
                          }
                        }}
                      >
                        Из вики
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || !session.setting_id}
                        title={
                          !session.setting_id
                            ? 'Нужен сеттинг сессии'
                            : 'Список страниц «Бой» сеттинга'
                        }
                        onClick={() => {
                          setWikiCombatListOpen(true)
                          void run(async () => {
                            const wiki = await listSessionWikiCombats(session.id)
                            setWikiCombats(wiki.pages ?? [])
                          })
                        }}
                      >
                        Бои локации
                      </Button>
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
                    </div>
                    <div className="session-toolbar-group" aria-label="Награды">
                      <Text className="session-toolbar-group__label">Награды</Text>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || session.seats.length === 0}
                        onClick={() => {
                          setRewardsFocus('manual')
                          setRewardsOpen(true)
                        }}
                      >
                        Опыт
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || session.seats.length === 0}
                        onClick={() => {
                          setRewardsFocus('loot')
                          setRewardsOpen(true)
                        }}
                      >
                        Добыча
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={
                          busy ||
                          session.seats.length === 0 ||
                          !(session.can_award || canRun)
                        }
                        title="Выдать предмет или монеты на лист (не сундук)"
                        onClick={() => {
                          setGrantSeatId(null)
                          setGrantOpen(true)
                        }}
                      >
                        Выдать
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
                        disabled={busy || session.seats.length === 0}
                        title={
                          session.seats.length === 0
                            ? 'Нужна партия за столом'
                            : 'Подобрать бой по листам'
                        }
                        onClick={() => {
                          setGeneratorResult(null)
                          setGeneratorOpen(true)
                          if (session.setting_id && !loreSetting && !wikiSetting) {
                            void ensureLoreSetting()
                          }
                        }}
                      >
                        Генератор
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || Boolean(session.combat?.active)}
                        title={
                          session.combat?.active
                            ? 'Во время боя отдых недоступен'
                            : normalizeCampaignRules(session.campaign_rules).homebrew
                                  .gritty_rest
                              ? 'Суровый реализм: 8 часов'
                              : undefined
                        }
                        onClick={() => {
                          void run(async () => {
                            const result = await startPartyRest(session.id, 'short')
                            setSession(result.session)
                            setToast(result.summary)
                            await reloadEvents()
                          })
                        }}
                      >
                        {normalizeCampaignRules(session.campaign_rules).homebrew.gritty_rest
                          ? 'Короткий отдых (8 ч)'
                          : 'Короткий отдых'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy || Boolean(session.combat?.active)}
                        title={
                          session.combat?.active
                            ? 'Во время боя отдых недоступен'
                            : normalizeCampaignRules(session.campaign_rules).homebrew
                                  .gritty_rest
                              ? 'Суровый реализм: 7 дней'
                              : undefined
                        }
                        onClick={() => {
                          void run(async () => {
                            const result = await startPartyRest(session.id, 'long')
                            setSession(result.session)
                            setToast(result.summary)
                            await reloadEvents()
                          })
                        }}
                      >
                        {normalizeCampaignRules(session.campaign_rules).homebrew.gritty_rest
                          ? 'Долгий отдых (7 дн.)'
                          : 'Долгий отдых'}
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
                    seats={session.seats}
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
                      setEndCombatThenClose(false)
                      setCombatEndOpen(true)
                    }}
                    ownCharacterIds={ownCharacterIds}
                    onRollInitiative={(entry) => setInitRollEntry(entry)}
                    onReleaseWave={(waveId) => {
                      void run(async () => {
                        const updated = await patchSessionCombat(session.id, {
                          action: 'release_wave',
                          wave_id: waveId,
                        })
                        setSession(updated)
                        setToast('Волна выпущена')
                      })
                    }}
                    onRestoreFallen={(fallenId) => {
                      void run(async () => {
                        const hpRaw = window.prompt('Хиты после возврата (пусто = 1)', '1')
                        const restore_hp =
                          hpRaw == null || hpRaw.trim() === ''
                            ? 1
                            : Math.max(1, Number.parseInt(hpRaw, 10) || 1)
                        const updated = await patchSessionCombat(session.id, {
                          action: 'restore_fallen',
                          fallen_id: fallenId,
                          restore_hp,
                        })
                        setSession(updated)
                        setToast('Вернули из павших')
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
                    onSideClick={(entry) => setSideEntry(entry)}
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
                          yourTurn={yourTurnCharacterId === seat.character_id}
                          showTurnEconomyStub={yourTurnCharacterId === seat.character_id}
                          turnEconomy={
                            yourTurnCharacterId === seat.character_id
                              ? ownTurnEconomy
                              : null
                          }
                          onToggleTurnMark={
                            yourTurnCharacterId === seat.character_id
                              ? onToggleOwnTurnMark
                              : undefined
                          }
                          visibility={visibility}
                          revealAll={canSeeHidden}
                          masterControls={canRun && !session.closed_at && !session.is_observer}
                          isOwner={isOwn && !session.closed_at && !session.is_observer}
                          busy={busy}
                          sheetLabel={canRun && !isOwn ? 'Смотреть' : 'Лист'}
                          sideLabelText={(() => {
                            const entry = session.combat?.entries?.find(
                              (e) => e.kind === 'pc' && e.ref_id === seat.character_id,
                            )
                            return entry
                              ? combatSideLabel(entry.side, session.combat?.sides)
                              : session.combat?.active
                                ? combatSideLabel('party', session.combat?.sides)
                                : null
                          })()}
                          sideHidden={Boolean(
                            session.combat?.entries?.find(
                              (e) => e.kind === 'pc' && e.ref_id === seat.character_id,
                            )?.side_hidden,
                          )}
                          onSideClick={
                            canRun && session.combat?.active && !session.closed_at
                              ? () => {
                                  const entry = session.combat?.entries?.find(
                                    (e) => e.kind === 'pc' && e.ref_id === seat.character_id,
                                  )
                                  if (entry) setSideEntry(entry)
                                }
                              : undefined
                          }
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
                          onSpendInspiration={() => {
                            void run(async () => {
                              const updated = await patchSeatCombat(
                                session.id,
                                seat.character_id,
                                { spend_inspiration: true },
                              )
                              setSession(updated)
                              setToast('Вдохновение потрачено · преимущество на следующий бросок')
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
                              setToast('Концентрация снята · связанные эффекты убраны · вдохновение на месте')
                            })
                          }}
                          onDamage={
                            canRun && !session.closed_at
                              ? (payload) => {
                                  void run(async () => {
                                    const updated = await patchSeatCombat(
                                      session.id,
                                      seat.character_id,
                                      {
                                        damage: payload.heal ? -payload.amount : payload.amount,
                                        damage_type: payload.damageType,
                                        grant_temp_hp: payload.grantTempHp,
                                      },
                                    )
                                    setSession(updated)
                                    const hint = updated.seats.find(
                                      (s) => s.character_id === seat.character_id,
                                    )?.reaction_hint
                                    setToast(hint || (payload.heal ? 'Лечение' : 'Урон нанесён'))
                                  })
                                }
                              : undefined
                          }
                          onDeathSavesChange={(successes, fails) => {
                            void run(async () => {
                              const updated = await patchSeatCombat(
                                session.id,
                                seat.character_id,
                                { death_successes: successes, death_fails: fails },
                              )
                              setSession(updated)
                            })
                          }}
                          onAddCompanion={
                            canControl && !session.closed_at
                              ? () => {
                                  setCompanionHostId(seat.character_id)
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
                          onPatchCompanion={
                            canControl && !session.closed_at
                              ? (companionId, patch) => {
                                  void run(async () => {
                                    const updated = await patchSeatCompanion(
                                      session.id,
                                      seat.character_id,
                                      companionId,
                                      patch,
                                    )
                                    setSession(updated)
                                  })
                                }
                              : undefined
                          }
                        />
                      )
                    })}
                    </div>
                  )}

                  {session.combat?.loot_chest?.on_table ? (
                    <LootChestBoard
                      chest={session.combat.loot_chest}
                      seats={session.seats}
                      canAward={Boolean(session.can_award || canRun)}
                      ownCharacterIds={ownCharacterIds}
                      busy={busy}
                      onClaim={(payload) => {
                        void run(async () => {
                          const result = await sessionLootChest(session.id, {
                            action: 'claim',
                            ...payload,
                          })
                          setSession(result.session)
                          setToast(result.summary || 'Забрал')
                          await reloadEvents()
                        })
                      }}
                      onSplit={() => {
                        void run(async () => {
                          const result = await sessionLootChest(session.id, {
                            action: 'split_coins',
                          })
                          setSession(result.session)
                          setToast(result.summary || 'Поровну')
                          await reloadEvents()
                        })
                      }}
                      onReassign={(payload) => {
                        void run(async () => {
                          const result = await sessionLootChest(session.id, {
                            action: 'reassign',
                            ...payload,
                          })
                          setSession(result.session)
                          setToast(result.summary || 'Передано')
                          await reloadEvents()
                        })
                      }}
                      onClose={(remainder) => {
                        void run(async () => {
                          const result = await sessionLootChest(session.id, {
                            action: 'close',
                            remainder,
                          })
                          setSession(result.session)
                          setToast(result.summary || 'Добыча закрыта')
                          await reloadEvents()
                        })
                      }}
                    />
                  ) : null}

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
                          enemiesAcVisible={campaignRules.enemies_ac_visible}
                          revealAll={canSeeHidden}
                          masterControls={canRun && !session.closed_at}
                          forceAbilitiesOpen={Boolean(isActiveTurn && canRun)}
                          busy={busy}
                          sideLabelText={(() => {
                            const entry = session.combat?.entries?.find(
                              (e) => e.kind === 'enemy' && e.ref_id === enemy.id,
                            )
                            return entry
                              ? combatSideLabel(entry.side, session.combat?.sides)
                              : session.combat?.active
                                ? combatSideLabel('enemies', session.combat?.sides)
                                : null
                          })()}
                          sideHidden={Boolean(
                            session.combat?.entries?.find(
                              (e) => e.kind === 'enemy' && e.ref_id === enemy.id,
                            )?.side_hidden,
                          )}
                          onSideClick={
                            canRun && session.combat?.active && !session.closed_at
                              ? () => {
                                  const entry = session.combat?.entries?.find(
                                    (e) => e.kind === 'enemy' && e.ref_id === enemy.id,
                                  )
                                  if (entry) setSideEntry(entry)
                                }
                              : undefined
                          }
                          onOutcome={
                            canRun && !session.closed_at
                              ? (outcome) => {
                                  void run(async () => {
                                    const updated = await patchSessionCombatant(
                                      session.id,
                                      enemy.id,
                                      { outcome },
                                    )
                                    setSession(updated)
                                    setToast(
                                      outcome === 'fled'
                                        ? 'Сбежал'
                                        : outcome === 'surrendered'
                                          ? 'Сдался'
                                          : 'Исход сброшен',
                                    )
                                  })
                                }
                              : undefined
                          }
                          canSaveToSetting={Boolean(
                            canRun &&
                              !session.closed_at &&
                              session.setting_id,
                          )}
                          onSaveToSetting={() => {
                            void openHandoff(enemy)
                          }}
                          canStudy={
                            !canRun &&
                            !session.closed_at &&
                            !session.is_observer &&
                            ownCharacterIds.size > 0 &&
                            !enemy.statblock_visible
                          }
                          onStudy={({ rollTotal, dc }) => {
                            const characterId =
                              session.seats.find((s) => ownCharacterIds.has(s.character_id))
                                ?.character_id
                            if (!characterId) {
                              setToast('Нужен свой персонаж за столом')
                              return
                            }
                            void run(async () => {
                              const updated = await studySessionCombatant(
                                session.id,
                                enemy.id,
                                {
                                  character_id: characterId,
                                  roll_total: rollTotal ?? null,
                                  dc: dc ?? null,
                                },
                              )
                              setSession(updated)
                              setToast('Ожидаем подтверждения ведущего')
                            })
                          }}
                          onResolveStudy={(success) => {
                            void run(async () => {
                              const updated = await resolveStudySessionCombatant(
                                session.id,
                                enemy.id,
                                { success },
                              )
                              setSession(updated)
                              setToast(success ? 'Изучение: успех' : 'Изучение: провал')
                            })
                          }}
                          onRevealStatblock={() => {
                            void run(async () => {
                              const updated = await patchSessionCombatant(
                                session.id,
                                enemy.id,
                                { reveal_statblock: true },
                              )
                              setSession(updated)
                              setToast('Статблок показан партии')
                            })
                          }}
                          onShareStudy={() => {
                            void run(async () => {
                              const updated = await shareStudiedSessionCombatant(
                                session.id,
                                enemy.id,
                              )
                              setSession(updated)
                              setToast('Карточка показана партии')
                            })
                          }}
                          onAttackAction={(action, kitKind) => {
                            setAttackCombatant(enemy)
                            setAttackAction(action)
                            setAttackBlock(blockFromKitKind(kitKind))
                            setAttackOpen(true)
                          }}
                          onDamage={(payload) => {
                            void run(async () => {
                              const updated = await patchSessionCombatant(
                                session.id,
                                enemy.id,
                                {
                                  damage: payload.heal ? -payload.amount : payload.amount,
                                  damage_type: payload.damageType,
                                  grant_temp_hp: payload.grantTempHp,
                                  member_id: payload.memberId,
                                },
                              )
                              setSession(updated)
                              const note = updated.combatants?.find((c) => c.id === enemy.id)
                              setToast(
                                note?.last_damage_note ||
                                  note?.reaction_hint ||
                                  (payload.heal ? 'Лечение' : 'Урон'),
                              )
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
                  <div className="session-live-desk__side-tabs" role="tablist" aria-label="Боковая панель">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={sideTab === 'notes'}
                      className={`session-live-desk__side-tab${sideTab === 'notes' ? ' is-on' : ''}`}
                      onClick={() => setSideTab('notes')}
                    >
                      Заметки / Чат
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={sideTab === 'wiki'}
                      className={`session-live-desk__side-tab${sideTab === 'wiki' ? ' is-on' : ''}`}
                      onClick={() => {
                        setSideTab('wiki')
                        if (session.setting_id) {
                          void getSetting(session.setting_id)
                            .then(setWikiSetting)
                            .catch(() => setWikiSetting(null))
                        } else {
                          setWikiSetting(null)
                        }
                      }}
                    >
                      Вики
                    </button>
                  </div>
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
                  {sideTab === 'notes' ? (
                  <Stack gap={16}>
                <LobbyNotesPanel
                  lobbyId={session.lobby_id}
                  canManageJournal={Boolean(session.is_owner || session.is_comaster)}
                  settingId={session.setting_id}
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
                  isOwner={canManageLetters}
                  compact
                  ownCharacterOptions={session.lobby_members
                    .filter((m) => ownCharacterIds.has(m.character_id))
                    .map((m) => ({ id: m.character_id, name: m.character_name }))}
                  onToast={setToast}
                  onError={setError}
                />
                  </Stack>
                  ) : wikiSetting ? (
                    <SettingWikiReader
                      setting={wikiSetting}
                      userKey={`session:${session.id}`}
                      canEditWiki={Boolean(wikiSetting.can_edit_wiki)}
                      canSeeHidden={sessionCanSeeHidden(session)}
                      compact
                    />
                  ) : session.setting_id ? (
                    <Text tone="muted">Загрузка вики…</Text>
                  ) : sessionCanRun(session) || session.is_comaster ? (
                    <SettingWikiReader
                      setting={{
                        id: '',
                        lobby_id: session.lobby_id,
                        name: '',
                        world_notes: '',
                        created_at: '',
                        updated_at: '',
                        pages: [],
                        links: [],
                        templates: [],
                        all_tags: [],
                        is_owner: false,
                      }}
                      userKey={`session:${session.id}`}
                      canEditWiki={Boolean(session.is_owner || session.is_comaster)}
                      canSeeHidden={sessionCanSeeHidden(session)}
                      compact
                      showBindHint
                      onBindSetting={() => setBindSettingOpen(true)}
                    />
                  ) : (
                    <Text tone="muted">К сессии не привязан сеттинг.</Text>
                  )}
                </div>
              </aside>
            </div>

            <div className="session-live-desk__mobile-only">
              {liveTab === 'feed' ? (
                <Stack gap={14}>
                {historyOff ? (
                  <Text tone="muted">Лента скрыта настройками видимости лобби.</Text>
                ) : (
                  <SessionEventFeed
                    events={events}
                    filter={feedFilter}
                    onFilterChange={setFeedFilter}
                  />
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
                          if (feedFilter === 'rolls' && created.event_type !== 'roll') {
                            return prev
                          }
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
                <div className="session-live-desk__side-tabs" role="tablist" aria-label="Заметки и вики">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={sideTab === 'notes'}
                    className={`session-live-desk__side-tab${sideTab === 'notes' ? ' is-on' : ''}`}
                    onClick={() => setSideTab('notes')}
                  >
                    Заметки / Чат
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={sideTab === 'wiki'}
                    className={`session-live-desk__side-tab${sideTab === 'wiki' ? ' is-on' : ''}`}
                    onClick={() => {
                      setSideTab('wiki')
                      if (session.setting_id) {
                        void getSetting(session.setting_id)
                          .then(setWikiSetting)
                          .catch(() => setWikiSetting(null))
                      }
                    }}
                  >
                    Вики
                  </button>
                </div>
                {sideTab === 'notes' ? (
                  <>
                <LobbyNotesPanel
                  lobbyId={session.lobby_id}
                  canManageJournal={Boolean(session.is_owner || session.is_comaster)}
                  settingId={session.setting_id}
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
                  isOwner={canManageLetters}
                  compact
                  ownCharacterOptions={session.lobby_members
                    .filter((m) => ownCharacterIds.has(m.character_id))
                    .map((m) => ({ id: m.character_id, name: m.character_name }))}
                  onToast={setToast}
                  onError={setError}
                />
                  </>
                ) : wikiSetting ? (
                  <SettingWikiReader
                    setting={wikiSetting}
                    userKey={`session:${session.id}`}
                    canEditWiki={Boolean(wikiSetting.can_edit_wiki)}
                    canSeeHidden={sessionCanSeeHidden(session)}
                    compact
                  />
                ) : session.setting_id ? (
                  <Text tone="muted">Загрузка вики…</Text>
                ) : (
                  <Text tone="muted">К сессии не привязан сеттинг.</Text>
                )}
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
        combatants={session.combatants ?? []}
        busy={busy}
        onClose={() => setConditionOpen(false)}
        onApply={(condition, targets) => {
          void run(async () => {
            let latest = session
            let applied = 0
            for (const target of targets) {
              if (target.kind === 'seat') {
                const seat = latest.seats.find((s) => s.character_id === target.id)
                const current = seat?.conditions ?? []
                if (current.some((c) => c.slug === condition.slug)) continue
                latest = await patchSeatCombat(latest.id, target.id, {
                  conditions: [...current, condition],
                })
                applied += 1
              } else {
                const enemy = latest.combatants?.find((c) => c.id === target.id)
                const current = enemy?.conditions ?? []
                if (current.some((c) => c.slug === condition.slug)) continue
                latest = await patchSessionCombatant(latest.id, target.id, {
                  conditions: [...current, condition],
                })
                applied += 1
              }
            }
            setSession(latest)
            setConditionOpen(false)
            setToast(
              applied === 1
                ? `Состояние: ${condition.name}`
                : `Состояние: ${condition.name} · ${applied}`,
            )
          })
        }}
      />

      <ApplyEffectDialog
        open={effectOpen}
        seats={session.seats}
        combatants={session.combatants ?? []}
        preferredSourceId={
          session.seats.find((s) => ownCharacterIds.has(s.character_id))?.character_id ??
          null
        }
        busy={busy}
        onClose={() => setEffectOpen(false)}
        onApply={(effect, targets) => {
          void run(async () => {
            const { buildBuffEffect, serializeActiveEffect } = await import(
              '../shared/dnd/activeEffects'
            )
            const sourceId = effect.source_character_id
            const seatTargets = targets.filter((t) => t.kind === 'seat').map((t) => t.id)
            const enemyTargets = targets.filter((t) => t.kind === 'enemy').map((t) => t.id)
            const built = buildBuffEffect({
              name: effect.name,
              sourceCharacterId: sourceId,
              sourceName: effect.source_name,
              linkedConcentration: effect.linked_concentration,
            })
            if (sourceId && built && seatTargets.length > 0) {
              const payload = serializeActiveEffect(built)
              const rawDuration =
                effect.duration ??
                (payload.duration && typeof payload.duration === 'object'
                  ? (payload.duration as {
                      unit: string
                      value?: number | null
                      remaining_rounds?: number | null
                      started_round?: number | null
                    })
                  : undefined)
              const duration = rawDuration
                ? {
                    unit: rawDuration.unit,
                    value: rawDuration.value ?? undefined,
                    remaining_rounds: rawDuration.remaining_rounds ?? undefined,
                    started_round: rawDuration.started_round ?? undefined,
                  }
                : undefined
              await shareLobbyEffect(session.lobby_id, {
                source_character_id: sourceId,
                name: String(payload.name),
                target_character_ids: seatTargets,
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
                duration,
                ac_bonus: effect.ac_bonus ?? undefined,
              })
            }
            let latest = session
            for (const characterId of seatTargets) {
              const seat = latest.seats.find((s) => s.character_id === characterId)
              const current = seat?.effects ?? []
              const seatEffect = {
                ...effect,
                id: `${effect.id}-${characterId}`,
                duration: effect.duration ?? undefined,
                ac_bonus: effect.ac_bonus ?? undefined,
              }
              latest = await patchSeatCombat(latest.id, characterId, {
                effects: [...current, seatEffect],
              })
            }
            for (const combatantId of enemyTargets) {
              const enemy = latest.combatants?.find((c) => c.id === combatantId)
              const current = enemy?.effects ?? []
              latest = await patchSessionCombatant(latest.id, combatantId, {
                effects: [...current, { ...effect, id: `${effect.id}-${combatantId}` }],
              })
            }
            setSession(latest)
            setEffectOpen(false)
            const n = seatTargets.length + enemyTargets.length
            setToast(n === 1 ? `Эффект: ${effect.name}` : `Эффект: ${effect.name} · ${n}`)
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
        combatActive={Boolean(session.combat?.active)}
        onClose={() => setCombatantOpen(false)}
        onSubmit={(payload) => {
          void run(async () => {
            const updated = await addSessionCombatants(session.id, payload)
            setSession(updated)
            setCombatantOpen(false)
            const n = payload.count ?? 1
            setToast(
              session.combat?.active
                ? 'Новая скрытая волна'
                : n > 1
                  ? `На столе: ${n}`
                  : 'Противник на столе',
            )
          })
        }}
      />

      <EncounterGenerateDialog
        open={generatorOpen}
        busy={busy}
        result={generatorResult}
        canEditWiki={Boolean(
          (wikiSetting ?? loreSetting)?.can_edit_wiki ??
            (wikiSetting ?? loreSetting)?.is_owner,
        )}
        parentPageId={session.location_page_id ?? null}
        wikiParents={((wikiSetting ?? loreSetting)?.pages ?? [])
          .filter((p) => COMBAT_PARENT_KINDS.includes(p.page_kind))
          .map(
            (p): EncounterWikiParent => ({
              id: p.id,
              title: p.title,
              page_kind: p.page_kind,
            }),
          )}
        onClose={() => {
          setGeneratorOpen(false)
          setGeneratorResult(null)
        }}
        onInvalidate={() => setGeneratorResult(null)}
        onGenerate={(payload) => {
          void run(async () => {
            const next = await generateSessionEncounter(session.id, payload)
            setGeneratorResult(next)
          })
        }}
        onDeploy={(picks) => {
          void run(async () => {
            const updated = await deployGeneratorToTable(session, picks)
            setSession(updated)
            setGeneratorOpen(false)
            setGeneratorResult(null)
            setToast(
              session.combat?.active
                ? 'Волны добавлены в бой'
                : 'Бой начат из генератора',
            )
          })
        }}
        onSaveToWiki={(picks, parentPageId, title) => {
          void run(async () => {
            const diffRaw = generatorResult?.difficulty
            const difficulty =
              diffRaw === 'easy' ||
              diffRaw === 'medium' ||
              diffRaw === 'hard' ||
              diffRaw === 'deadly'
                ? diffRaw
                : 'medium'
            const next = await generateSessionEncounter(session.id, {
              difficulty,
              theme_ids: generatorResult?.theme_ids?.length
                ? generatorResult.theme_ids
                : ['humanoid'],
              environments: generatorResult?.environments,
              similar: generatorResult?.similar,
              waves: generatorResult?.waves?.length || undefined,
              composition: (generatorResult?.composition as
                | 'horde'
                | 'boss'
                | 'mixed'
                | undefined) ?? 'mixed',
              wave_profile: (generatorResult?.wave_profile as
                | 'even'
                | 'escalation'
                | undefined) ?? 'even',
              flyers: (generatorResult?.flyers as
                | 'auto'
                | 'allow'
                | 'want'
                | 'none'
                | undefined) ?? 'auto',
              enemy_casters: (generatorResult?.enemy_casters as
                | 'none'
                | 'any'
                | 'several'
                | undefined) ?? 'any',
              save_to_wiki: true,
              parent_page_id: parentPageId,
              wiki_title: title,
              wiki_picks: picksToWikiPicks(picks),
            })
            setGeneratorResult(next)
            if (next.wiki_page_id) {
              setToast('Страница боя сохранена в вики')
              try {
                const wiki = await listSessionWikiCombats(session.id)
                setWikiCombats(wiki.pages ?? [])
              } catch {
                /* ignore */
              }
            } else {
              setToast('Запрос в вики отправлен')
            }
          })
        }}
      />

      <Dialog
        open={wikiCombatPickOpen}
        title="Бой из вики"
        primaryLabel="На стол"
        secondaryLabel="Отмена"
        busy={busy}
        primaryDisabled={!wikiCombatPickId || Boolean(session.combat?.active)}
        onSecondary={() => setWikiCombatPickOpen(false)}
        onPrimary={() => {
          if (!wikiCombatPickId) return
          void run(async () => {
            const updated = await startCombatFromWiki(session.id, wikiCombatPickId)
            setSession(updated)
            setWikiCombatPickOpen(false)
            const title =
              wikiCombats.find((p) => p.id === wikiCombatPickId)?.title ?? 'Бой'
            setToast(`Бой «${title}» со стола вики`)
          })
        }}
      >
        <Stack gap={10}>
          <Text tone="muted">Выбери страницу «Бой» — волны высадятся на стол.</Text>
          {wikiCombats.length === 0 ? (
            <Text tone="muted">Пока нет страниц боя в сеттинге.</Text>
          ) : (
            <Field label="Страница">
              <select
                className="ui-input"
                value={wikiCombatPickId}
                disabled={busy}
                onChange={(e) => setWikiCombatPickId(e.target.value)}
              >
                <option value="">—</option>
                {wikiCombats.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                    {p.parent_title ? ` · ${p.parent_title}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </Stack>
      </Dialog>

      <Dialog
        open={wikiCombatListOpen}
        title="Бои локации"
        primaryLabel="Закрыть"
        busy={busy}
        onPrimary={() => setWikiCombatListOpen(false)}
        onSecondary={() => setWikiCombatListOpen(false)}
        secondaryLabel="Отмена"
      >
        <Stack gap={10}>
          {wikiCombats.length === 0 ? (
            <Text tone="muted">Нет страниц «Бой» в сеттинге сессии.</Text>
          ) : (
            <ul className="setting-wiki-links__list">
              {wikiCombats.map((p) => (
                <li key={p.id} className="setting-wiki-links__row">
                  <button
                    type="button"
                    className="setting-wiki-links__jump"
                    disabled={busy || Boolean(session.combat?.active)}
                    title={
                      session.combat?.active
                        ? 'Бой уже идёт'
                        : p.parent_title
                          ? `под «${p.parent_title}»`
                          : undefined
                    }
                    onClick={() => {
                      void run(async () => {
                        const updated = await startCombatFromWiki(session.id, p.id)
                        setSession(updated)
                        setWikiCombatListOpen(false)
                        setToast(`Бой «${p.title}» со стола вики`)
                      })
                    }}
                  >
                    {p.title}
                    {p.parent_title ? ` · ${p.parent_title}` : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Stack>
      </Dialog>

      <StartCombatDialog
        open={combatStartOpen}
        busy={busy}
        seats={session.seats}
        combatants={session.combatants ?? []}
        onClose={() => setCombatStartOpen(false)}
        onSubmit={(payload) => {
          void run(async () => {
            const updated = await startSessionCombat(session.id, payload)
            setSession(updated)
            setCombatStartOpen(false)
            setToast('Бой начат')
          })
        }}
      />

      <EndCombatDialog
        open={combatEndOpen}
        busy={busy}
        combat={session.combat}
        onClose={() => {
          setCombatEndOpen(false)
          setEndCombatThenClose(false)
        }}
        onConfirm={(payload) => {
          void run(async () => {
            await finishCombat(payload)
          })
        }}
      />

      <SideSwitchDialog
        open={sideEntry != null}
        busy={busy}
        entry={sideEntry}
        sides={session.combat?.sides ?? []}
        onClose={() => setSideEntry(null)}
        onReveal={(entryId) => {
          void run(async () => {
            const updated = await patchSessionCombat(session.id, {
              action: 'reveal_side',
              entry_id: entryId,
            })
            setSession(updated)
            setSideEntry(null)
            setToast('Сторона раскрыта')
          })
        }}
        onSubmit={(payload) => {
          void run(async () => {
            const updated = await patchSessionCombat(session.id, {
              action: 'set_side',
              entry_id: payload.entry_id,
              side: payload.side,
              side_label: payload.side_label,
              side_hidden: payload.side_hidden,
            })
            setSession(updated)
            setSideEntry(null)
            setToast('Сторона обновлена')
          })
        }}
      />

      <InitiativeRollDialog
        open={initRollEntry != null}
        busy={busy}
        entry={initRollEntry}
        seat={
          initRollEntry?.kind === 'pc'
            ? session.seats.find((s) => s.character_id === initRollEntry.ref_id) ?? null
            : null
        }
        onClose={() => setInitRollEntry(null)}
        onRoll={({ advantage }) => {
          const entry = initRollEntry
          if (!entry) return
          void run(async () => {
            const updated = await rollSessionCombatInitiative(session.id, {
              entry_id: entry.id,
              mode: 'roll',
              advantage: advantage ?? null,
            })
            setSession(updated)
            setInitRollEntry(null)
            setToast('Инициатива брошена')
            await reloadEvents()
          })
        }}
        onManual={(value) => {
          const entry = initRollEntry
          if (!entry) return
          void run(async () => {
            const updated = await rollSessionCombatInitiative(session.id, {
              entry_id: entry.id,
              mode: 'manual',
              value,
            })
            setSession(updated)
            setInitRollEntry(null)
            setToast('Инициатива записана')
            await reloadEvents()
          })
        }}
      />

      <EnemyAttackDialog
        open={attackOpen}
        busy={busy}
        combatant={attackCombatant}
        action={attackAction}
        actionBlock={attackBlock}
        session={session}
        diceOnTable={Boolean(session.combat?.dice_on_table)}
        flankingEnabled={Boolean(campaignRules.homebrew.flanking_advantage)}
        onClose={() => {
          setAttackOpen(false)
          setAttackCombatant(null)
          setAttackAction(null)
        }}
        onSubmit={async (payload) => {
          await run(async () => {
            const result = await resolveSessionCombatAttack(session.id, payload)
            setSession(result.session)
            if (result.event) {
              setEvents((prev) => {
                if (prev.some((e) => e.id === result.event!.id)) return prev
                return [result.event!, ...prev]
              })
            }
            setAttackOpen(false)
            setAttackCombatant(null)
            setAttackAction(null)
            setToast(result.feed_line || (result.hit ? 'Попадание' : 'Промах'))
          })
        }}
      />

      <ReactionPromptDialog
        open={Boolean(
          session.combat?.waiting_reaction &&
            session.combat.reaction_character_id &&
            ownCharacterIds.has(session.combat.reaction_character_id) &&
            !canRun,
        )}
        busy={busy}
        characterName={
          session.seats.find(
            (s) => s.character_id === session.combat?.reaction_character_id,
          )?.character_name ?? 'Герой'
        }
        hint={session.combat?.reaction_hint}
        onDeclare={() => {
          const cid = session.combat?.reaction_character_id
          if (!cid) return
          void run(async () => {
            const updated = await resolveSessionCombatReaction(session.id, {
              action: 'declare',
              character_id: cid,
            })
            setSession(updated)
            await reloadEvents()
            setToast('Реакция объявлена')
          })
        }}
        onSkip={() => {
          const cid = session.combat?.reaction_character_id
          if (!cid) return
          void run(async () => {
            const updated = await resolveSessionCombatReaction(session.id, {
              action: 'skip',
              character_id: cid,
            })
            setSession(updated)
            await reloadEvents()
            setToast('Реакция пропущена')
          })
        }}
      />

      <RewardsDialog
        open={rewardsOpen}
        busy={busy}
        focus={rewardsFocus}
        seats={session.seats}
        combatants={session.combatants ?? []}
        pendingRewards={session.combat?.pending_rewards}
        lootChest={session.combat?.loot_chest}
        campaignRules={campaignRules}
        artifacts={settingArtifacts}
        onClose={() => {
          setRewardsOpen(false)
          afterCombatRewards()
        }}
        onAwardXp={(payload) => {
          void run(async () => {
            const result = await awardSessionXp(session.id, payload)
            setSession(result.session)
            const leveled = result.leveled_up ?? []
            if (leveled.length > 0) {
              setToast(
                result.mode === 'milestones'
                  ? `Новый уровень! ${leveled.map((x) => x.name).join(', ')}`
                  : `Новый уровень! Повысить · ${leveled.map((x) => x.name).join(', ')}`,
              )
            } else if (result.mode === 'milestones') {
              setToast('Вехи: уровень повышен')
            } else {
              const mine = Object.entries(result.per_recipient || {}).find(([cid]) =>
                ownCharacterIds.has(cid),
              )
              setToast(
                mine
                  ? `+${mine[1]} опыта`
                  : result.awarded_each > 0
                    ? `+${result.awarded_each} XP · ${result.recipients.join(', ')}`
                    : result.awarded_total > 0
                      ? `Опыт: ${result.awarded_total}`
                      : 'Опыт: 0',
              )
            }
            await reloadEvents()
          })
        }}
        onChest={(payload) => {
          void run(async () => {
            const result = await sessionLootChest(session.id, payload)
            setSession(result.session)
            if (result.summary) setToast(result.summary)
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

      <AddStoryCompanionDialog
        open={companionOpen}
        busy={busy}
        hostName={
          session.seats.find((s) => s.character_id === companionHostId)?.character_name ??
          null
        }
        onClose={() => setCompanionOpen(false)}
        onSubmit={(payload) => {
          if (!companionHostId) return
          void run(async () => {
            const updated = await addSeatCompanion(session.id, companionHostId, payload)
            setSession(updated)
            setCompanionOpen(false)
            setToast(
              payload.story
                ? 'Сюжетный напарник отдан игроку'
                : 'Напарник за столом',
            )
          })
        }}
      />

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

      <MasterGrantDialog
        open={grantOpen}
        busy={busy}
        seats={session.seats}
        initialCharacterId={grantSeatId}
        onClose={() => {
          setGrantOpen(false)
          setGrantSeatId(null)
        }}
        onSubmit={(payload) => {
          void run(async () => {
            const result = await grantSessionInventory(session.id, payload)
            setSession(result.session)
            setToast(result.summary)
            setGrantOpen(false)
            setGrantSeatId(null)
            await reloadEvents()
          })
        }}
      />

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
