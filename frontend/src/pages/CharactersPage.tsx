import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppHeader,
  CharacterList,
  CreateCharacterButton,
} from '../features/characters'
import { getMe, type User } from '../shared/api/auth'
import {
  createCharacter,
  listCharacters,
  type CharacterSummary,
  type RulesEdition,
} from '../shared/api/characters'
import { ApiRequestError } from '../shared/api/client'
import { Stack, Text, Toast } from '../ui'

export function CharactersPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    setLoading(true)

    Promise.all([getMe(), listCharacters()])
      .then(([me, items]) => {
        if (!active) {
          return
        }
        setUser(me)
        setCharacters(items)
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

  async function handleCreate(edition: RulesEdition) {
    setCreating(true)
    setError(null)
    try {
      const created = await createCharacter(edition)
      navigate(`/characters/${created.id}`, {
        state: { toast: 'Персонаж создан' },
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
          subtitle={loading ? 'Загрузка...' : `${characters.length} в вашем списке`}
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
