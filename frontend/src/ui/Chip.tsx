import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode
  /** Dimmed / inactive state (e.g. stacked effect outside aura). */
  inactive?: boolean
  /** Open tooltip / detail panel (tap on touch). */
  tipOpen?: boolean
  /** Extra action buttons between label and dismiss. */
  actions?: ReactNode
  onDismiss?: () => void
  dismissLabel?: string
  /** Label button — opens tip on tap / announces details. */
  labelProps?: ButtonHTMLAttributes<HTMLButtonElement>
  tip?: ReactNode
}

/**
 * Kit chip — removable status / filter face.
 * Label ↔ dismiss spacing is owned by the kit (`gap` + `__dismiss`), not page CSS.
 */
export function Chip({
  children,
  className = '',
  inactive = false,
  tipOpen = false,
  actions,
  onDismiss,
  dismissLabel = 'Снять',
  labelProps,
  tip,
  ...rootProps
}: ChipProps) {
  const {
    className: labelClassName = '',
    type: _labelType,
    ...restLabel
  } = labelProps ?? {}
  return (
    <span
      className={`ui-chip${inactive ? ' is-inactive' : ''}${
        tipOpen ? ' is-tip-open' : ''
      } ${className}`.trim()}
      {...rootProps}
    >
      <button
        type="button"
        className={`ui-chip__label ${labelClassName}`.trim()}
        {...restLabel}
      >
        {children}
      </button>
      {tip ? <span className="ui-chip__tip">{tip}</span> : null}
      {actions || onDismiss ? (
        <span className="ui-chip__actions">
          {actions}
          {onDismiss ? (
            <button
              type="button"
              className="ui-chip__dismiss"
              aria-label={dismissLabel}
              title="Снять"
              onClick={onDismiss}
            >
              ×
            </button>
          ) : null}
        </span>
      ) : null}
    </span>
  )
}
