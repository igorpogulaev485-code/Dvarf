import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { LobbyChatsPanel } from '../features/lobby/LobbyChatsPanel'
import { LobbyComingSoon } from '../features/lobby/LobbyComingSoon'
import { LobbyHubTabs, type LobbyHubTabId } from '../features/lobby/LobbyHubTabs'
import { LobbyJournalPanel } from '../features/lobby/LobbyJournalPanel'
import { LobbyMemberMiniCard } from '../features/lobby/LobbyMemberMiniCard'
import { SessionAttendancePanel } from '../features/lobby/SessionAttendancePanel'
import { VisibilitySettingsPanel } from '../features/lobby/VisibilitySettingsPanel'
import {
  defaultVisibilityProfile,
  normalizeVisibilityProfile,
  type VisibilityProfile,
} from '../features/lobby/visibilityProfile'
import { listCharacters, type CharacterSummary } from '../shared/api/characters'
import { ApiRequestError } from '../shared/api/client'
import {
  addLobbyMember,
  createSession,
  createSetting,
  deleteLobby,
  deleteSession,
  deleteSetting,
  getLobby,
  lobbyQrUrl,
  removeLobbyMember,
  updateLobby,
  type LobbyDetail,
} from '../shared/api/lobbies'
import { Button, Field, Input, Panel, Stack, Text, Toast } from '../ui'

type LocationState = { toast?: string }

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
  const [tab, setTab] = useState<LobbyHubTabId>(() => tabFromHash(location.hash))
  const [playerPreview, setPlayerPreview] = useState(false)
  const [visibilityDraft, setVisibilityDraft] = useState<VisibilityProfile>(
    defaultVisibilityProfile(),
  )
  const [visibilityDirty, setVisibilityDirty] = useState(false)

  const reload = useCallback(async () => {
    const [detail, chars] = await Promise.all([getLobby(lobbyId), listCharacters()])
    setLobby(detail)
    setCharacters(chars)
    setVisibilityDraft(normalizeVisibilityProfile(detail.visibility_profile))
    setVisibilityDirty(false)
  }, [lobbyId])

  useEffect(() => {
    if ((location.state as LocationState | null)?.toast) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    setTab(tabFromHash(location.hash))
  }, [location.hash])

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

  const memberIds = useMemo(
    () => new Set(lobby?.members.map((m) => m.character_id) ?? []),
    [lobby],
  )
  const ownCharacterIds = useMemo(() => new Set(characters.map((c) => c.id)), [characters])
  const available = characters.filter((c) => !memberIds.has(c.id))

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
  }

  function onVisibilityChange(next: VisibilityProfile) {
    setVisibilityDraft(next)
    setVisibilityDirty(true)
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

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <AppHeader
          title={lobby.name}
          subtitle={lobby.is_owner ? 'Вы мастер этого лобби' : 'Вы участник'}
          onOfficialSite={() => setToast('Официальный сайт скоро появится')}
        />

        <div className="lobby-hub-top">
          <Text>
            <Link to="/lobbies">← Все лобби</Link>
          </Text>
          {lobby.is_owner && lobby.invite_code ? (
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
            </div>
          ) : null}
        </div>

        {error ? <Text tone="danger">{error}</Text> : null}

        <LobbyHubTabs active={tab} onChange={changeTab} />

        {tab === 'roster' ? (
          <Panel title="Состав кампании">
            <Stack gap={12}>
              <Text tone="muted">
                Упрощённые карточки участников (ориентир ~8, бывает 3–10). Полные статы — в сессии.
              </Text>
              {lobby.members.length === 0 ? (
                <Text tone="muted">Пока никого. Игроки входят по коду / QR.</Text>
              ) : (
                <div className="lobby-member-grid">
                  {lobby.members.map((m) => {
                    const isOwn = characters.some((c) => c.id === m.character_id)
                    return (
                      <LobbyMemberMiniCard
                        key={m.id}
                        member={m}
                        busy={busy}
                        sheetLabel={lobby.is_owner && !isOwn ? 'Смотреть' : 'Лист'}
                        onRemove={
                          lobby.is_owner
                            ? () =>
                                run(async () => {
                                  const next = await removeLobbyMember(lobby.id, m.character_id)
                                  setLobby(next)
                                })
                            : undefined
                        }
                      />
                    )
                  })}
                </div>
              )}

              {lobby.is_owner && available.length > 0 ? (
                <Stack gap={8}>
                  <Text as="h3">Добавить своего персонажа</Text>
                  {available.map((c) => (
                    <div className="list-row" key={c.id}>
                      <Text>
                        {c.name} · {c.class_name || 'без класса'}
                      </Text>
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            const next = await addLobbyMember(lobby.id, c.id)
                            setLobby(next)
                            setToast('Персонаж в лобби')
                          })
                        }
                      >
                        В лобби
                      </Button>
                    </div>
                  ))}
                </Stack>
              ) : null}
            </Stack>
          </Panel>
        ) : null}

        {tab === 'journal' ? (
          <LobbyJournalPanel
            lobbyId={lobby.id}
            isOwner={lobby.is_owner}
            settings={lobby.settings}
            onToast={setToast}
            onError={setError}
          />
        ) : null}

        {tab === 'notes' ? (
          <LobbyComingSoon
            title="Заметки"
            description="Личный блокнот и общая доска пати — следующий слой после чатов."
          />
        ) : null}

        {tab === 'chats' ? (
          <LobbyChatsPanel
            lobbyId={lobby.id}
            isOwner={lobby.is_owner}
            ownCharacterOptions={lobby.members
              .filter((m) => ownCharacterIds.has(m.character_id))
              .map((m) => ({ id: m.character_id, name: m.character_name }))}
            onToast={setToast}
            onError={setError}
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
                        {lobby.is_owner ? (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                if (!confirm('Удалить сессию?')) return
                                await deleteSession(s.id)
                                await reload()
                              })
                            }
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

            {lobby.is_owner ? (
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
                Мир / зона мастера. Не обязателен — сессию можно открыть ваншотом. Вики — фаза C.
              </Text>
              {lobby.settings.map((s) => (
                <div className="list-row" key={s.id}>
                  <div>
                    <Link to={`/settings/${s.id}`}>{s.name}</Link>
                    <Text tone="muted">
                      {s.world_notes.trim() ? s.world_notes.slice(0, 80) : 'Мир пока пуст'}
                    </Text>
                  </div>
                  {lobby.is_owner ? (
                    <div className="list-row__actions">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            const session = await createSession(lobby.id, {
                              setting_id: s.id,
                              name: `${s.name} — сессия`,
                            })
                            navigate(`/sessions/${session.id}`)
                          })
                        }
                      >
                        Сессия
                      </Button>
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
                    </div>
                  ) : null}
                </div>
              ))}
              {lobby.is_owner ? (
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
            {lobby.is_owner ? (
              <Panel title="Настройки комнаты">
                <Stack gap={12}>
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
                  <Field label="Код лобби">
                    <div className="invite-code-row">
                      <Input readOnly value={lobby.invite_code ?? ''} />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={async () => {
                          if (!lobby.invite_code) return
                          await navigator.clipboard.writeText(lobby.invite_code)
                          setToast('Код скопирован')
                        }}
                      >
                        Копировать
                      </Button>
                    </div>
                  </Field>
                  <Text tone="muted">
                    Игрок открывает{' '}
                    <Link to={lobby.join_path || `/join/${lobby.invite_code}`}>
                      {lobby.join_path || `/join/${lobby.invite_code}`}
                    </Link>{' '}
                    и выбирает персонажа.
                  </Text>
                  {lobby.invite_code ? (
                    <img
                      className="invite-qr"
                      src={lobbyQrUrl(lobby.invite_code)}
                      alt={`QR для входа в лобби ${lobby.name}`}
                      width={180}
                      height={180}
                    />
                  ) : null}
                </Stack>
              </Panel>
            ) : (
              <Panel title="Настройки комнаты">
                <Text tone="muted">Только мастер меняет название и приглашение.</Text>
              </Panel>
            )}

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

            {lobby.is_owner ? (
              <Panel title="Опасная зона" className="ui-panel--danger">
                <Button
                  type="button"
                  variant="danger"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (!confirm('Удалить лобби со всеми сеттингами и сессиями?')) return
                      await deleteLobby(lobby.id)
                      navigate('/lobbies')
                    })
                  }
                >
                  Удалить комнату
                </Button>
              </Panel>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
