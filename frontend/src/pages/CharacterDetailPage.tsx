import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { MinimalSheetEditor } from '../features/characters/MinimalSheetEditor'
import { getCharacter, type CharacterDetail } from '../shared/api/characters'
import { ApiRequestError } from '../shared/api/client'
import { joinLobby } from '../shared/api/lobbies'
import { Button, Dialog, Field, Input, Stack, Text, Toast } from '../ui'

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
  const [remoteNotice, setRemoteNotice] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lobbyOpen, setLobbyOpen] = useState(false)
  const [lobbyCode, setLobbyCode] = useState('')
  const [lobbyError, setLobbyError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
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
    setRemoteNotice(null)
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

  const handleRemoteSave = useCallback(
    (message: { sheetVersion: number }) => {
      if (!character || message.sheetVersion <= character.sheet_version) {
        return
      }
      setRemoteNotice(message.sheetVersion)
    },
    [character],
  )

  async function refreshFromServer() {
    if (!character) {
      return
    }
    setRefreshing(true)
    setError(null)
    try {
      const fresh = await getCharacter(character.id)
      setCharacter(fresh)
      setRemoteNotice(null)
      setToast('Лист обновлён с сервера')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось обновить лист')
    } finally {
      setRefreshing(false)
    }
  }

  function closeLobbyDialog() {
    if (joining) return
    setLobbyOpen(false)
    setLobbyCode('')
    setLobbyError(null)
  }

  async function joinWithCode() {
    if (!character || !lobbyCode.trim()) return
    setJoining(true)
    setLobbyError(null)
    try {
      const lobby = await joinLobby(lobbyCode.trim(), character.id)
      setLobbyCode('')
      setLobbyOpen(false)
      navigate(`/lobbies/${lobby.id}`, {
        state: { toast: `${character.name} добавлен в лобби` },
      })
    } catch (err) {
      setLobbyError(err instanceof ApiRequestError ? err.message : 'Не удалось войти в лобби')
    } finally {
      setJoining(false)
    }
  }

  return (
    <main className="page page--app">
      <Stack gap={16}>
        <div className="sheet-topbar">
          <Link className="back-link" to="/characters">
            ← К списку персонажей
          </Link>
          {character ? (
            <div className="sheet-topbar__actions">
              <Link className="back-link" to={`/characters/${character.id}/classic`}>
                Классический лист 2014
              </Link>
              <Button variant="ghost" onClick={() => setLobbyOpen(true)}>
                В лобби
              </Button>
            </div>
          ) : null}
        </div>

        {loading ? <Text tone="muted">Открываем лист...</Text> : null}
        {error ? <Text tone="danger">{error}</Text> : null}

        {remoteNotice != null ? (
          <div className="sheet-banner" role="status">
            <Text>
              Лист сохранён в другой вкладке (v{remoteNotice}). Локальные несохранённые правки могут
              устареть.
            </Text>
            <div className="sheet-banner__actions">
              <Button variant="ghost" onClick={() => setRemoteNotice(null)} disabled={refreshing}>
                Позже
              </Button>
              <Button onClick={() => void refreshFromServer()} disabled={refreshing}>
                {refreshing ? 'Обновляем…' : 'Обновить'}
              </Button>
            </div>
          </div>
        ) : null}

        {character ? (
          <MinimalSheetEditor
            key={character.id}
            character={character}
            onSaved={(item) => {
              setCharacter(item)
              setRemoteNotice(null)
            }}
            onToast={setToast}
            onRemoteSave={handleRemoteSave}
          />
        ) : null}
      </Stack>

      <Dialog
        open={lobbyOpen}
        title="Вступить в лобби кодом"
        primaryLabel={joining ? 'Добавляем…' : 'Добавить этого персонажа'}
        secondaryLabel="Отмена"
        onPrimary={() => void joinWithCode()}
        onSecondary={closeLobbyDialog}
        busy={joining}
        primaryDisabled={!lobbyCode.trim()}
      >
        <Stack gap={10}>
          <Field label="Код от мастера" hint="Или отсканируйте QR → /join/КОД">
            <Input
              value={lobbyCode}
              onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              autoComplete="off"
            />
          </Field>
          {lobbyError ? <Text tone="danger">{lobbyError}</Text> : null}
        </Stack>
      </Dialog>

      <Toast message={toast} onClose={closeToast} />
    </main>
  )
}
