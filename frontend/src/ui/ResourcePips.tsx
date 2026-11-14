import type { HTMLAttributes } from 'react'

type ResourcePipsProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  max: number
  /** Spent count (filled = still available when using default fill). */
  used: number
  /**
   * `available` (default): filled pip = remaining charge (hot-bar face).
   * `spent`: filled pip = already spent.
   */
  fillMode?: 'available' | 'spent'
  label?: string
  onChange: (used: number) => void
  disabled?: boolean
}

/**
 * Kit square resource pips — gap 4px, clickable cells.
 * Etalon accepted Игорь 14.11.2026 (Play Desk hot bar).
 */
export function ResourcePips({
  max,
  used,
  fillMode = 'available',
  label,
  onChange,
  disabled = false,
  className = '',
  ...rootProps
}: ResourcePipsProps) {
  if (max <= 0) return null
  const safeUsed = Math.min(max, Math.max(0, used))
  const remaining = Math.max(0, max - safeUsed)

  return (
    <div
      className={`ui-resource-pips play-desk__pips ${className}`.trim()}
      role="group"
      aria-label={label ?? `${remaining}/${max}`}
      {...rootProps}
    >
      {Array.from({ length: max }, (_, index) => {
        const isOn =
          fillMode === 'available' ? index < remaining : index < safeUsed
        return (
          <button
            key={index}
            type="button"
            className={`ui-resource-pip play-desk__pip${isOn ? ' is-on' : ''}`}
            disabled={disabled}
            aria-label={
              fillMode === 'available'
                ? isOn
                  ? `Потратить заряд ${index + 1}`
                  : `Вернуть заряд ${index + 1}`
                : isOn
                  ? `Вернуть заряд ${index + 1}`
                  : `Потратить заряд ${index + 1}`
            }
            title={
              fillMode === 'available'
                ? isOn
                  ? 'Потратить'
                  : 'Вернуть'
                : isOn
                  ? 'Вернуть'
                  : 'Потратить'
            }
            onClick={() => {
              if (fillMode === 'available') {
                if (isOn) onChange(Math.min(max, safeUsed + 1))
                else onChange(Math.max(0, safeUsed - 1))
              } else if (isOn) {
                onChange(Math.max(0, safeUsed - 1))
              } else {
                onChange(Math.min(max, safeUsed + 1))
              }
            }}
          />
        )
      })}
    </div>
  )
}
