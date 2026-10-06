import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
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
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const [detail, chars] = await Promise.all([getLobby(lobbyId), listCharacters()])
    setLobby(detail)
    setCharacters(chars)
  }, [lobbyId])

  useEffect(() => {
    if ((location.state as LocationState | null)?.toast) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

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

  return (
    <main className="page page--app">
      <Stack gap={20}>
        <AppHeader
          title={lobby.name}
          subtitle={lobby.is_owner ? 'Вы мастер этого лобби' : 'Вы участник'}
          onOfficialSite={() => setToast('Официальный сайт скоро появится')}
        />

        <Text>
          <Link to="/lobbies">← Все лобби</Link>
        </Text>

        {error ? <Text tone="danger">{error}</Text> : null}

        {lobby.is_owner ? (
          <Panel title="Приглашение игроков">
            <Stack gap={12}>
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
                Игрок сканирует QR или открывает{' '}
                <Link to={lobby.join_path || `/join/${lobby.invite_code}`}>
                  {lobby.join_path || `/join/${lobby.invite_code}`}
                </Link>{' '}
                и выбирает персонажа. Код можно также вписать в карточку персонажа.
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
              <Field label="Название лобби">
                <Input
                  value={lobby.name}
                  onChange={(e) => setLobby({ ...lobby, name: e.target.value })}
                  onBlur={() =>
                    run(async () => {
                      const next = await updateLobby(lobby.id, lobby.name)
                      setLobby(next)
                    })
                  }
                />
              </Field>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    if (!confirm('Удалить лобби со всеми сеттингами и сессиями?')) return
                    await deleteLobby(lobby.id)
                    navigate('/lobbies')
                  })
                }
              >
                Удалить лобби
              </Button>
            </Stack>
          </Panel>
        ) : null}

        <Panel title="Персонажи в лобби">
          <Stack gap={10}>
            {lobby.members.length === 0 ? (
              <Text tone="muted">Пока никого. Игроки входят по коду / QR.</Text>
            ) : (
              lobby.members.map((m) => (
                <div className="list-row" key={m.id}>
                  <div>
                    <Text as="h3">{m.character_name}</Text>
                    <Text tone="muted">
                      {[m.character_race_name, m.character_class_name]
                        .filter(Boolean)
                        .join(' · ') || `ур. ${m.character_level}`}
                      {m.hp_max != null
                        ? ` · HP ${m.hp_current ?? 0}/${m.hp_max}`
                        : ''}
                    </Text>
                  </div>
                  <div className="list-row__actions">
                    <Link className="ui-button ui-button--ghost" to={`/characters/${m.character_id}`}>
                      Лист
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const next = await removeLobbyMember(lobby.id, m.character_id)
                          setLobby(next)
                        })
                      }
                    >
                      Убрать
                    </Button>
                  </div>
                </div>
              ))
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

        <Panel title="Сеттинги">
          <Stack gap={12}>
            <Text tone="muted">
              Мир / зона мастера. Не обязателен — сессию можно открыть ваншотом.
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

        <Panel title="Сессии">
          <Stack gap={12}>
            <Text tone="muted">Сегодняшний стол. Бой и лут будут здесь.</Text>
            {lobby.sessions.map((s) => (
              <div className="list-row" key={s.id}>
                <div>
                  <Link to={`/sessions/${s.id}`}>{s.name}</Link>
                  <Text tone="muted">
                    {s.setting_name ? `Сеттинг: ${s.setting_name}` : 'Ваншот'} · за столом:{' '}
                    {s.seat_count}
                  </Text>
                </div>
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
            ))}
            {lobby.is_owner ? (
              <form
                className="inline-form"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault()
                  run(async () => {
                    const session = await createSession(lobby.id, {
                      name: sessionName.trim() || undefined,
                      setting_id: sessionSettingId || null,
                    })
                    navigate(`/sessions/${session.id}`)
                  })
                }}
              >
                <Field label="Название сессии">
                  <Input
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Ваншот / глава…"
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
                <Button type="submit" disabled={busy}>
                  + Открыть сессию
                </Button>
              </form>
            ) : null}
          </Stack>
        </Panel>
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
