import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppHeader,
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
import {
  createCharacter,
  listCharacters,
  type CharacterSummary,
} from '../shared/api/characters'
import { ApiRequestError } from '../shared/api/client'
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
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [prefs, setPrefs] = useState<CharacterListPrefs>(() => loadCharacterListPrefs())
  const [filterTagIds, setFilterTagIds] = useState<string[]>([])
  const [tagsOpen, setTagsOpen] = useState(false)

  const closeToast = useCallback(() => setToast(null), [])

  const updatePrefs = useCallback((next: CharacterListPrefs) => {
    setPrefs(next)
    saveCharacterListPrefs(next)
  }, [])

  useEffect(() => {
    forceReleaseBodyScrollLock()
  }, [])

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
        // Warm the ~500KB sheet chunk while the user still looks at cards.
        prefetchSheetRoutes()
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

  const titleCount = loading ? '' : ` (${characters.length})`

  return (
    <main className="page page--app">
      <Stack gap={20}>
        <AppHeader
          title={`Мои персонажи${titleCount}`}
          subtitle={
            loading
              ? 'Загрузка...'
              : listSubtitle(user, visibleCharacters.length, characters.length)
          }
          user={user}
          onOfficialSite={() => setToast('Официальный сайт скоро появится')}
        />

        <section className="toolbar character-list-toolbar">
          <CreateCharacterButton pending={creating} onCreate={handleCreate} />

          <div
            className="character-list-toolbar__sizes"
            role="group"
            aria-label="Размер карточек"
          >
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

          <Button
            type="button"
            variant="secondary"
            onClick={() => setTagsOpen(true)}
          >
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
              ) : (
                <CreateCharacterButton pending={creating} onCreate={handleCreate} />
              )
            }
            onDeleted={(id) => {
              setCharacters((prev) => prev.filter((item) => item.id !== id))
              const assignments = { ...prefs.assignments }
              delete assignments[id]
              updatePrefs({ ...prefs, assignments })
              setToast('Персонаж удалён')
            }}
          />
        )}
      </Stack>

      <CharacterTagsDialog
        open={tagsOpen}
        characters={characters}
        prefs={prefs}
        onClose={() => setTagsOpen(false)}
        onChange={updatePrefs}
      />
      <Toast message={toast} onClose={closeToast} />
    </main>
  )
}
