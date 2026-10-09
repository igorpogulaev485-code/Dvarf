import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppHeader,
  CharacterList,
  CreateCharacterButton,
  type CreateCharacterRequest,
} from '../features/characters'
import { getMe, type User } from '../shared/api/auth'
import {
  createCharacter,
  listCharacters,
  type CharacterSummary,
} from '../shared/api/characters'
import { ApiRequestError } from '../shared/api/client'
import { Button, Stack, Text, Toast } from '../ui'

function listSubtitle(user: User | null, count: number): string {
  const who = user?.display_name || user?.login || user?.email
  if (who) {
    return `${who} · ${count} в списке`
  }
  return `${count} в вашем списке`
}

export function CharactersPage() {
  const navigate = useNavigate()
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    // Load profile and list independently so a list failure still shows who is logged in.
    void getMe()
      .then((me) => {
        if (active) setUser(me)
      })
      .catch(() => {
        if (active) setUser(null)
      })

    listCharacters()
      .then((items) => {
        if (!active) return
        setCharacters(items)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        const message =
          err instanceof ApiRequestError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Не удалось загрузить персонажей'
        setError(message)
        setCharacters([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [navigate, reloadKey])

  async function handleCreate(request: CreateCharacterRequest) {
    if (request.edition === '2014') {
      navigate('/characters/create')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const created = await createCharacter(request.edition)
      navigate(`/characters/${created.id}`, {
        state: {
          toast: 'Персонаж создан — сначала предыстория, потом класс, потом раса',
          createGuide: 'background-first',
        },
      })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось создать персонажа')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="page page--app">
      <Stack gap={20}>
        <AppHeader
          title="Мои персонажи"
          subtitle={loading ? 'Загрузка...' : listSubtitle(user, characters.length)}
          user={user}
          onOfficialSite={() => setToast('Официальный сайт скоро появится')}
        />

        <section className="toolbar">
          <CreateCharacterButton pending={creating} onCreate={handleCreate} />
        </section>

        {error ? (
          <Stack gap={8}>
            <Text tone="danger">{error}</Text>
            <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
              Повторить загрузку
            </Button>
          </Stack>
        ) : null}

        {loading ? (
          <Text tone="muted">Загружаем персонажей...</Text>
        ) : (
          <CharacterList
            characters={characters}
            emptyAction={<CreateCharacterButton pending={creating} onCreate={handleCreate} />}
          />
        )}
      </Stack>
      <Toast message={toast} onClose={closeToast} />
    </main>
  )
}
