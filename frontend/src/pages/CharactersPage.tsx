import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CharacterList,
  CreateCharacterButton,
  type CreateCharacterRequest,
} from '../features/characters'
import { CharacterTagsDialog } from '../features/characters/CharacterTagsDialog'
import {
  CARD_SIZE_OPTIONS,
  characterMatchesTagFilter,
  loadCharacterListPrefs,
  saveCharacterListPrefs,
  type CharacterListPrefs,
} from '../features/characters/characterListPrefs'
import { getMe, type User } from '../shared/api/auth'
import { ApiRequestError, getAccessToken } from '../shared/api/client'
import { listCharacters, type CharacterSummary } from '../shared/api/characters'
import { AppearanceSurvey } from '../features/cabinet/AppearanceSurvey'
import { readSurveyFlag, writeSurveyFlag } from '../features/cabinet/appearanceSurveyFlag'
import { AppShell } from '../features/shell/AppShell'
import { GuestInvite } from '../features/shell/GuestInvite'
import {
  HelpDrawer,
  WelcomeDialog,
  useOnboardingState,
} from '../features/onboarding'
import { prefetchSheetRoutes } from '../shared/lazy/routes'
import { Button, Stack, Text, Toast } from '../ui'
import { forceReleaseBodyScrollLock } from '../ui/bodyScrollLock'

function listSubtitle(user: User | null, shown: number, total: number): string {
  const who = user?.display_name || user?.login || user?.email
  const count =
    shown === total ? `${total} в списке` : `${shown} из ${total}`
  if (who) {
    return `${who} · ${count}`
  }
  return count
}

export function CharactersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [authed, setAuthed] = useState(() => Boolean(getAccessToken()))
  const [loading, setLoading] = useState(() => Boolean(getAccessToken()))
  const [surveyClosed, setSurveyClosed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [prefs, setPrefs] = useState<CharacterListPrefs>(() => loadCharacterListPrefs())
  const [filterTagIds, setFilterTagIds] = useState<string[]>([])
  const [tagsOpen, setTagsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  /** Soft-close welcome (backdrop/Escape) without writing skip — show again next visit. */
  const [welcomeSessionHide, setWelcomeSessionHide] = useState(false)
  const onboarding = useOnboardingState(user?.id ?? null)

  useEffect(() => {
    setWelcomeSessionHide(false)
  }, [location.key])

  const closeToast = useCallback(() => setToast(null), [])

  const updatePrefs = useCallback((next: CharacterListPrefs) => {
    setPrefs(next)
    saveCharacterListPrefs(next)
  }, [])

  const reorderCharacters = useCallback((order: string[]) => {
    setPrefs((prev) => {
      const next = { ...prev, order }
      saveCharacterListPrefs(next)
      return next
    })
  }, [])

  useEffect(() => {
    forceReleaseBodyScrollLock()
  }, [])

  useEffect(() => {
    if (!getAccessToken()) {
      setAuthed(false)
      setUser(null)
      setCharacters([])
      setLoading(false)
      return
    }
    let active = true
    setAuthed(true)
    setLoading(true)
    setError(null)

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
        prefetchSheetRoutes()
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiRequestError && err.status === 401) {
          setAuthed(false)
          setUser(null)
          setCharacters([])
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
  }, [reloadKey, authed])

  const visibleCharacters = useMemo(
    () =>
      characters.filter((character) =>
        characterMatchesTagFilter(prefs, character.id, filterTagIds),
      ),
    [characters, prefs, filterTagIds],
  )

  function toggleFilterTag(tagId: string) {
    setFilterTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    )
  }

  function handleCreate(request: CreateCharacterRequest) {
    if (request.edition === '2024') {
      navigate('/characters/create?edition=2024')
      return
    }
    navigate('/characters/create')
  }

  const titleCount = loading ? '' : ` (${characters.length})`
  const surveyFlag = user ? readSurveyFlag(user.id) : 'done'
  const showSurvey = Boolean(user) && !loading && surveyFlag === null && !surveyClosed && !helpOpen

  if (!authed) {
    return (
      <AppShell
        section="chars"
        title="Мои персонажи"
        subtitle="Войдите, чтобы открыть зал летописей."
        onAuthed={() => setAuthed(true)}
      >
        <GuestInvite
          title="Зал летописей"
          lead="Твои герои ждут в зале летописей. Имена ещё не названы у порога — войдите, и страницы откроются."
        />
      </AppShell>
    )
  }

  return (
    <AppShell
      section="chars"
      title={`Мои персонажи${titleCount}`}
      subtitle={loading ? 'Загрузка...' : listSubtitle(user, visibleCharacters.length, characters.length)}
      user={user}
      onAuthed={(next) => {
        setUser(next)
        setAuthed(true)
      }}
      onHelp={() => {
        onboarding.markHelpOpened()
        setHelpOpen(true)
      }}
    >
      <section className="toolbar character-list-toolbar">
        <div className="character-list-toolbar__sizes" role="group" aria-label="Размер карточек">
          {CARD_SIZE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`sheet-chip${prefs.cardSize === option.id ? ' is-on' : ''}`}
              aria-pressed={prefs.cardSize === option.id}
              onClick={() => updatePrefs({ ...prefs, cardSize: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Button type="button" variant="secondary" onClick={() => setTagsOpen(true)}>
          Теги{prefs.tags.length ? ` (${prefs.tags.length})` : ''}
        </Button>
      </section>

      {prefs.tags.length ? (
        <div className="character-list-filters" aria-label="Фильтр по тегам">
          {prefs.tags.map((tag) => {
            const on = filterTagIds.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                className={`character-list-tag${on ? ' is-on' : ''}`}
                style={{ ['--tag-color' as string]: tag.color }}
                aria-pressed={on}
                onClick={() => toggleFilterTag(tag.id)}
              >
                {tag.name}
              </button>
            )
          })}
          {filterTagIds.length ? (
            <Button type="button" variant="ghost" onClick={() => setFilterTagIds([])}>
              Сбросить
            </Button>
          ) : null}
        </div>
      ) : null}

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
          characters={visibleCharacters}
          prefs={prefs}
          cardSize={prefs.cardSize}
          listEmpty={characters.length === 0}
          emptyAction={
            filterTagIds.length ? (
              <Button type="button" variant="secondary" onClick={() => setFilterTagIds([])}>
                Сбросить фильтр тегов
              </Button>
            ) : undefined
          }
          onReorder={filterTagIds.length ? undefined : reorderCharacters}
          onDeleted={(id) => {
            setCharacters((prev) => prev.filter((item) => item.id !== id))
            const assignments = { ...prefs.assignments }
            delete assignments[id]
            updatePrefs({
              ...prefs,
              assignments,
              order: (prefs.order ?? []).filter((item) => item !== id),
            })
            setToast('Персонаж удалён')
          }}
        />
      )}

      <CharacterTagsDialog
        open={tagsOpen}
        characters={characters}
        prefs={prefs}
        onClose={() => setTagsOpen(false)}
        onChange={updatePrefs}
      />
      {user ? (
        <AppearanceSurvey
          open={showSurvey}
          mode="first"
          user={user}
          onDismiss={() => {
            writeSurveyFlag(user.id, 'deferred')
            setSurveyClosed(true)
          }}
          onSaved={(next) => {
            writeSurveyFlag(next.id, 'done')
            setUser(next)
            setSurveyClosed(true)
          }}
        />
      ) : null}
      <WelcomeDialog
        open={Boolean(user) && !loading && onboarding.showWelcome && !welcomeSessionHide && !showSurvey}
        onChoose={onboarding.completeWelcome}
        onDismiss={() => setWelcomeSessionHide(true)}
      />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onRestartTips={() => {
          onboarding.restartTips()
          onboarding.markHelpOpened()
        }}
      />
      <Toast message={toast} onClose={closeToast} />
      <CreateCharacterButton fab onCreate={handleCreate} />
    </AppShell>
  )
}
