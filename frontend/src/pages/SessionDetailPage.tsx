import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { ApiRequestError } from '../shared/api/client'
import {
  getSession,
  seatCharacter,
  unseatCharacter,
  updateSession,
  type SessionDetail,
} from '../shared/api/lobbies'
import { Button, Field, Input, Panel, Stack, Text, Toast } from '../ui'

export function SessionDetailPage() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    setSession(await getSession(sessionId))
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

  const seatedIds = useMemo(
    () => new Set(session?.seats.map((s) => s.character_id) ?? []),
    [session],
  )
  const available = session?.lobby_members.filter((m) => !seatedIds.has(m.character_id)) ?? []

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

  if (!session && !error) {
    return (
      <main className="page page--app">
        <Text tone="muted">Загрузка сессии…</Text>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="page page--app">
        <Text tone="danger">{error}</Text>
      </main>
    )
  }

  return (
    <main className="page page--app">
      <Stack gap={20}>
        <AppHeader
          title={session.name}
          subtitle={
            session.setting_name
              ? `Сессия · ${session.setting_name}`
              : 'Сессия · ваншот'
          }
          onOfficialSite={() => setToast('Официальный сайт скоро появится')}
        />
        <Text>
          <Link to={`/lobbies/${session.lobby_id}`}>← В лобби «{session.lobby_name}»</Link>
        </Text>
        {error ? <Text tone="danger">{error}</Text> : null}

        <Panel title="Стол">
          <Stack gap={12}>
            {session.is_owner ? (
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
            </Text>
          </Stack>
        </Panel>

        <Panel title="За столом">
          <Stack gap={10}>
            {session.seats.length === 0 ? (
              <Text tone="muted">Никого нет. Посадите персонажей из лобби.</Text>
            ) : (
              session.seats.map((seat) => (
                <div className="list-row" key={seat.character_id}>
                  <div>
                    <Text as="h3">{seat.character_name}</Text>
                    <Text tone="muted">
                      {[seat.character_race_name, seat.character_class_name]
                        .filter(Boolean)
                        .join(' · ') || `ур. ${seat.character_level}`}
                      {seat.hp_max != null
                        ? ` · HP ${seat.hp_current ?? 0}/${seat.hp_max}`
                        : ''}
                    </Text>
                  </div>
                  <div className="list-row__actions">
                    <Link
                      className="ui-button ui-button--ghost"
                      to={`/characters/${seat.character_id}`}
                    >
                      Лист
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const next = await unseatCharacter(session.id, seat.character_id)
                          setSession(next)
                        })
                      }
                    >
                      Убрать
                    </Button>
                  </div>
                </div>
              ))
            )}
          </Stack>
        </Panel>

        <Panel title="Из лобби за стол">
          <Stack gap={10}>
            {available.length === 0 ? (
              <Text tone="muted">
                Все персонажи лобби уже за столом.{' '}
                <Link to={`/lobbies/${session.lobby_id}`}>Добавить в лобби</Link>
              </Text>
            ) : (
              available.map((m) => (
                <div className="list-row" key={m.character_id}>
                  <Text>
                    {m.character_name} · {m.character_class_name || 'без класса'}
                  </Text>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const next = await seatCharacter(session.id, m.character_id)
                        setSession(next)
                      })
                    }
                  >
                    За стол
                  </Button>
                </div>
              ))
            )}
          </Stack>
        </Panel>

        <Panel title="Бой">
          <Text tone="muted">
            Подготовка боя и лут появятся на уровне сессии — не в сеттинге.
          </Text>
        </Panel>
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
