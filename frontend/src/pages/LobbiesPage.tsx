import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import {
  createLobby,
  listLobbies,
  type LobbySummary,
} from '../shared/api/lobbies'
import { ApiRequestError } from '../shared/api/client'
import { AppLegalFooter, openProductSite } from '../shared/brand/creed20'
import { Button, EmptyState, Field, Input, Panel, Stack, Text } from '../ui'

function sortLobbiesLiveFirst(items: LobbySummary[]): LobbySummary[] {
  return [...items].sort((a, b) => {
    const aLive = a.has_open_session ? 1 : 0
    const bLive = b.has_open_session ? 1 : 0
    if (aLive !== bLive) return bLive - aLive
    return a.name.localeCompare(b.name, 'ru')
  })
}

export function LobbiesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<LobbySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    listLobbies()
      .then((list) => {
        if (active) setItems(list)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить лобби')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [navigate])

  const sortedItems = useMemo(() => sortLobbiesLiveFirst(items), [items])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const created = await createLobby(name.trim() || undefined)
      navigate(`/lobbies/${created.id}`, { state: { toast: 'Лобби создано' } })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось создать лобби')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="page page--app">
      <Stack gap={20}>
        <AppHeader
          title="Лобби"
          subtitle="Место игры: код и QR для игроков, внутри — сеттинг и сессии"
          onOfficialSite={openProductSite}
          lobbyMobileShell
        />

        <div className="lobbies-toolbar">
          <Button
            type="button"
            variant={createOpen ? 'secondary' : 'primary'}
            aria-expanded={createOpen}
            onClick={() => setCreateOpen((open) => !open)}
          >
            {createOpen ? 'Скрыть форму' : 'Создать'}
          </Button>
          <Text tone="muted" className="lobbies-toolbar__hint">
            Свои столы и живые игры — ниже. Новое лобби — кнопка «Создать».
          </Text>
        </div>

        {createOpen ? (
          <Panel title="Создать лобби">
            <form className="inline-form" onSubmit={onCreate}>
              <Field label="Название">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Стол пятницы, кампания…"
                  autoFocus
                />
              </Field>
              <Button type="submit" disabled={creating}>
                {creating ? 'Создаём…' : '+ Создать лобби'}
              </Button>
            </form>
            <Text tone="muted">
              После создания вы — мастер этого лобби. Код и QR появятся на странице лобби.
            </Text>
          </Panel>
        ) : null}

        {error ? <Text tone="danger">{error}</Text> : null}

        {loading ? (
          <Text tone="muted">Загружаем лобби…</Text>
        ) : sortedItems.length === 0 ? (
          <EmptyState
            title="Пока нет лобби"
            description="Нажмите «Создать» или зайдите по коду / QR с персонажем."
          />
        ) : (
          <Stack gap={12} className="lobbies-list">
            {sortedItems.map((lobby) => (
              <Panel
                key={lobby.id}
                className={lobby.has_open_session ? 'lobbies-list__item is-live' : 'lobbies-list__item'}
              >
                <div className="list-row">
                  <div>
                    <Text as="h2">{lobby.name}</Text>
                    <Text tone="muted">
                      {lobby.is_owner
                        ? 'Вы мастер'
                        : lobby.is_comaster
                          ? 'Вы сомастер'
                          : lobby.is_observer
                            ? 'Вы наблюдатель'
                            : 'Участник'}{' '}
                      · персонажей: {lobby.member_count}
                      {lobby.invite_code ? ` · код ${lobby.invite_code}` : ''}
                    </Text>
                    {lobby.has_open_session ? (
                      <span className="lobby-list-live">Идёт игра</span>
                    ) : null}
                  </div>
                  <div className="list-row__actions">
                    {lobby.has_open_session && lobby.open_session_id ? (
                      <Link
                        className="ui-button ui-button--secondary"
                        to={`/sessions/${lobby.open_session_id}`}
                      >
                        За стол
                      </Link>
                    ) : null}
                    <Link className="ui-button" to={`/lobbies/${lobby.id}`}>
                      Открыть
                    </Link>
                  </div>
                </div>
              </Panel>
            ))}
          </Stack>
        )}

        <Panel title="Войти по коду">
          <Stack gap={10}>
            <Text tone="muted">
              Есть код от мастера? Введите его на странице входа или впишите в карточку
              персонажа.
            </Text>
            <Link className="ui-button join-entry-cta" to="/join">
              Ввести код
            </Link>
          </Stack>
        </Panel>

        <AppLegalFooter />
      </Stack>
    </main>
  )
}
