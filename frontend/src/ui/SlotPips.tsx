import { slotUsedAfterPipClick } from '../shared/dnd/spells'

type SlotPipsProps = {
  max: number
  used: number
  label?: string
  onChange: (used: number) => void
  disabled?: boolean
}

/** Reusable resource pips (spell slots, later other limited-use resources). */
export function SlotPips({ max, used, label, onChange, disabled = false }: SlotPipsProps) {
  if (max <= 0) {
    return null
  }

  const safeUsed = Math.min(max, Math.max(0, used))

  return (
    <div className="slot-pips" role="group" aria-label={label ?? 'Ячейки'}>
      {label ? <span className="slot-pips__label">{label}</span> : null}
      <div className="slot-pips__row">
        {Array.from({ length: max }, (_, index) => {
          const filled = index < safeUsed
          return (
            <button
              key={index}
              type="button"
              className={`slot-pip${filled ? ' is-filled' : ''}`}
              disabled={disabled}
              aria-label={
                filled
                  ? `Ячейка ${index + 1} из ${max}: потрачена`
                  : `Ячейка ${index + 1} из ${max}: свободна`
              }
              aria-pressed={filled}
              onClick={() => onChange(slotUsedAfterPipClick(safeUsed, index))}
            />
          )
        })}
      </div>
    </div>
  )
}
