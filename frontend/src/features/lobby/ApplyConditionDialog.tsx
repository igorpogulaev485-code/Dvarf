import { useEffect, useMemo, useState } from 'react'
import type { SeatCondition, SessionSeat } from '../../shared/api/lobbies'
import { FALLBACK_CONDITIONS } from '../../shared/dnd/conditions'
import { Dialog, Stack, Text } from '../../ui'

type Props = {
  open: boolean
  seats: SessionSeat[]
  busy?: boolean
  onClose: () => void
  onApply: (condition: SeatCondition, characterIds: string[]) => void
}

/**
 * Жест мастера: выбрать состояние → отметить кого (один / группа) → выдать.
 * Теги также появляются сами, если игрок отметил состояние у себя на листе
 * (seat.conditions читаются из sheet.combat.conditions).
 */
export function ApplyConditionDialog({ open, seats, busy = false, onClose, onApply }: Props) {
  const [conditionSlug, setConditionSlug] = useState(FALLBACK_CONDITIONS[0]?.slug ?? 'poisoned')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!open) return
    setConditionSlug(FALLBACK_CONDITIONS[0]?.slug ?? 'poisoned')
    setSelected(new Set())
  }, [open])

  const condition = useMemo(() => {
    const found = FALLBACK_CONDITIONS.find((c) => c.slug === conditionSlug)
    return {
      slug: conditionSlug,
      name: found?.name_ru ?? conditionSlug,
      catalog_id: null as string | null,
    }
  }, [conditionSlug])

  const allSelected = seats.length > 0 && selected.size === seats.length

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
      title="Выдать состояние"
      primaryLabel={busy ? 'Выдаём…' : 'Выдать'}
      secondaryLabel="Отмена"
      busy={busy}
      size="wide"
      onSecondary={onClose}
      onPrimary={() => {
        if (selected.size === 0) return
        onApply(condition, [...selected])
      }}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Выберите эффект и кого затронуть. Тег появится на карточках. Если игрок сам отметил
          состояние на листе — тег тоже придёт на стол.
        </Text>

        <div>
          <Text as="h3" className="apply-condition__heading">
            Состояние
          </Text>
          <div className="apply-condition__grid">
            {FALLBACK_CONDITIONS.map((opt) => (
              <button
                key={opt.slug}
                type="button"
                className={`session-condition-tag${conditionSlug === opt.slug ? ' is-picked' : ''}`}
                disabled={busy}
                aria-pressed={conditionSlug === opt.slug}
                onClick={() => setConditionSlug(opt.slug)}
              >
                {opt.name_ru}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="apply-condition__targets-head">
            <Text as="h3" className="apply-condition__heading">
              Кому
            </Text>
            <button type="button" className="ui-button ui-button--ghost" onClick={toggleAll} disabled={busy}>
              {allSelected ? 'Снять всех' : 'Все за столом'}
            </button>
          </div>
          <ul className="apply-condition__targets">
            {seats.map((seat) => {
              const checked = selected.has(seat.character_id)
              const already = (seat.conditions ?? []).some((c) => c.slug === condition.slug)
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
                      {already ? (
                        <Text tone="muted" className="apply-condition__already">
                          уже есть
                        </Text>
                      ) : null}
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
