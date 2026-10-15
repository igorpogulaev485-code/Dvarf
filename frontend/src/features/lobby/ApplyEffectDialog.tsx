import { useEffect, useMemo, useState } from 'react'
import type { SeatEffect, SessionSeat } from '../../shared/api/lobbies'
import { Dialog, Field, Input, Stack, Text } from '../../ui'

type Props = {
  open: boolean
  seats: SessionSeat[]
  /** Предпочтительный кастер (свой персонаж), если есть */
  preferredSourceId?: string | null
  busy?: boolean
  onClose: () => void
  onApply: (effect: SeatEffect, characterIds: string[]) => void
}

const SUGGESTIONS = [
  'Благословение',
  'Ускорение',
  'Щит веры',
  'Наставление',
  'Сглаз',
  'Метка охотника',
]

/**
 * Жест: выдать баф/эффект союзнику (не SRD-состояние).
 * Можно связать с концентрацией кастера — при снятии концентрации тег уйдёт.
 */
export function ApplyEffectDialog({
  open,
  seats,
  preferredSourceId = null,
  busy = false,
  onClose,
  onApply,
}: Props) {
  const casters = useMemo(
    () => seats.filter((s) => Boolean(s.concentration)),
    [seats],
  )

  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [linkConcentration, setLinkConcentration] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setSelected(new Set())
    const preferred =
      (preferredSourceId && casters.find((s) => s.character_id === preferredSourceId)) ||
      casters[0] ||
      null
    setSourceId(preferred?.character_id ?? null)
    setLinkConcentration(Boolean(preferred?.concentration))
  }, [open, preferredSourceId, casters])

  const sourceSeat = seats.find((s) => s.character_id === sourceId) ?? null
  const allSelected = seats.length > 0 && selected.size === seats.length
  const canLink = Boolean(sourceSeat?.concentration)

  const effect = useMemo((): SeatEffect | null => {
    const trimmed = name.trim()
    if (!trimmed) return null
    return {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `fx-${Date.now()}`,
      name: trimmed,
      source_character_id: sourceSeat?.character_id ?? null,
      source_name: sourceSeat?.character_name ?? null,
      linked_concentration: canLink && linkConcentration,
    }
  }, [name, sourceSeat, canLink, linkConcentration])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(seats.map((s) => s.character_id)))
  }

  if (!open) return null

  return (
    <Dialog
      open={open}
      title="Выдать эффект"
      primaryLabel={busy ? 'Выдаём…' : 'Выдать'}
      secondaryLabel="Отмена"
      busy={busy}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (!effect || selected.size === 0) return
        onApply(effect, [...selected])
      }}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Пометка на карточке союзника: «на нём сейчас Благословение». Это не состояние вроде
          «отравлен». Если связать с концентрацией кастера — сняли концентрацию, пометка у
          союзников тоже пропадёт.
        </Text>

        <Field label="Название">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Благословение / Ускорение / Метка охотника…"
            autoFocus
          />
        </Field>

        <div className="apply-effect__suggestions">
          {SUGGESTIONS.map((hint) => (
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

        {casters.length > 0 ? (
          <Field label="От кого (кастер)">
            <select
              className="ui-input"
              value={sourceId ?? ''}
              disabled={busy}
              onChange={(e) => {
                const next = e.target.value || null
                setSourceId(next)
                const seat = seats.find((s) => s.character_id === next)
                setLinkConcentration(Boolean(seat?.concentration))
              }}
            >
              <option value="">Без источника</option>
              {seats.map((seat) => (
                <option key={seat.character_id} value={seat.character_id}>
                  {seat.character_name}
                  {seat.concentration
                    ? ` · конц.: ${seat.concentration.name}`
                    : ''}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {canLink ? (
          <label className="session-feed-filter">
            <input
              type="checkbox"
              checked={linkConcentration}
              disabled={busy}
              onChange={(e) => setLinkConcentration(e.target.checked)}
            />
            Связать с концентрацией «{sourceSeat?.concentration?.name}»
          </label>
        ) : (
          <Text tone="muted" className="apply-effect__hint">
            Чтобы связать с концентрацией — сначала кастуйте заклинание на листе кастера
            (появится «Конц.») или выберите кастера с концентрацией выше.
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
              onClick={toggleAll}
              disabled={busy}
            >
              {allSelected ? 'Снять всех' : 'Все за столом'}
            </button>
          </div>
          <ul className="apply-condition__targets">
            {seats.map((seat) => {
              const checked = selected.has(seat.character_id)
              return (
                <li key={seat.character_id}>
                  <label className={`apply-condition__target${checked ? ' is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy}
                      onChange={() => toggle(seat.character_id)}
                    />
                    <span>
                      <strong>{seat.character_name}</strong>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      </Stack>
    </Dialog>
  )
}
