import type { ReactNode } from 'react'

export type SegmentedOption<T extends string = string> = {
  id: T
  label: ReactNode
}

type Props<T extends string> = {
  options: SegmentedOption<T>[]
  value: T
  onChange: (id: T) => void
  /** Accessible name for the tablist / radiogroup. */
  'aria-label': string
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Kit segmented tabs — one row, equal segments, active = accent fill.
 * Use for compact mutually-exclusive choices (e.g. side panel Заметки|Чат|Вики).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  size = 'md',
  className = '',
}: Props<T>) {
  const sizeClass = size === 'sm' ? ' ui-segmented--sm' : ''
  return (
    <div
      className={`ui-segmented${sizeClass} ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const on = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={on}
            className={`ui-segmented__item${on ? ' is-on' : ''}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
