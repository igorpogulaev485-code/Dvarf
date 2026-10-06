import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import {
  createLobby,
  listLobbies,
  type LobbySummary,
} from '../shared/api/lobbies'
import { ApiRequestError } from '../shared/api/client'
import { Button, EmptyState, Field, Input, Panel, Stack, Text, Toast } from '../ui'

export function LobbiesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<LobbySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

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
          onOfficialSite={() => setToast('Официальный сайт скоро появится')}
        />

        <Panel title="Создать лобби">
          <form className="inline-form" onSubmit={onCreate}>
            <Field label="Название">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Стол пятницы, кампания…"
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

        {error ? <Text tone="danger">{error}</Text> : null}

        {loading ? (
          <Text tone="muted">Загружаем лобби…</Text>
        ) : items.length === 0 ? (
          <EmptyState
            title="Пока нет лобби"
            description="Создайте своё или зайдите по коду / QR с персонажем."
          />
        ) : (
          <Stack gap={12}>
            {items.map((lobby) => (
              <Panel key={lobby.id}>
                <div className="list-row">
                  <div>
                    <Text as="h2">{lobby.name}</Text>
                    <Text tone="muted">
                      {lobby.is_owner ? 'Вы мастер' : 'Участник'} · персонажей:{' '}
                      {lobby.member_count}
                      {lobby.invite_code ? ` · код ${lobby.invite_code}` : ''}
                    </Text>
                  </div>
                  <Link className="ui-button" to={`/lobbies/${lobby.id}`}>
                    Открыть
                  </Link>
                </div>
              </Panel>
            ))}
          </Stack>
        )}

        <Panel title="Войти по коду">
          <Text tone="muted">
            Есть код от мастера? Откройте{' '}
            <Link to="/join">страницу входа</Link> или впишите код в карточку персонажа.
          </Text>
        </Panel>
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
