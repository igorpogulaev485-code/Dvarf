import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { InviteQr, joinUrlForCode } from '../features/lobby/InviteQr'
import { LobbyChatsPanel } from '../features/lobby/LobbyChatsPanel'
import { LobbyHubTabs, type LobbyHubTabId } from '../features/lobby/LobbyHubTabs'
import { LobbyJournalPanel } from '../features/lobby/LobbyJournalPanel'
import { downloadTextFile } from '../features/lobby/joinConflict'
import { LeaveOrKickDialog } from '../features/lobby/LeaveOrKickDialog'
import { LobbyMemberMiniCard } from '../features/lobby/LobbyMemberMiniCard'
import { LobbyNotesPanel } from '../features/lobby/LobbyNotesPanel'
import { LobbyMediaQuotaPanel } from '../features/lobby/LobbyMediaQuotaPanel'
import { LobbyRolesPanel } from '../features/lobby/LobbyRolesPanel'
import { LobbySetupHints } from '../features/lobby/LobbySetupHints'
import { SessionAttendancePanel } from '../features/lobby/SessionAttendancePanel'
import { useLobbyRealtime } from '../features/lobby/useLobbyRealtime'
import { CampaignRulesPanel } from '../features/lobby/CampaignRulesPanel'
import { VisibilitySettingsPanel } from '../features/lobby/VisibilitySettingsPanel'
import {
  defaultCampaignRules,
  normalizeCampaignRules,
  type CampaignRules,
} from '../features/lobby/campaignRules'
import {
  journalHasNew,
  markJournalSeen,
  readJournalSeenAt,
} from '../features/lobby/journalSeen'
import {
  defaultVisibilityProfile,
  normalizeVisibilityProfile,
  type VisibilityProfile,
} from '../features/lobby/visibilityProfile'
import { chatsBadge, type ChatsBadge } from '../shared/api/chat'
import { listCharacters, type CharacterSummary } from '../shared/api/characters'
import { ApiRequestError } from '../shared/api/client'
import { exportNotes, type Note } from '../shared/api/notes'
import {
  createJournalEntry,
  choosePrimarySetting,
  createSession,
  createSetting,
  deleteLobby,
  deleteSession,
  deleteSetting,
  createHeroForLobbyHref,
  getLobby,
  removeLobbyMember,
  rotateLobbyInviteCode,
  updateLobby,
  waiveMemberStartRules,
  type LobbyDetail,
  type LobbyMediaUsage,
} from '../shared/api/lobbies'
import { openProductSite } from '../shared/brand/creed20'
import { Button, Dialog, Field, Input, Panel, Stack, Text, Toast } from '../ui'

type LocationState = {
  toast?: string
  /** W-01: открыть форму сессии с уже выбранным сеттингом */
  sessionSettingId?: string
}

function tabFromHash(hash: string): LobbyHubTabId {
  const value = hash.replace(/^#/, '')
  const allowed: LobbyHubTabId[] = [
    'roster',
    'journal',
    'notes',
    'chats',
    'sessions',
    'setting',
    'settings',
  ]
  return (allowed.includes(value as LobbyHubTabId) ? value : 'roster') as LobbyHubTabId
}

export function LobbyDetailPage() {
  const { lobbyId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [lobby, setLobby] = useState<LobbyDetail | null>(null)
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(
    (location.state as LocationState | null)?.toast ?? null,
  )
  const [settingName, setSettingName] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [sessionSettingId, setSessionSettingId] = useState('')
  const [sessionPresentIds, setSessionPresentIds] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [lobbyDeleteOpen, setLobbyDeleteOpen] = useState(false)
  const [lobbyDeleteName, setLobbyDeleteName] = useState('')
  const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false)
  const [memberAction, setMemberAction] = useState<{
    mode: 'leave' | 'kick'
    characterId: string
    characterName: string
    seated: boolean
  } | null>(null)
  const [tab, setTab] = useState<LobbyHubTabId>(() => tabFromHash(location.hash))
  const [playerPreview, setPlayerPreview] = useState(false)
  const [visibilityDraft, setVisibilityDraft] = useState<VisibilityProfile>(
    defaultVisibilityProfile(),
  )
  const [visibilityDirty, setVisibilityDirty] = useState(false)
  const [rulesDraft, setRulesDraft] = useState<CampaignRules>(defaultCampaignRules())
  const [rulesDirty, setRulesDirty] = useState(false)
  const [lastJournalPublishedAt, setLastJournalPublishedAt] = useState<string | null>(null)
  const [journalSeenAt, setJournalSeenAt] = useState<string | null>(null)
  const [chatsHubBadge, setChatsHubBadge] = useState<ChatsBadge>({
    letters: 0,
    channels: 0,
    whispers: 0,
    total: 0,
  })
  const [sendNote, setSendNote] = useState<Note | null>(null)
  const [sendPublishNow, setSendPublishNow] = useState(false)
  const [sendDeleteNote, setSendDeleteNote] = useState(false)

  const reload = useCallback(async () => {
    const [detail, chars] = await Promise.all([getLobby(lobbyId), listCharacters()])
    setLobby(detail)
    setCharacters(chars)
    setVisibilityDraft(normalizeVisibilityProfile(detail.visibility_profile))
    setVisibilityDirty(false)
    setRulesDraft(normalizeCampaignRules(detail.campaign_rules))
    setRulesDirty(false)
    setLastJournalPublishedAt(detail.last_journal_published_at ?? null)
  }, [lobbyId])

  useEffect(() => {
    if (!lobbyId) return
    const userKey = lobby?.owner_id ? `u:${lobby.owner_id}` : 'anon'
    // seen keyed by lobby + viewer: use owner_id only as fallback until detail loads
    const keyUser = lobby ? `viewer` : 'anon'
    setJournalSeenAt(readJournalSeenAt(lobbyId, keyUser))
    void userKey
  }, [lobbyId, lobby])

  useLobbyRealtime(
    lobbyId,
    (data) => {
      if (data.type === 'lobby_resync') {
        void reload().catch(() => undefined)
      }
      if (data.type === 'journal_changed') {
        if (data.published) {
          setLastJournalPublishedAt(new Date().toISOString())
        }
        if (tab !== 'journal') {
          // точка появится через journalHasNew
        } else {
          markJournalSeen(lobbyId, 'viewer')
          setJournalSeenAt(new Date().toISOString())
        }
      }
      if (
        data.type === 'letters_changed' ||
        data.type === 'chat_message' ||
        data.type === 'chat_refresh' ||
        data.type === 'whisper_changed' ||
        data.type === 'whisper_fact'
      ) {
        void chatsBadge(lobbyId)
          .then(setChatsHubBadge)
          .catch(() => undefined)
      }
    },
    () => {
      void reload().catch(() => undefined)
    },
  )

  useEffect(() => {
    if (!lobbyId) return
    let active = true
    chatsBadge(lobbyId)
      .then((b) => {
        if (active) setChatsHubBadge(b)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [lobbyId, tab])

  useEffect(() => {
    const state = location.state as LocationState | null
    if (!state) return
    if (state.sessionSettingId) {
      setSessionSettingId(state.sessionSettingId)
      setTab('sessions')
      navigate(`${location.pathname}#sessions`, { replace: true, state: null })
      return
    }
    if (state.toast) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    setTab(tabFromHash(location.hash))
  }, [location.hash])

  useEffect(() => {
    if (tab !== 'journal' || !lobbyId) return
    const at = lastJournalPublishedAt || new Date().toISOString()
    markJournalSeen(lobbyId, 'viewer', at)
    setJournalSeenAt(at)
  }, [tab, lobbyId, lastJournalPublishedAt])

  useEffect(() => {
    let active = true
    setLoading(true)
    reload()
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось открыть лобби')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [navigate, reload])

  const ownCharacterIds = useMemo(() => new Set(characters.map((c) => c.id)), [characters])

  const seatedCharacterIds = useMemo(() => {
    const ids = new Set<string>()
    for (const session of lobby?.sessions ?? []) {
      if (session.closed_at) continue
      for (const id of session.seat_character_ids ?? []) ids.add(id)
    }
    return ids
  }, [lobby?.sessions])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Ошибка запроса')
    } finally {
      setBusy(false)
    }
  }

  function changeTab(next: LobbyHubTabId) {
    setTab(next)
    navigate({ pathname: location.pathname, hash: next }, { replace: true })
    if (next === 'journal' && lobbyId) {
      const at = lastJournalPublishedAt || new Date().toISOString()
      markJournalSeen(lobbyId, 'viewer', at)
      setJournalSeenAt(at)
    }
  }

  function onVisibilityChange(next: VisibilityProfile) {
    setVisibilityDraft(next)
    setVisibilityDirty(true)
  }

  function onRulesChange(next: CampaignRules) {
    setRulesDraft(next)
    setRulesDirty(true)
  }

  if (loading) {
    return (
      <main className="page page--app">
        <Text tone="muted">Загружаем лобби…</Text>
      </main>
    )
  }

  if (!lobby) {
    return (
      <main className="page page--app">
        <Text tone="danger">{error || 'Лобби не найдено'}</Text>
        <Link to="/lobbies">К списку лобби</Link>
      </main>
    )
  }

  const visibilityReadOnly = !lobby.is_owner || playerPreview
  const canEditRules = Boolean(lobby.can_edit_campaign_rules || lobby.is_owner || lobby.is_comaster)
  const rulesReadOnly = !canEditRules || playerPreview
  const canManageJournal = Boolean(lobby.can_manage_journal || lobby.is_owner)
  const canEditWiki = Boolean(lobby.can_edit_wiki || lobby.is_owner)
  const canRun = Boolean(lobby.can_run_session || lobby.is_owner || lobby.is_comaster)
  const canDeleteLobby = Boolean(lobby.can_delete_lobby || lobby.is_owner)
  const canChangeInvite = Boolean(lobby.can_change_invite_code || lobby.is_owner)
  const roleSubtitle =
    lobby.role === 'comaster'
      ? 'Вы сомастер'
      : lobby.role === 'observer'
        ? 'Вы наблюдатель'
        : lobby.role === 'lead_today'
          ? 'Вы ведёте сегодня'
          : lobby.is_owner
            ? 'Вы мастер этого лобби'
            : 'Вы участник'

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <AppHeader
          title={lobby.name}
          subtitle={roleSubtitle}
          onOfficialSite={openProductSite}
          lobbyMobileShell
        />

        <div className="lobby-hub-top">
          <Text>
            <Link to="/lobbies">← Все лобби</Link>
          </Text>
          {lobby.invite_code ? (
            <div className="lobby-hub-invite">
              <div className="lobby-hub-code">
                <Text tone="muted">Код комнаты</Text>
                <button
                  type="button"
                  className="lobby-hub-code__value"
                  onClick={async () => {
                    await navigator.clipboard.writeText(lobby.invite_code ?? '')
                    setToast('Код скопирован')
                  }}
                >
                  {lobby.invite_code}
                </button>
                {canChangeInvite ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setRotateConfirmOpen(true)}
                  >
                    Новый код
                  </Button>
                ) : null}
              </div>
              <div className="lobby-hub-invite__meta">
                <Text tone="muted">
                  Ссылка:{' '}
                  <Link to={lobby.join_path || `/join/${lobby.invite_code}`}>
                    {lobby.join_path || `/join/${lobby.invite_code}`}
                  </Link>
                </Text>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(joinUrlForCode(lobby.invite_code!))
                    setToast('Ссылка скопирована')
                  }}
                >
                  Копировать ссылку
                </Button>
                <InviteQr inviteCode={lobby.invite_code} lobbyName={lobby.name} size={120} />
              </div>
            </div>
          ) : null}
        </div>

        {error ? <Text tone="danger">{error}</Text> : null}

        <LobbySetupHints lobby={lobby} />

        <LobbyHubTabs
          active={tab}
          onChange={changeTab}
          journalHasNew={
            tab !== 'journal' && journalHasNew(lastJournalPublishedAt, journalSeenAt)
          }
          chatsBadgeCount={tab === 'chats' ? 0 : chatsHubBadge.total}
        />

        {tab === 'roster' ? (
          <Panel title="Состав кампании">
            <Stack gap={12}>
              <Text tone="muted">
                Упрощённые карточки участников (ориентир ~8, бывает 3–10). Полные статы — в сессии.
                Персонажи попадают в лобби только по коду / QR со своего аккаунта — своих из
                ростера здесь не сажаем.
              </Text>
              {lobby.members.length === 0 ? (
                <Text tone="muted">
                  Пока никого. Раздай код комнаты — каждый участник (и мастер тоже) входит со
                  своим персонажем через «В лобби» /join.
                </Text>
              ) : (
                <div className="lobby-member-grid">
                  {lobby.members.map((m) => {
                    const isOwn = ownCharacterIds.has(m.character_id)
                    const seated = seatedCharacterIds.has(m.character_id)
                    const canKick = Boolean(lobby.is_owner) && !isOwn
                    const canLeave = isOwn
                    return (
                      <LobbyMemberMiniCard
                        key={m.id}
                        member={m}
                        busy={busy}
                        seated={seated}
                        sheetLabel={lobby.is_owner && !isOwn ? 'Смотреть' : 'Лист'}
                        removeLabel={canLeave ? 'Покинуть' : 'Убрать'}
                        canWaiveStartRules={canEditRules}
                        onWaiveStartRules={
                          canEditRules && m.start_rules_ok === false
                            ? () =>
                                run(async () => {
                                  const next = await waiveMemberStartRules(
                                    lobby.id,
                                    m.character_id,
                                  )
                                  setLobby(next)
                                  setToast('Пометка снята')
                                })
                            : undefined
                        }
                        onRemove={
                          canKick || canLeave
                            ? () => {
                                if (canLeave && seated) {
                                  setError(
                                    'Дождитесь конца сессии или попросите мастера убрать персонажа',
                                  )
                                  return
                                }
                                setMemberAction({
                                  mode: canLeave ? 'leave' : 'kick',
                                  characterId: m.character_id,
                                  characterName: m.character_name,
                                  seated,
                                })
                              }
                            : undefined
                        }
                      />
                    )
                  })}
                </div>
              )}
              <LobbyRolesPanel
                lobby={lobby}
                busy={busy}
                onLobby={setLobby}
                onToast={setToast}
                onError={setError}
                run={run}
                ownCharacterId={
                  lobby.members.find((m) => ownCharacterIds.has(m.character_id))?.character_id
                }
              />
            </Stack>
          </Panel>
        ) : null}

        {tab === 'journal' ? (
          <LobbyJournalPanel
            lobbyId={lobby.id}
            isOwner={canManageJournal}
            settings={lobby.settings}
            sessions={lobby.sessions}
            mediaUsage={lobby.media_usage ?? null}
            onMediaUsageChange={(next) =>
              setLobby((prev) => (prev ? { ...prev, media_usage: next } : prev))
            }
            onPublishedAt={setLastJournalPublishedAt}
            onToast={setToast}
            onError={setError}
          />
        ) : null}

        {tab === 'notes' ? (
          <LobbyNotesPanel
            lobbyId={lobby.id}
            canManageJournal={canManageJournal}
            settingId={lobby.settings[0]?.id ?? null}
            ownCharacterOptions={lobby.members
              .filter((m) => ownCharacterIds.has(m.character_id))
              .map((m) => ({ id: m.character_id, name: m.character_name }))}
            onToast={setToast}
            onError={setError}
            onSendToJournal={
              canManageJournal
                ? (note) => {
                    setSendNote(note)
                    setSendPublishNow(false)
                    setSendDeleteNote(false)
                  }
                : undefined
            }
          />
        ) : null}

        {tab === 'chats' ? (
          <LobbyChatsPanel
            lobbyId={lobby.id}
            isOwner={canManageJournal}
            ownCharacterOptions={lobby.members
              .filter((m) => ownCharacterIds.has(m.character_id))
              .map((m) => ({ id: m.character_id, name: m.character_name }))}
            onToast={setToast}
            onError={setError}
            onBadgeChange={setChatsHubBadge}
          />
        ) : null}

        {tab === 'sessions' ? (
          <Stack gap={16}>
            <Panel title="Сессии">
              <Stack gap={12}>
                <Text tone="muted">
                  Создайте сессию, отметьте кто пришёл, ведите стол. Закрытие пишет итог в дневник.
                </Text>
                {lobby.sessions.length === 0 ? (
                  <Text tone="muted">Пока нет сессий.</Text>
                ) : (
                  lobby.sessions.map((s) => (
                    <div className="list-row" key={s.id}>
                      <div>
                        <Link to={`/sessions/${s.id}`}>{s.name}</Link>
                        <Text tone="muted">
                          {s.setting_name ? `Сеттинг: ${s.setting_name}` : 'Ваншот'} · пришло:{' '}
                          {s.seat_count}
                          {s.closed_at ? ' · закрыта' : ''}
                        </Text>
                      </div>
                      <div className="list-row__actions">
                        <Link className="ui-button ui-button--secondary" to={`/sessions/${s.id}`}>
                          Открыть
                        </Link>
                        {lobby.can_delete_session ? (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => {
                              setDeleteTarget({ id: s.id, name: s.name })
                              setDeleteConfirmName('')
                              setDeleteConfirmOpen(true)
                            }}
                          >
                            Удалить
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </Stack>
            </Panel>

            {canRun ? (
              <Panel title="Новая сессия">
                <form
                  className="stack-form"
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    run(async () => {
                      const session = await createSession(lobby.id, {
                        name: sessionName.trim() || undefined,
                        setting_id: sessionSettingId || null,
                        character_ids: [...sessionPresentIds],
                      })
                      setSessionName('')
                      setSessionPresentIds(new Set())
                      navigate(`/sessions/${session.id}`)
                    })
                  }}
                >
                  <Field label="Название сессии">
                    <Input
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="Глава / ваншот…"
                    />
                  </Field>
                  <Field label="Сеттинг">
                    <select
                      className="ui-input"
                      value={sessionSettingId}
                      onChange={(e) => setSessionSettingId(e.target.value)}
                    >
                      <option value="">Ваншот — без сеттинга</option>
                      {lobby.settings.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <SessionAttendancePanel
                    mode="create"
                    members={lobby.members}
                    presentIds={sessionPresentIds}
                    busy={busy}
                    onToggle={(characterId, nextPresent) => {
                      setSessionPresentIds((prev) => {
                        const next = new Set(prev)
                        if (nextPresent) next.add(characterId)
                        else next.delete(characterId)
                        return next
                      })
                    }}
                  />
                  <Button type="submit" disabled={busy}>
                    + Создать сессию
                    {sessionPresentIds.size > 0 ? ` (${sessionPresentIds.size})` : ''}
                  </Button>
                </form>
              </Panel>
            ) : null}
          </Stack>
        ) : null}

        {tab === 'setting' ? (
          <Panel title="Сеттинг">
            <Stack gap={12}>
              <Text tone="muted">
                В лобби один активный сеттинг. Сессию можно открыть ваншотом без сеттинга.
              </Text>
              {lobby.settings_need_primary && canEditWiki ? (
                <div className="lobby-setting-primary-banner" role="status">
                  <Text>
                    В лобби должен остаться один сеттинг. Выберите основной — остальные уйдут в
                    корзину позже.
                  </Text>
                  <Stack gap={8}>
                    {lobby.settings.map((s) => (
                      <div className="list-row" key={s.id}>
                        <div>
                          <Link to={`/settings/${s.id}`}>{s.name}</Link>
                        </div>
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              const next = await choosePrimarySetting(lobby.id, s.id)
                              setLobby(next)
                              setToast(`Основной сеттинг: ${s.name}`)
                            })
                          }
                        >
                          Сделать основным
                        </Button>
                      </div>
                    ))}
                  </Stack>
                </div>
              ) : null}
              {lobby.settings.map((s) => (
                <div className="list-row" key={s.id}>
                  <div>
                    <Link to={`/settings/${s.id}`}>{s.name}</Link>
                    <Text tone="muted">
                      {s.world_notes.trim() ? s.world_notes.slice(0, 80) : 'Мир пока пуст'}
                    </Text>
                  </div>
                  {canEditWiki || canRun ? (
                    <div className="list-row__actions">
                      {canRun ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => {
                            setSessionSettingId(s.id)
                            setSessionName(`${s.name} — сессия`)
                            setTab('sessions')
                            navigate(`${location.pathname}#sessions`, { replace: true })
                          }}
                        >
                          Сессия
                        </Button>
                      ) : null}
                      {canEditWiki ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              if (!confirm('Удалить сеттинг? Сессии станут ваншотами.')) return
                              await deleteSetting(s.id)
                              await reload()
                            })
                          }
                        >
                          Удалить
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
              {canEditWiki && lobby.settings.length === 0 ? (
                <form
                  className="inline-form"
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    run(async () => {
                      await createSetting(lobby.id, { name: settingName.trim() || undefined })
                      setSettingName('')
                      await reload()
                      setToast('Сеттинг создан')
                    })
                  }}
                >
                  <Field label="Новый сеттинг">
                    <Input
                      value={settingName}
                      onChange={(e) => setSettingName(e.target.value)}
                      placeholder="Мир кампании…"
                    />
                  </Field>
                  <Button type="submit" disabled={busy}>
                    + Сеттинг
                  </Button>
                </form>
              ) : null}
            </Stack>
          </Panel>
        ) : null}

        {tab === 'settings' ? (
          <Stack gap={16}>
            <Panel title="Настройки комнаты">
              <Stack gap={12}>
                {lobby.is_owner ? (
                  <Field label="Название">
                    <Input
                      value={lobby.name}
                      onChange={(e) => setLobby({ ...lobby, name: e.target.value })}
                      onBlur={() =>
                        run(async () => {
                          const next = await updateLobby(lobby.id, { name: lobby.name })
                          setLobby(next)
                        })
                      }
                    />
                  </Field>
                ) : (
                  <Text tone="muted">Название меняет только мастер.</Text>
                )}
                {lobby.invite_code ? (
                  <>
                    <Field label="Код лобби">
                      <div className="invite-code-row">
                        <Input readOnly value={lobby.invite_code} />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={async () => {
                            await navigator.clipboard.writeText(lobby.invite_code ?? '')
                            setToast('Код скопирован')
                          }}
                        >
                          Копировать
                        </Button>
                        {canChangeInvite ? (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => setRotateConfirmOpen(true)}
                          >
                            Новый код
                          </Button>
                        ) : null}
                      </div>
                    </Field>
                    <Text tone="muted">
                      Игрок открывает{' '}
                      <Link to={lobby.join_path || `/join/${lobby.invite_code}`}>
                        {lobby.join_path || `/join/${lobby.invite_code}`}
                      </Link>{' '}
                      и выбирает персонажа.
                    </Text>
                    <InviteQr inviteCode={lobby.invite_code} lobbyName={lobby.name} />
                  </>
                ) : null}
              </Stack>
            </Panel>

            {lobby.media_usage || canEditWiki || canManageJournal ? (
              <LobbyMediaQuotaPanel
                lobbyId={lobby.id}
                usage={
                  lobby.media_usage ?? {
                    used_bytes: 0,
                    free_bytes: 200 * 1024 * 1024,
                    limit_bytes: 200 * 1024 * 1024,
                    used_mb: 0,
                    free_mb: 200,
                    limit_mb: 200,
                  }
                }
                canUpload={canEditWiki || canManageJournal}
                onUsageChange={(next: LobbyMediaUsage) =>
                  setLobby((prev) => (prev ? { ...prev, media_usage: next } : prev))
                }
                onToast={setToast}
                onError={setError}
              />
            ) : null}

            <CampaignRulesPanel
              rules={rulesDraft}
              eventHistory={visibilityDraft.event_history}
              readOnly={rulesReadOnly}
              createHeroHref={createHeroForLobbyHref({
                lobbyId: lobby.id,
                code: lobby.invite_code,
              })}
              onChange={onRulesChange}
              onEventHistoryChange={(mode) => {
                onVisibilityChange({ ...visibilityDraft, event_history: mode })
                setRulesDirty(true)
              }}
            />

            {canEditRules && !playerPreview ? (
              <div className="inline-actions">
                <Button
                  type="button"
                  disabled={busy || (!rulesDirty && !visibilityDirty)}
                  onClick={() =>
                    run(async () => {
                      const next = await updateLobby(lobby.id, {
                        campaign_rules: rulesDraft,
                        // Владелец — полный профиль; сомастер — event_history (скрытность бросков).
                        visibility_profile: visibilityDraft,
                      })
                      setLobby(next)
                      setRulesDraft(normalizeCampaignRules(next.campaign_rules))
                      setVisibilityDraft(normalizeVisibilityProfile(next.visibility_profile))
                      setRulesDirty(false)
                      setVisibilityDirty(false)
                      setToast('Правила кампании сохранены')
                    })
                  }
                >
                  Сохранить правила
                </Button>
              </div>
            ) : null}

            <VisibilitySettingsPanel
              profile={visibilityDraft}
              readOnly={visibilityReadOnly}
              playerPreview={playerPreview}
              onPlayerPreviewChange={lobby.is_owner ? setPlayerPreview : undefined}
              onChange={onVisibilityChange}
            />

            {lobby.is_owner ? (
              <div className="inline-actions">
                <Button
                  type="button"
                  disabled={busy || !visibilityDirty}
                  onClick={() =>
                    run(async () => {
                      const next = await updateLobby(lobby.id, {
                        visibility_profile: visibilityDraft,
                      })
                      setLobby(next)
                      setVisibilityDraft(normalizeVisibilityProfile(next.visibility_profile))
                      setVisibilityDirty(false)
                      setToast('Видимость сохранена')
                    })
                  }
                >
                  Сохранить видимость
                </Button>
              </div>
            ) : null}

            {canDeleteLobby ? (
              <Panel title="Опасная зона" className="ui-panel--danger">
                <Stack gap={10}>
                  <Text tone="muted">
                    Пропадут дневник, заметки, чаты, сессии и картинки лобби. Персонажи останутся у
                    игроков.
                  </Text>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const file = await exportNotes(lobby.id)
                        downloadTextFile(file.filename, file.content)
                        setToast('Заметки скачаны')
                      })
                    }
                  >
                    Скачать заметки
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      setLobbyDeleteName('')
                      setLobbyDeleteOpen(true)
                    }}
                  >
                    Удалить комнату
                  </Button>
                </Stack>
              </Panel>
            ) : null}
          </Stack>
        ) : null}
      </Stack>

      <Dialog
        open={deleteConfirmOpen}
        title="Удалить сессию"
        primaryLabel={busy ? 'Удаляем…' : 'Удалить'}
        secondaryLabel="Отмена"
        busy={busy}
        primaryVariant="danger"
        onPrimary={() => {
          if (!deleteTarget) return
          if (deleteConfirmName.trim() !== deleteTarget.name) {
            setError('Введите точное название сессии')
            return
          }
          void run(async () => {
            await deleteSession(deleteTarget.id)
            setDeleteConfirmOpen(false)
            setDeleteTarget(null)
            setToast('Сессия удалена')
            await reload()
          })
        }}
        onSecondary={() => {
          setDeleteConfirmOpen(false)
          setDeleteTarget(null)
        }}
      >
        <Stack gap={12}>
          <Text tone="muted">
            Удаление необратимо. Введите название
            {deleteTarget ? ` «${deleteTarget.name}»` : ''} для подтверждения.
          </Text>
          <Field label="Название сессии">
            <Input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={deleteTarget?.name ?? ''}
            />
          </Field>
        </Stack>
      </Dialog>

      <Dialog
        open={lobbyDeleteOpen}
        title="Удалить лобби"
        primaryLabel={busy ? 'Удаляем…' : 'Удалить навсегда'}
        secondaryLabel="Отмена"
        busy={busy}
        primaryVariant="danger"
        primaryDisabled={lobbyDeleteName.trim() !== lobby.name}
        onPrimary={() => {
          if (lobbyDeleteName.trim() !== lobby.name) {
            setError('Введите точное название лобби')
            return
          }
          void run(async () => {
            await deleteLobby(lobby.id, lobbyDeleteName.trim())
            setLobbyDeleteOpen(false)
            navigate('/lobbies')
          })
        }}
        onSecondary={() => setLobbyDeleteOpen(false)}
      >
        <Stack gap={12}>
          <Text tone="muted">
            Пропадут дневник, заметки, чаты, сессии и картинки лобби. Персонажи останутся у игроков.
            Введите название «{lobby.name}» для подтверждения.
          </Text>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const file = await exportNotes(lobby.id)
                downloadTextFile(file.filename, file.content)
                setToast('Заметки скачаны')
              })
            }
          >
            Скачать заметки
          </Button>
          <Field label="Название лобби">
            <Input
              value={lobbyDeleteName}
              onChange={(e) => setLobbyDeleteName(e.target.value)}
              placeholder={lobby.name}
            />
          </Field>
        </Stack>
      </Dialog>

      <Dialog
        open={rotateConfirmOpen}
        title="Новый код приглашения"
        primaryLabel={busy ? 'Меняем…' : 'Выпустить новый код'}
        secondaryLabel="Отмена"
        busy={busy}
        onPrimary={() => {
          void run(async () => {
            const next = await rotateLobbyInviteCode(lobby.id)
            setLobby(next)
            setRotateConfirmOpen(false)
            setToast('Новый код действует, старый больше не подходит')
          })
        }}
        onSecondary={() => setRotateConfirmOpen(false)}
      >
        <Text tone="muted">
          Старый код перестанет работать. Состав, дневник, сессии и картинки останутся на месте.
        </Text>
      </Dialog>

      <Dialog
        open={sendNote != null}
        title="В дневник"
        primaryLabel={busy ? 'Переносим…' : sendPublishNow ? 'Опубликовать' : 'Черновик'}
        secondaryLabel="Отмена"
        busy={busy}
        onPrimary={() => {
          if (!sendNote) return
          void run(async () => {
            await createJournalEntry(lobby.id, {
              entry_type: 'text',
              title: sendNote.title,
              body: sendNote.body,
              is_draft: !sendPublishNow,
              source_note_id: sendNote.id,
              delete_source_note: sendDeleteNote,
            })
            setSendNote(null)
            setToast(
              sendPublishNow
                ? 'Запись опубликована в дневнике'
                : 'Черновик создан в дневнике',
            )
            if (sendDeleteNote) {
              // список заметок обновит realtime notes_changed / ручной refresh при открытии
            }
          })
        }}
        onSecondary={() => setSendNote(null)}
      >
        <Stack gap={12}>
          <Text tone="muted">
            Перенос с общей доски. По умолчанию — черновик; запись на доске остаётся.
          </Text>
          <label className="journal-composer__draft">
            <input
              type="checkbox"
              checked={sendPublishNow}
              onChange={(e) => setSendPublishNow(e.target.checked)}
            />
            <span>Сразу опубликовать</span>
          </label>
          <label className="journal-composer__draft">
            <input
              type="checkbox"
              checked={sendDeleteNote}
              onChange={(e) => setSendDeleteNote(e.target.checked)}
            />
            <span>Удалить запись с доски после переноса</span>
          </label>
        </Stack>
      </Dialog>

      <LeaveOrKickDialog
        open={memberAction != null}
        mode={memberAction?.mode ?? 'leave'}
        lobbyId={lobby.id}
        lobbyName={lobby.name}
        characterName={memberAction?.characterName ?? ''}
        seatedInOpenSession={Boolean(memberAction?.seated)}
        busy={busy}
        onClose={() => setMemberAction(null)}
        onConfirm={(opts) => {
          if (!memberAction) return
          const target = memberAction
          void run(async () => {
            const next = await removeLobbyMember(lobby.id, target.characterId, {
              combat_fate: opts.combat_fate,
              delete_personal_notes: opts.delete_personal_notes,
            })
            setLobby(next)
            setMemberAction(null)
            setToast(target.mode === 'leave' ? 'Вы покинули лобби' : 'Персонаж убран из состава')
            if (target.mode === 'leave' && !next.members.some((m) => ownCharacterIds.has(m.character_id))) {
              // остаёмся на хабе, если есть роль; иначе список лобби
              if (next.role === 'none' && !next.is_owner) {
                navigate('/lobbies')
              }
            }
          })
        }}
      />

      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
