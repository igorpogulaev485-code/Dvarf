import { useEffect, useMemo, useState } from 'react'
import {
  getLobby,
  listLobbies,
  type LobbyDetail,
  type LobbySummary,
} from '../../shared/api/lobbies'
import { Text } from '../../ui'

type Props = {
  characterId: string
  busy?: boolean
  /** Controlled selection of target character ids */
  selected: Set<string>
  onSelectedChange: (next: Set<string>) => void
  lobbyId: string | null
  onLobbyIdChange: (id: string | null) => void
}

/**
 * Выбор союзников лобби — вшивается в каст / трату способности, не отдельная кнопка.
 */
export function AllyPickSection({
  characterId,
  busy = false,
  selected,
  onSelectedChange,
  lobbyId,
  onLobbyIdChange,
}: Props) {
  const [lobbies, setLobbies] = useState<LobbySummary[]>([])
  const [lobbyDetail, setLobbyDetail] = useState<LobbyDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    listLobbies()
      .then(async (list) => {
        const withMe: LobbySummary[] = []
        for (const summary of list) {
          const detail = await getLobby(summary.id)
          if (!active) return
          if (detail.members.some((m) => m.character_id === characterId)) {
            withMe.push(summary)
          }
        }
        if (!active) return
        setLobbies(withMe)
        const first = withMe[0]?.id ?? null
        if (!lobbyId && first) onLobbyIdChange(first)
      })
      .catch(() => {
        if (active) setLobbies([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per character
  }, [characterId])

  useEffect(() => {
    if (!lobbyId) {
      setLobbyDetail(null)
      return
    }
    let active = true
    getLobby(lobbyId)
      .then((detail) => {
        if (active) setLobbyDetail(detail)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [lobbyId])

  const allies = useMemo(
    () => (lobbyDetail?.members ?? []).filter((m) => m.character_id !== characterId),
    [lobbyDetail, characterId],
  )

  const allSelected = allies.length > 0 && selected.size === allies.length

  if (loading) {
    return <Text tone="muted">Загрузка союзников…</Text>
  }

  if (lobbies.length === 0) {
    return (
      <Text tone="muted">
        Персонаж не в лобби — пометку на союзниках можно будет поставить, когда вступите в
        лобби.
      </Text>
    )
  }

  return (
    <div className="ally-pick">
      <Text as="h3" className="apply-condition__heading">
        Кому из союзников
      </Text>
      {lobbies.length > 1 ? (
        <select
          className="ui-input"
          value={lobbyId ?? ''}
          disabled={busy}
          onChange={(e) => {
            onLobbyIdChange(e.target.value || null)
            onSelectedChange(new Set())
          }}
        >
          {lobbies.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      ) : null}
      <div className="apply-condition__targets-head">
        <Text tone="muted">Отметьте, на ком висит эффект</Text>
        <button
          type="button"
          className="ui-button ui-button--ghost"
          disabled={busy || allies.length === 0}
          onClick={() => {
            if (allSelected) onSelectedChange(new Set())
            else onSelectedChange(new Set(allies.map((a) => a.character_id)))
          }}
        >
          {allSelected ? 'Снять всех' : 'Все в лобби'}
        </button>
      </div>
      {allies.length === 0 ? (
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
                    onChange={() => {
                      const next = new Set(selected)
                      if (next.has(ally.character_id)) next.delete(ally.character_id)
                      else next.add(ally.character_id)
                      onSelectedChange(next)
                    }}
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
  )
}
