import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { MinimalSheetEditor } from '../features/characters/MinimalSheetEditor'
import {
  CharacterReadyDialog,
  HelpDrawer,
  SheetTour,
  useOnboardingState,
} from '../features/onboarding'
import { getMe } from '../shared/api/auth'
import { getCharacter, type CharacterDetail } from '../shared/api/characters'
import { ApiRequestError } from '../shared/api/client'
import { joinLobby } from '../shared/api/lobbies'
import { Button, Dialog, Field, Input, Stack, Text, Toast } from '../ui'
import { forceReleaseBodyScrollLock } from '../ui/bodyScrollLock'

type LocationState = {
  toast?: string
  /** Fresh create: nudge background → class → race path on the sheet. */
  createGuide?: 'background-first' | 'class-first'
  /** Create at level N (1–20); wizard covers picks up to N. */
  startingLevel?: number
  /** After create pipeline Готово — show ready bridge / tour. */
  onboardingReady?: boolean
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
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement | null>(null)
  const initialState = location.state as LocationState | null
  const [toast, setToast] = useState<string | null>(initialState?.toast ?? null)
  const [createGuide, setCreateGuide] = useState<'background-first' | 'class-first' | null>(
    initialState?.createGuide ?? null,
  )
  const [startingLevel, setStartingLevel] = useState<number>(
    initialState?.startingLevel && initialState.startingLevel > 1
      ? initialState.startingLevel
      : 1,
  )
  const [userId, setUserId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [tourArmed, setTourArmed] = useState(false)
  const onboarding = useOnboardingState(userId)
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    getMe()
      .then((me) => {
        if (active) setUserId(me.id)
      })
      .catch(() => {
        if (active) setUserId(null)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const state = location.state as LocationState | null
    if (state?.toast || state?.createGuide || state?.startingLevel || state?.onboardingReady) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (onboarding.showSheetTour && !onboarding.showReadyBridge) {
      setTourArmed(true)
    }
  }, [onboarding.showSheetTour, onboarding.showReadyBridge])

  // Dialog pads lock body scroll; clear any leaked lock when entering the sheet.
  useEffect(() => {
    forceReleaseBodyScrollLock()
    return () => {
      forceReleaseBodyScrollLock()
    }
  }, [characterId])

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

  useEffect(() => {
    if (!moreOpen) return
    function onDoc(event: MouseEvent) {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

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
      <Stack gap={4} className="sheet-play-stack">
        <div className="sheet-topbar sheet-topbar--play">
          <Link className="back-link" to="/characters">
            ← К списку
          </Link>
          {character ? (
            <div className="sheet-topbar__actions">
              <Button
                type="button"
                variant="ghost"
                className="sheet-topbar__help"
                data-onboarding="help"
                onClick={() => {
                  onboarding.markHelpOpened()
                  setHelpOpen(true)
                }}
              >
                Справка
              </Button>
              <div className="sheet-topbar__desk-only">
                <button
                  type="button"
                  className="back-link"
                  data-onboarding="classic"
                  onClick={() => navigate(`/characters/${character.id}/classic`)}
                >
                  <span className="sheet-topbar__classic-full">Классический лист 2014</span>
                  <span className="sheet-topbar__classic-short">Классический</span>
                </button>
                <Button variant="ghost" onClick={() => setLobbyOpen(true)}>
                  В лобби
                </Button>
              </div>
              <div className="sheet-topbar__more" ref={moreRef}>
                <button
                  type="button"
                  className="sheet-topbar__more-btn"
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  aria-label="Ещё действия"
                  onClick={() => setMoreOpen((open) => !open)}
                >
                  ⋯
                </button>
                {moreOpen ? (
                  <div className="sheet-topbar__more-pop" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        const classicPath = `/characters/${character.id}/classic`
                        setMoreOpen(false)
                        navigate(classicPath)
                      }}
                    >
                      Классический лист 2014
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMoreOpen(false)
                        setLobbyOpen(true)
                      }}
                    >
                      В лобби
                    </button>
                  </div>
                ) : null}
              </div>
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
            createGuide={createGuide}
            startingLevel={startingLevel}
            showOnboardingChecklist={
              onboarding.state.segment === 'dnd_new' ||
              onboarding.state.segment === 'product_new' ||
              tourArmed
            }
            showValueTips={onboarding.state.segment === 'dnd_new'}
            onCreateGuideConsumed={() => {
              setCreateGuide(null)
              setStartingLevel(1)
            }}
            onSaved={(item) => {
              setCharacter(item)
              setRemoteNotice(null)
            }}
            onToast={setToast}
            onRemoteSave={handleRemoteSave}
          />
        ) : null}
      </Stack>

      <CharacterReadyDialog
        open={onboarding.showReadyBridge}
        onOpenWithTour={() => {
          onboarding.dismissReadyBridge({ startTour: true })
          setTourArmed(true)
        }}
        onOpenSkipTour={() => {
          onboarding.dismissReadyBridge({ startTour: false })
          onboarding.skipSheetTour()
          setTourArmed(false)
        }}
      />
      <SheetTour
        open={Boolean(character) && !loading && tourArmed && !onboarding.showReadyBridge}
        onComplete={() => {
          onboarding.completeSheetTour()
          setTourArmed(false)
        }}
        onSkip={() => {
          onboarding.skipSheetTour()
          setTourArmed(false)
        }}
      />
      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />

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
