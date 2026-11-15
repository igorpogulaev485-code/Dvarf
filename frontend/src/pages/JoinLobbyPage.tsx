import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../features/characters'
import { parseCharacterInOtherLobby } from '../features/lobby/joinConflict'
import { parseStartRulesMismatch } from '../features/lobby/joinStartMismatch'
import {
  normalizeStartRules,
  summarizeStartRules,
} from '../features/lobby/campaignRules'
import { getMe } from '../shared/api/auth'
import { listCharacters, type CharacterSummary } from '../shared/api/characters'
import { ApiRequestError, getAccessToken } from '../shared/api/client'
import { JoinIntroCard, useOnboardingState } from '../features/onboarding'
import {
  createHeroForLobbyHref,
  getLobbyInviteMeta,
  joinLobby,
  type CharacterInOtherLobbyData,
  type InviteMeta,
  type JoinLobbyAction,
} from '../shared/api/lobbies'
import { AppLegalFooter, openProductSite } from '../shared/brand/creed20'
import { Button, EmptyState, Field, Input, Panel, Select, Stack, Text } from '../ui'


function characterMeta(c: CharacterSummary): string {
  const bits = [
    c.race_name,
    // FIX-01: class_name часто уже «Воин 1» — не дублировать «ур. N»
    c.class_name
      ? c.class_name
      : c.level != null
        ? `ур. ${c.level}`
        : null,
    c.hp_max != null
      ? `Хиты ${c.hp_current ?? c.hp_max}/${c.hp_max}`
      : null,
  ].filter(Boolean)
  return bits.join(' · ') || 'Персонаж'
}

export function JoinLobbyPage() {
  const { code: routeCode = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialCode = (routeCode || searchParams.get('code') || '').toUpperCase()
  const [code, setCode] = useState(initialCode)
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [characterId, setCharacterId] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const onboarding = useOnboardingState(userId)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lobbyName, setLobbyName] = useState<string | null>(null)
  const [inviteMeta, setInviteMeta] = useState<InviteMeta | null>(null)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<CharacterInOtherLobbyData | null>(null)
  const [startMismatch, setStartMismatch] = useState<string[] | null>(null)

  const codeReady = code.trim().length >= 4
  const lobbyEdition = (inviteMeta?.rules_edition || '2014').trim() || '2014'

  const seatableCharacters = useMemo(() => {
    return characters.filter((c) => (c.rules_edition || '2014') === lobbyEdition)
  }, [characters, lobbyEdition])

  const selected = useMemo(
    () => seatableCharacters.find((c) => c.id === characterId) ?? null,
    [seatableCharacters, characterId],
  )

  useEffect(() => {
    if (seatableCharacters.length === 0) {
      if (characterId) setCharacterId('')
      return
    }
    if (!seatableCharacters.some((c) => c.id === characterId)) {
      setCharacterId(seatableCharacters[0].id)
    }
  }, [seatableCharacters, characterId])

  const startLevel = useMemo(() => {
    if (!inviteMeta) return null
    const start = inviteMeta.start ?? inviteMeta.campaign_rules_start
    return normalizeStartRules(start).level
  }, [inviteMeta])

  /** LOBBY-FIX E: явный предупреждающий текст до «Сесть за стол», лист не трогаем. */
  const levelMismatch =
    selected != null &&
    startLevel != null &&
    Number.isFinite(selected.level) &&
    selected.level !== startLevel

  useEffect(() => {
    if (!getAccessToken()) {
      const next = routeCode ? `/join/${routeCode}` : `/join?code=${encodeURIComponent(code)}`
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true })
      return
    }
    let active = true
    void getMe()
      .then((me) => {
        if (active) setUserId(me.id)
      })
      .catch(() => {
        if (active) setUserId(null)
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
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить персонажей')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [code, navigate, routeCode])

  useEffect(() => {
    if (!getAccessToken() || !codeReady) {
      setLobbyName(null)
      setInviteMeta(null)
      setMetaError(null)
      return
    }
    let active = true
    const trimmed = code.trim()
    getLobbyInviteMeta(trimmed)
      .then((meta) => {
        if (!active) return
        setLobbyName(meta.name)
        setInviteMeta(meta)
        setMetaError(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setLobbyName(null)
        setInviteMeta(null)
        if (err instanceof ApiRequestError && err.status === 404) {
          setMetaError('Код лобби не найден')
          return
        }
        setMetaError(err instanceof ApiRequestError ? err.message : 'Не удалось проверить код')
      })
    return () => {
      active = false
    }
  }, [code, codeReady])

  const startSummary = useMemo(() => {
    if (!inviteMeta) return []
    const start = inviteMeta.start ?? inviteMeta.campaign_rules_start
    return summarizeStartRules(normalizeStartRules(start))
  }, [inviteMeta])

  const createHeroHref = useMemo(() => {
    if (!inviteMeta?.lobby_id) return null
    return createHeroForLobbyHref({
      lobbyId: inviteMeta.lobby_id,
      code: code.trim() || inviteMeta.code,
    })
  }, [inviteMeta, code])

  async function doJoin(action: JoinLobbyAction, acknowledge = false) {
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
      const result = await joinLobby(code.trim(), characterId, action, {
        acknowledgeStartMismatch: acknowledge,
      })
      setConflict(null)
      setStartMismatch(null)
      if (action === 'copy' && result.cloned_character_id) {
        const lobbyId = result.lobby.id
        const href = createHeroForLobbyHref({
          lobbyId,
          code: code.trim(),
          characterId: result.cloned_character_id,
        })
        navigate(href)
        return
      }
      navigate(`/lobbies/${result.lobby.id}`, {
        state: { toast: 'Персонаж добавлен в лобби' },
      })
    } catch (err) {
      const parsed = parseCharacterInOtherLobby(err)
      if (parsed && action === 'join') {
        setConflict(parsed)
        setError(null)
        return
      }
      const mismatch = parseStartRulesMismatch(err)
      if (mismatch && (action === 'join' || action === 'transfer')) {
        setStartMismatch(mismatch.mismatches)
        setError(null)
        return
      }
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось войти в лобби')
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await doJoin('join')
  }

  async function onJoinAsObserver() {
    if (!codeReady) {
      setError('Введите код лобби')
      return
    }
    setBusy(true)
    setError(null)
    setConflict(null)
    try {
      const result = await joinLobby(code.trim(), null)
      navigate(`/lobbies/${result.lobby.id}`, {
        state: { toast: 'Вы вошли как наблюдатель' },
      })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось войти наблюдателем')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page page--app">
      <Stack gap={20}>
        <AppHeader
          title="Вход в лобби"
          subtitle="Код или QR от мастера: выберите персонажа или войдите наблюдателем"
          onOfficialSite={openProductSite}
          lobbyMobileShell
        />

        <Panel title="Присоединиться">
          {loading ? (
            <Text tone="muted">Загрузка…</Text>
          ) : (
            <div data-onboarding="lobby-join">
            <Stack gap={16}>
              <Field label="Код лобби">
                <Input
                  className="join-flow__code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase())
                    setConflict(null)
                  }}
                  placeholder="ABC123"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  required
                />
              </Field>

              {characters.length === 0 ? (
                <EmptyState
                  title="Нет персонажей"
                  description="Можно войти наблюдателем без персонажа или сначала создать героя."
                  action={
                    <Link className="ui-button" to="/characters">
                      К персонажам
                    </Link>
                  }
                />
              ) : (
                <form className="stack-form join-flow" onSubmit={onSubmit}>
                  {codeReady ? (
                    <div className="join-flow__preview" aria-live="polite">
                      <Text as="h3" className="join-flow__preview-title">
                        {lobbyName
                          ? `Вход в лобби «${lobbyName}»`
                          : metaError
                            ? metaError
                            : `Проверяем код ${code.trim()}…`}
                      </Text>
                      <Text tone="muted">
                        Выберите персонажа и подтвердите вход — мастер увидит его в лобби.
                      </Text>
                      {startSummary.length ? (
                        <ul className="campaign-rules-summary">
                          {startSummary.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      ) : null}
                      {createHeroHref ? (
                        <Link className="ui-button ui-button--secondary" to={createHeroHref}>
                          Создать героя
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <Text tone="muted">Введите код от мастера (минимум 4 символа).</Text>
                  )}

                  <div className="join-flow__select-field">
                    <Field label="Какого персонажа добавить">
                      <Select
                        className="join-flow__select"
                        value={characterId}
                        onChange={(e) => {
                          setCharacterId(e.target.value)
                          setConflict(null)
                          setStartMismatch(null)
                        }}
                        required
                      >
                        {seatableCharacters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} · {characterMeta(c)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    {inviteMeta && seatableCharacters.length === 0 ? (
                      <Text tone="muted">
                        Нет персонажей редакции {lobbyEdition} для этого стола.
                      </Text>
                    ) : null}
                  </div>

                  <fieldset className="join-flow__cards" disabled={!codeReady}>
                    <legend className="join-flow__cards-legend">Какого персонажа добавить</legend>
                    <div className="join-flow__card-list" role="listbox" aria-label="Персонажи">
                      {seatableCharacters.map((c) => {
                        const active = c.id === characterId
                        return (
                          <button
                            key={c.id}
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={`join-char-card${active ? ' is-selected' : ''}`}
                            onClick={() => {
                              setCharacterId(c.id)
                              setConflict(null)
                              setStartMismatch(null)
                            }}
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

                  {levelMismatch && codeReady && !startMismatch ? (
                    <Panel className="join-flow__level-warn">
                      <Text tone="warn" role="status">
                        {`У героя ${selected!.level}\u00a0уровень, а лобби стартует с\u00a0${startLevel}\u00a0уровня. Сесть можно — мастер увидит отметку.`}
                      </Text>
                    </Panel>
                  ) : null}

                  {startMismatch ? (
                    <Stack gap={10} className="join-flow__conflict">
                      <Text>Не по правилам старта этого лобби:</Text>
                      <ul className="campaign-rules-summary">
                        {startMismatch.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                      <div
                        className="join-thumb-cta"
                        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                      >
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() => void doJoin('join', true)}
                        >
                          Всё равно войти
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setStartMismatch(null)}
                        >
                          Отмена
                        </Button>
                      </div>
                    </Stack>
                  ) : conflict ? (
                    <Stack gap={10} className="join-flow__conflict">
                      <Text>
                        Этот персонаж уже в лобби «{conflict.other_lobby_name}». Перевести сюда?
                      </Text>
                      {!conflict.can_transfer ? (
                        <Text tone="danger">
                          Дождитесь конца сессии в лобби «{conflict.other_lobby_name}».
                        </Text>
                      ) : null}
                      <div className="join-thumb-cta" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Button
                          type="button"
                          disabled={busy || !conflict.can_transfer}
                          onClick={() => void doJoin('transfer')}
                        >
                          Перевести сюда
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void doJoin('copy')}
                        >
                          Копировать персонажа
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setConflict(null)}
                        >
                          Отмена
                        </Button>
                      </div>
                    </Stack>
                  ) : (
                    <div className="join-thumb-cta">
                      <Button type="submit" disabled={busy || !codeReady || !characterId || !!metaError}>
                        {busy ? 'Входим…' : 'Сесть за стол'}
                      </Button>
                    </div>
                  )}
                </form>
              )}

              <div className="join-flow__observer">
                <Text tone="muted">
                  Сомастер и наблюдатель входят по тому же коду без персонажа. В сомастеры повышает
                  только владелец.
                </Text>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || !codeReady || !!metaError}
                  onClick={() => void onJoinAsObserver()}
                >
                  Войти без персонажа (наблюдатель)
                </Button>
              </div>

              {error ? <Text tone="danger">{error}</Text> : null}
            </Stack>
            </div>
          )}
        </Panel>

        <AppLegalFooter />
      </Stack>

      <JoinIntroCard
        enabled={!loading && onboarding.showJoinIntro}
        onDismiss={() => onboarding.markJoinIntroDone()}
      />
    </main>
  )
}
