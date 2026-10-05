import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { MinimalSheetEditor } from '../features/characters/MinimalSheetEditor'
import { getCharacter, type CharacterDetail } from '../shared/api/characters'
import { ApiRequestError } from '../shared/api/client'
import { Stack, Text, Toast } from '../ui'

type LocationState = {
  toast?: string
}

export function CharacterDetailPage() {
  const { characterId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [character, setCharacter] = useState<CharacterDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(
    (location.state as LocationState | null)?.toast ?? null,
  )
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if ((location.state as LocationState | null)?.toast) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    let active = true
    setLoading(true)
    getCharacter(characterId)
      .then((item) => {
        if (active) {
          setCharacter(item)
        }
      })
      .catch((err: unknown) => {
        if (!active) {
          return
        }
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось открыть персонажа')
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [characterId, navigate])

  return (
    <main className="page page--app">
      <Stack gap={16}>
        <Link className="back-link" to="/characters">
          ← К списку персонажей
        </Link>

        {loading ? <Text tone="muted">Открываем лист...</Text> : null}
        {error ? <Text tone="danger">{error}</Text> : null}

        {character ? (
          <MinimalSheetEditor
            key={character.id}
            character={character}
            onSaved={setCharacter}
            onToast={setToast}
          />
        ) : null}
      </Stack>
      <Toast message={toast} onClose={closeToast} />
    </main>
  )
}
