import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { listCharacters, type CharacterSummary } from '../shared/api/characters'
import { ApiRequestError, getAccessToken } from '../shared/api/client'
import { joinLobby } from '../shared/api/lobbies'
import { Button, EmptyState, Field, Input, Panel, Stack, Text, Toast } from '../ui'

export function JoinLobbyPage() {
  const { code: routeCode = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialCode = (routeCode || searchParams.get('code') || '').toUpperCase()
  const [code, setCode] = useState(initialCode)
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [characterId, setCharacterId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!getAccessToken()) {
      const next = routeCode ? `/join/${routeCode}` : `/join?code=${encodeURIComponent(code)}`
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true })
      return
    }
    let active = true
    listCharacters()
      .then((items) => {
        if (!active) return
        setCharacters(items)
        if (items[0]) setCharacterId(items[0].id)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить персонажей')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [code, navigate, routeCode])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!characterId) {
      setError('Выберите персонажа')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const lobby = await joinLobby(code.trim(), characterId)
      navigate(`/lobbies/${lobby.id}`, { state: { toast: 'Персонаж добавлен в лобби' } })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось войти в лобби')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page page--app">
      <Stack gap={20}>
        <AppHeader
          title="Вход в лобби"
          subtitle="Код или QR от мастера → ваш персонаж в лобби"
          onOfficialSite={() => setToast('Официальный сайт скоро появится')}
        />

        <Panel title="Присоединиться">
          {loading ? (
            <Text tone="muted">Загрузка…</Text>
          ) : characters.length === 0 ? (
            <EmptyState
              title="Нет персонажей"
              description="Сначала создайте персонажа в своём ростере."
              action={
                <Link className="ui-button" to="/characters">
                  К персонажам
                </Link>
              }
            />
          ) : (
            <form className="stack-form" onSubmit={onSubmit}>
              <Field label="Код лобби">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  required
                />
              </Field>
              <Field label="Какого персонажа добавить">
                <select
                  className="ui-input"
                  value={characterId}
                  onChange={(e) => setCharacterId(e.target.value)}
                  required
                >
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.class_name || 'без класса'}
                    </option>
                  ))}
                </select>
              </Field>
              {error ? <Text tone="danger">{error}</Text> : null}
              <Button type="submit" disabled={busy}>
                {busy ? 'Входим…' : 'Войти в лобби'}
              </Button>
            </form>
          )}
        </Panel>
      </Stack>
      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
