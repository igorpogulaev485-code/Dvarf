import { slotUsedAfterPipClick } from '../shared/dnd/spells'

type SlotPipsProps = {
  max: number
  used: number
  label?: string
  /** Extra line under the label, e.g. "2 / 3 доступно". */
  summary?: string
  /**
   * `spent` (default): filled pip = spent (spell slots).
   * `available`: filled pip = still available (hit dice).
   */
  fillMode?: 'spent' | 'available'
  onChange: (used: number) => void
  disabled?: boolean
}

/** Reusable resource pips (spell slots, hit dice, limited-use resources). */
export function SlotPips({
  max,
  used,
  label,
  summary,
  fillMode = 'spent',
  onChange,
  disabled = false,
}: SlotPipsProps) {
  if (max <= 0) {
    return null
  }

  const safeUsed = Math.min(max, Math.max(0, used))
  const available = max - safeUsed

  return (
    <div
      className={`slot-pips${fillMode === 'available' ? ' slot-pips--available' : ''}`}
      role="group"
      aria-label={label ?? 'Ячейки'}
    >
      {(label || summary) && (
        <div className="slot-pips__meta">
          {label ? <span className="slot-pips__label">{label}</span> : null}
          {summary ? <span className="slot-pips__summary">{summary}</span> : null}
        </div>
      )}
      <div className="slot-pips__row">
        {Array.from({ length: max }, (_, index) => {
          const spent = index < safeUsed
          const filled = fillMode === 'available' ? !spent : spent
          const stateLabel =
            fillMode === 'available'
              ? filled
                ? `кость ${index + 1} из ${max}: доступна`
                : `кость ${index + 1} из ${max}: потрачена`
              : spent
                ? `ячейка ${index + 1} из ${max}: потрачена`
                : `ячейка ${index + 1} из ${max}: свободна`
          return (
            <button
              key={index}
              type="button"
              className={`slot-pip${filled ? ' is-filled' : ''}${spent ? ' is-spent' : ''}`}
              disabled={disabled}
              aria-label={stateLabel}
              aria-pressed={spent}
              onClick={() => onChange(slotUsedAfterPipClick(safeUsed, index))}
            />
          )
        })}
      </div>
      <span className="visually-hidden">
        доступно {available} из {max}
      </span>
    </div>
  )
}
