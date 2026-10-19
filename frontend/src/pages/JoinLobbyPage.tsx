import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { listCharacters, type CharacterSummary } from '../shared/api/characters'
import { ApiRequestError, getAccessToken } from '../shared/api/client'
import { joinLobby } from '../shared/api/lobbies'
import { AppLegalFooter, openProductSite } from '../shared/brand/creed20'
import { Button, EmptyState, Field, Input, Panel, Stack, Text } from '../ui'

function characterMeta(c: CharacterSummary): string {
  const bits = [c.race_name, c.class_name, c.level != null ? `ур. ${c.level}` : null].filter(
    Boolean,
  )
  return bits.join(' · ') || 'Без расы/класса'
}

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

  const codeReady = code.trim().length >= 4
  const selected = useMemo(
    () => characters.find((c) => c.id === characterId) ?? null,
    [characters, characterId],
  )

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
    if (!codeReady) {
      setError('Введите код лобби')
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
          onOfficialSite={openProductSite}
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
            <form className="stack-form join-flow" onSubmit={onSubmit}>
              <Field label="Код лобби">
                <Input
                  className="join-flow__code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  required
                />
              </Field>

              {codeReady ? (
                <div className="join-flow__preview" aria-live="polite">
                  <Text as="h3" className="join-flow__preview-title">
                    Стол по коду {code.trim()}
                  </Text>
                  <Text tone="muted">
                    Выберите персонажа и подтвердите вход — мастер увидит его в лобби.
                  </Text>
                </div>
              ) : (
                <Text tone="muted">Введите код от мастера (минимум 4 символа).</Text>
              )}

              {/* Desk: native select keeps current density */}
              <div className="join-flow__select-field">
                <Field label="Какого персонажа добавить">
                  <select
                    className="ui-input join-flow__select"
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
              </div>

              {/* Phone: tappable character cards */}
              <fieldset className="join-flow__cards" disabled={!codeReady}>
                <legend className="join-flow__cards-legend">Какого персонажа добавить</legend>
                <div className="join-flow__card-list" role="listbox" aria-label="Персонажи">
                  {characters.map((c) => {
                    const active = c.id === characterId
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`join-char-card${active ? ' is-selected' : ''}`}
                        onClick={() => setCharacterId(c.id)}
                      >
                        <span className="join-char-card__avatar" aria-hidden="true">
                          {(c.name || '?').slice(0, 1).toUpperCase()}
                        </span>
                        <span className="join-char-card__body">
                          <span className="join-char-card__name">{c.name}</span>
                          <span className="join-char-card__meta">{characterMeta(c)}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {selected && codeReady ? (
                <Text tone="muted" className="join-flow__picked">
                  К столу сядет: <strong>{selected.name}</strong>
                </Text>
              ) : null}

              {error ? <Text tone="danger">{error}</Text> : null}

              <div className="join-thumb-cta">
                <Button type="submit" disabled={busy || !codeReady || !characterId}>
                  {busy ? 'Входим…' : 'Сесть за стол'}
                </Button>
              </div>
            </form>
          )}
        </Panel>

        <AppLegalFooter />
      </Stack>
    </main>
  )
}
