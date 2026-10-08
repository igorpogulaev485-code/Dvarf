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
import { Stack, Text, Toast } from '../ui'

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

  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([listCharacters(), getMe().catch(() => null)])
      .then(([items, me]) => {
        if (!active) {
          return
        }
        setCharacters(items)
        setUser(me)
      })
      .catch((err: unknown) => {
        if (!active) {
          return
        }
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить персонажей')
        setCharacters([])
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [navigate])

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

        {error ? <Text tone="danger">{error}</Text> : null}

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
