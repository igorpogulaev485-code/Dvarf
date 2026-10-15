import { Field, Text } from '../../ui'
import type { PartyOption } from './useLobbyParty'

type Props = {
  count: number
  /** character_id или '' для пустого слота */
  values: string[]
  onChange: (index: number, characterId: string) => void
  options: PartyOption[]
  loading?: boolean
  busy?: boolean
  lobbyName?: string | null
  lobbies?: Array<{ id: string; name: string }>
  lobbyId?: string | null
  onLobbyIdChange?: (id: string | null) => void
  selfLabel?: string
}

/**
 * N выпадающих списков целей (UI kit: Field + select.ui-input).
 * В каждом — себя и союзников; себя можно не выбирать.
 */
export function AllyTargetFields({
  count,
  values,
  onChange,
  options,
  loading = false,
  busy = false,
  lobbyName,
  lobbies = [],
  lobbyId,
  onLobbyIdChange,
  selfLabel = 'На себя',
}: Props) {
  if (loading) {
    return <Text tone="muted">Загрузка участников лобби…</Text>
  }

  if (options.length === 0) {
    return (
      <Text tone="muted">
        Нет лобби с этим персонажем — цели появятся, когда вступите в лобби.
      </Text>
    )
  }

  return (
    <div className="ally-targets">
      <Text as="h3" className="apply-condition__heading">
        Цели
      </Text>
      {lobbyName ? (
        <Text tone="muted" className="ally-targets__lobby">
          {lobbyName}
        </Text>
      ) : null}
      {lobbies.length > 1 && onLobbyIdChange ? (
        <Field label="Лобби">
          <select
            className="ui-input"
            value={lobbyId ?? ''}
            disabled={busy}
            onChange={(e) => onLobbyIdChange(e.target.value || null)}
          >
            {lobbies.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Text tone="muted">
        {count === 1
          ? 'Выберите себя или союзника.'
          : `Нужно выбрать ${count}. Себя можно включить в любой слот — или не включать.`}
      </Text>
      {Array.from({ length: count }, (_, index) => (
        <Field key={index} label={count === 1 ? 'Кто' : `Цель ${index + 1}`}>
          <select
            className="ui-input"
            value={values[index] ?? ''}
            disabled={busy}
            onChange={(e) => onChange(index, e.target.value)}
          >
            <option value="">— не выбрано —</option>
            {options.map((opt) => (
              <option key={opt.character_id} value={opt.character_id}>
                {opt.isSelf ? `${selfLabel} (${opt.character_name})` : opt.character_name}
              </option>
            ))}
          </select>
        </Field>
      ))}
    </div>
  )
}
