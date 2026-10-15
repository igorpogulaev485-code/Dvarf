import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { SessionAttendancePanel } from '../features/lobby/SessionAttendancePanel'
import { listCharacters } from '../shared/api/characters'
import { ApiRequestError } from '../shared/api/client'
import {
  getSession,
  seatCharacter,
  unseatCharacter,
  updateSession,
  type SessionDetail,
} from '../shared/api/lobbies'
import { Field, Input, Panel, Stack, Text, Toast } from '../ui'

export function SessionDetailPage() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [ownCharacterIds, setOwnCharacterIds] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const [detail, chars] = await Promise.all([getSession(sessionId), listCharacters()])
    setSession(detail)
    setOwnCharacterIds(new Set(chars.map((c) => c.id)))
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

  const presentIds = useMemo(
    () => new Set(session?.seats.map((s) => s.character_id) ?? []),
    [session],
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
        <Text>
          <Link to={`/lobbies/${session.lobby_id}`}>← В лобби «{session.lobby_name}»</Link>
        </Text>
        {error ? <Text tone="danger">{error}</Text> : null}

        <Panel title="Сессия">
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
              {' · '}
              пришло: {session.seats.length} из {session.lobby_members.length}
            </Text>
          </Stack>
        </Panel>

        <Panel title="Кто пришёл">
          <SessionAttendancePanel
            mode="manage"
            members={session.lobby_members}
            presentIds={presentIds}
            busy={busy}
            readOnly={!session.is_owner}
            isOwner={session.is_owner}
            ownCharacterIds={ownCharacterIds}
            onToggle={(characterId, nextPresent) => {
              run(async () => {
                const next = nextPresent
                  ? await seatCharacter(session.id, characterId)
                  : await unseatCharacter(session.id, characterId)
                setSession(next)
              })
            }}
          />
        </Panel>

        <Panel title="Живой стол">
          <Text tone="muted">
            Карточки по видимости, лента событий и броски появятся в следующем слайсе (A3). Пока
            здесь — посещаемость и вход к листам.
          </Text>
        </Panel>
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
