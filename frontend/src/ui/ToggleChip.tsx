import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ToggleChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'onChange' | 'type' | 'role' | 'aria-checked'
> & {
  /** First line — short label («Далёкое»). */
  main: ReactNode
  /** Second line — cost / hint / disable reason. */
  rest?: ReactNode
  checked: boolean
  onChange: (next: boolean) => void
}

/**
 * Kit selectable chip — two-line face like cast-source slot chips.
 * role=checkbox + aria-checked; Space/Enter via native `<button>` activation.
 */
export function ToggleChip({
  main,
  rest,
  checked,
  onChange,
  disabled = false,
  className = '',
  onClick,
  ...restProps
}: ToggleChipProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      className={`ui-toggle-chip${checked ? ' is-on' : ''}${
        disabled ? ' is-disabled' : ''
      } ${className}`.trim()}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || disabled) return
        onChange(!checked)
      }}
      {...restProps}
    >
      <span className="ui-toggle-chip__main">{main}</span>
      {rest != null && rest !== '' ? (
        <span className="ui-toggle-chip__rest">{rest}</span>
      ) : null}
    </button>
  )
}
