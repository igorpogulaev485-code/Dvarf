import { useEffect, useMemo, useState } from 'react'
import {
  getLobby,
  listLobbies,
  shareLobbyEffect,
  type LobbyDetail,
  type LobbySummary,
} from '../../shared/api/lobbies'
import { ApiRequestError } from '../../shared/api/client'
import { Dialog, Field, Input, Stack, Text } from '../../ui'
import {
  effectSuggestionsFromPlay,
  type PlayState,
} from '../characters/play'
import type { SpellsState } from '../characters/spells'

type Props = {
  open: boolean
  characterId: string
  characterName: string
  play: PlayState
  spells: SpellsState
  onClose: () => void
  onToast: (message: string) => void
  onError: (message: string) => void
}

/**
 * С листа: раздать эффект (обычно текущую Conc) союзникам лобби.
 * Пишет в sheet.combat.effects целей через /lobbies/:id/share-effect.
 */
export function ShareEffectFromSheetDialog({
  open,
  characterId,
  characterName,
  play,
  spells,
  onClose,
  onToast,
  onError,
}: Props) {
  const suggestions = useMemo(
    () => effectSuggestionsFromPlay(play, spells.known),
    [play, spells.known],
  )
  const [name, setName] = useState('')
  const [lobbies, setLobbies] = useState<LobbySummary[]>([])
  const [lobbyId, setLobbyId] = useState<string | null>(null)
  const [lobbyDetail, setLobbyDetail] = useState<LobbyDetail | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [linkConcentration, setLinkConcentration] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(suggestions[0] ?? play.concentration?.name ?? '')
    setLinkConcentration(Boolean(play.concentration))
    setSelected(new Set())
    setLobbyDetail(null)
    setLoading(true)
    listLobbies()
      .then(async (list) => {
        const withMe: LobbySummary[] = []
        for (const summary of list) {
          const detail = await getLobby(summary.id)
          if (detail.members.some((m) => m.character_id === characterId)) {
            withMe.push(summary)
          }
        }
        setLobbies(withMe)
        const first = withMe[0]?.id ?? null
        setLobbyId(first)
        if (first) {
          const detail = await getLobby(first)
          setLobbyDetail(detail)
        }
      })
      .catch((err: unknown) => {
        onError(err instanceof ApiRequestError ? err.message : 'Не удалось загрузить лобби')
      })
      .finally(() => setLoading(false))
  }, [open, characterId, suggestions, play.concentration, onError])

  useEffect(() => {
    if (!open || !lobbyId) return
    let active = true
    getLobby(lobbyId)
      .then((detail) => {
        if (active) {
          setLobbyDetail(detail)
          setSelected(new Set())
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [open, lobbyId])

  const allies = useMemo(
    () => (lobbyDetail?.members ?? []).filter((m) => m.character_id !== characterId),
    [lobbyDetail, characterId],
  )

  const allSelected = allies.length > 0 && selected.size === allies.length

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!open) return null

  return (
    <Dialog
      open={open}
      title="Раздать эффект союзникам"
      primaryLabel={busy ? 'Раздаём…' : 'Раздать'}
      secondaryLabel="Отмена"
      busy={busy || loading}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (!lobbyId || !name.trim() || selected.size === 0) return
        setBusy(true)
        shareLobbyEffect(lobbyId, {
          source_character_id: characterId,
          name: name.trim(),
          target_character_ids: [...selected],
          linked_concentration: Boolean(play.concentration) && linkConcentration,
        })
          .then((result) => {
            onToast(
              result.applied > 0
                ? `Эффект «${name.trim()}» · ${result.applied}`
                : 'Никого не отметили',
            )
            onClose()
          })
          .catch((err: unknown) => {
            onError(err instanceof ApiRequestError ? err.message : 'Не удалось раздать')
          })
          .finally(() => setBusy(false))
      }}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Пометит карточки союзников в лобби: «на них сейчас {name.trim() || '…'}» от{' '}
          {characterName}. Данные пишутся в их листы — на столе теги появятся сами.
        </Text>

        {lobbies.length === 0 && !loading ? (
          <Text tone="muted">Персонаж ни в одном лобби — сначала вступите в лобби.</Text>
        ) : null}

        {lobbies.length > 1 ? (
          <Field label="Лобби">
            <select
              className="ui-input"
              value={lobbyId ?? ''}
              disabled={busy}
              onChange={(e) => setLobbyId(e.target.value || null)}
            >
              {lobbies.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <Field label="Название">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Благословение…"
          />
        </Field>

        {suggestions.length > 0 ? (
          <div className="apply-effect__suggestions">
            {suggestions.map((hint) => (
              <button
                key={hint}
                type="button"
                className="session-effect-tag"
                disabled={busy}
                onClick={() => setName(hint)}
              >
                {hint}
              </button>
            ))}
          </div>
        ) : null}

        {play.concentration ? (
          <label className="session-feed-filter">
            <input
              type="checkbox"
              checked={linkConcentration}
              disabled={busy}
              onChange={(e) => setLinkConcentration(e.target.checked)}
            />
            Связать с концентрацией «{play.concentration.name}»
          </label>
        ) : (
          <Text tone="muted">
            Нет концентрации — эффект повесится без связи (не снимется сам при сбросе Conc).
          </Text>
        )}

        <div>
          <div className="apply-condition__targets-head">
            <Text as="h3" className="apply-condition__heading">
              Кому
            </Text>
            <button
              type="button"
              className="ui-button ui-button--ghost"
              disabled={busy || allies.length === 0}
              onClick={() => {
                if (allSelected) setSelected(new Set())
                else setSelected(new Set(allies.map((a) => a.character_id)))
              }}
            >
              {allSelected ? 'Снять всех' : 'Все в лобби'}
            </button>
          </div>
          {loading ? (
            <Text tone="muted">Загрузка…</Text>
          ) : allies.length === 0 ? (
            <Text tone="muted">В лобби пока нет других персонажей.</Text>
          ) : (
            <ul className="apply-condition__targets">
              {allies.map((ally) => {
                const checked = selected.has(ally.character_id)
                return (
                  <li key={ally.character_id}>
                    <label className={`apply-condition__target${checked ? ' is-on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={busy}
                        onChange={() => toggle(ally.character_id)}
                      />
                      <span>
                        <strong>{ally.character_name}</strong>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Stack>
    </Dialog>
  )
}
