import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../features/shell/AppShell'
import { GuestInvite } from '../features/shell/GuestInvite'
import { CARD_SIZE_OPTIONS, type CharacterCardSize } from '../features/characters/characterListPrefs'
import { loadLobbyCardSize, saveLobbyCardSize } from '../features/lobby/lobbyListPrefs'
import { ApiRequestError, getAccessToken } from '../shared/api/client'
import {
  createLobby,
  listLobbies,
  type LobbyRulesEdition,
  type LobbySummary,
} from '../shared/api/lobbies'
import { Button, EmptyState, Field, Input, Panel, Select, Text } from '../ui'
import { RULES_EDITION_2024_OPEN } from '../shared/dnd/rulesEdition2024'

function sortLobbiesLiveFirst(items: LobbySummary[]): LobbySummary[] {
  return [...items].sort((a, b) => {
    const aLive = a.has_open_session ? 1 : 0
    const bLive = b.has_open_session ? 1 : 0
    if (aLive !== bLive) return bLive - aLive
    return a.name.localeCompare(b.name, 'ru')
  })
}

function lobbyRole(lobby: LobbySummary): { label: string; kind: string } {
  if (lobby.is_owner) return { label: 'Мастер', kind: 'master' }
  if (lobby.is_comaster) return { label: 'Сомастер', kind: 'comaster' }
  if (lobby.is_observer) return { label: 'Наблюдатель', kind: 'observer' }
  return { label: 'Участник', kind: 'player' }
}

function editionText(lobby: LobbySummary): string {
  return lobby.rules_edition === '2024' ? 'Редакция 2024' : 'Редакция 2014'
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function LobbiesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<LobbySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [rulesEdition, setRulesEdition] = useState<LobbyRulesEdition>('2014')
  const [cardSize, setCardSize] = useState<CharacterCardSize>(() => loadLobbyCardSize())
  const [error, setError] = useState<string | null>(null)
  const [authed, setAuthed] = useState(() => Boolean(getAccessToken()))

  useEffect(() => {
    if (!getAccessToken()) {
      setAuthed(false)
      setItems([])
      setLoading(false)
      return
    }
    let active = true
    setAuthed(true)
    setLoading(true)
    listLobbies()
      .then((list) => {
        if (active) setItems(list)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiRequestError && err.status === 401) {
          setAuthed(false)
          setItems([])
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
  }, [authed])

  const sortedItems = useMemo(() => sortLobbiesLiveFirst(items), [items])

  function chooseSize(next: CharacterCardSize) {
    setCardSize(next)
    saveLobbyCardSize(next)
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const edition = RULES_EDITION_2024_OPEN ? rulesEdition : '2014'
      const created = await createLobby(name.trim() || undefined, edition)
      navigate(`/lobbies/${created.id}`, { state: { toast: 'Лобби создано' } })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось создать лобби')
    } finally {
      setCreating(false)
    }
  }

  function onJoin(e: FormEvent) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) {
      setError('Введите код от мастера (минимум 4 символа).')
      return
    }
    navigate(`/join?code=${encodeURIComponent(code)}`)
  }

  if (!authed) {
    return (
      <AppShell
        section="lobby"
        title="Лобби"
        subtitle="Войдите, чтобы занять место за столом."
        onAuthed={() => setAuthed(true)}
      >
        <GuestInvite
          title="Стол ещё пуст"
          lead="За столом ещё пусто. Мастер уже ждёт, но без вашего имени места не занять. Войдите или запишитесь в книгу."
          extra={{ to: '/join', label: 'Ввести код' }}
        />
      </AppShell>
    )
  }

  return (
    <AppShell
      section="lobby"
      title="Лобби"
      subtitle="Место игры: код и QR для игроков, внутри — сеттинг и сессии"
      onAuthed={() => setAuthed(true)}
    >
      <div className="chars-toolbar" role="group" aria-label="Размер карточек">
        {CARD_SIZE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`sheet-chip${cardSize === option.id ? ' is-on' : ''}`}
            aria-pressed={cardSize === option.id}
            onClick={() => chooseSize(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {createOpen ? (
        <Panel title="Создать лобби">
          <form className="inline-form lobbies-create-form" onSubmit={onCreate}>
            <Field label="Название">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Стол пятницы, кампания…"
                autoFocus
              />
            </Field>
            {RULES_EDITION_2024_OPEN ? (
              <Field
                label="Редакция"
                hint="Задаётся при создании и больше не меняется. За стол садятся только персонажи этой редакции."
              >
                <Select
                  value={rulesEdition}
                  onChange={(e) =>
                    setRulesEdition(
                      (e.target.value === '2024' ? '2024' : '2014') as LobbyRulesEdition,
                    )
                  }
                  data-testid="lobby-create-rules-edition"
                  aria-label="Редакция лобби"
                >
                  <option value="2014">D&D 2014</option>
                  <option value="2024">D&D 2024</option>
                </Select>
              </Field>
            ) : null}
            <Button type="submit" size="md" disabled={creating} className="lobbies-create-form__submit">
              {creating ? 'Создаём…' : 'Создать лобби'}
            </Button>
          </form>
          <Text tone="muted">
            После создания вы — мастер этого лобби. Код и QR появятся на странице лобби.
          </Text>
        </Panel>
      ) : null}

      {error ? <Text tone="danger">{error}</Text> : null}

      {loading ? (
        <Text tone="muted">Загружаем лобби…</Text>
      ) : sortedItems.length === 0 ? (
        <EmptyState
          title="Пока нет лобби"
          description="Нажмите «+» или введите код от мастера."
        />
      ) : (
        <div className={`lobby-grid lobby-grid--${cardSize}`}>
          {sortedItems.map((lobby) => {
            const role = lobbyRole(lobby)
            const showMeta = cardSize !== 'compact'
            return (
              <article
                key={lobby.id}
                className={lobby.has_open_session ? 'lobby-tile is-live' : 'lobby-tile'}
              >
                <div className="character-card__avatar lobby-tile__avatar" aria-hidden="true">
                  {lobby.name.slice(0, 1).toUpperCase() || '?'}
                </div>
                <div className="lobby-tile__body">
                  <h2 className="character-card__name">{lobby.name}</h2>
                  {showMeta ? (
                    <p className="lobby-tile__meta">
                      персонажей: {lobby.member_count}
                      {lobby.invite_code ? (
                        <>
                          {' '}
                          · код <span className="lobby-tile__code">{lobby.invite_code}</span>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  <div className="lobby-tile__chips">
                    <span className={`lobby-chip lobby-chip--${role.kind}`}>{role.label}</span>
                    <span className="lobby-chip lobby-chip--edition">{editionText(lobby)}</span>
                    {lobby.has_open_session ? (
                      <span className="lobby-chip lobby-chip--live">Идёт игра</span>
                    ) : null}
                  </div>
                </div>
                <div className="lobby-tile__actions">
                  {lobby.has_open_session && lobby.open_session_id ? (
                    <Link className="ui-button ui-button--primary" to={`/sessions/${lobby.open_session_id}`}>
                      За стол
                    </Link>
                  ) : null}
                  <Link className="ui-button ui-button--secondary" to={`/lobbies/${lobby.id}`}>
                    Открыть
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Panel title="Войти по коду" className="lobby-join">
        <form onSubmit={onJoin}>
          <Text tone="muted">Есть код от мастера? Введите его, чтобы присоединиться к столу.</Text>
          <div className="lobby-join__row">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Код"
              aria-label="Код лобби"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <Button type="submit">Войти</Button>
          </div>
        </form>
      </Panel>

      <button
        type="button"
        className="fab-create"
        aria-expanded={createOpen}
        aria-label={createOpen ? 'Скрыть форму' : 'Создать'}
        onClick={() => setCreateOpen((open) => !open)}
      >
        <PlusIcon />
      </button>
    </AppShell>
  )
}
