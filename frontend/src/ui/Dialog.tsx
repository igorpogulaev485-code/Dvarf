import type { ReactNode } from 'react'
import { Button } from './Button'

type DialogProps = {
  open: boolean
  title: string
  children: ReactNode
  primaryLabel: string
  secondaryLabel?: string
  onPrimary: () => void
  onSecondary?: () => void
  busy?: boolean
  size?: 'default' | 'wide'
}

export function Dialog({
  open,
  title,
  children,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  busy = false,
  size = 'default',
}: DialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="ui-dialog-backdrop" role="presentation">
      <div
        className={`ui-dialog${size === 'wide' ? ' ui-dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-dialog-title"
      >
        <h2 id="ui-dialog-title" className="ui-text ui-dialog__title">
          {title}
        </h2>
        <div className="ui-dialog__body">{children}</div>
        <div className="ui-dialog__actions">
          {secondaryLabel && onSecondary ? (
            <Button variant="ghost" onClick={onSecondary} disabled={busy}>
              {secondaryLabel}
            </Button>
          ) : null}
          <Button onClick={onPrimary} disabled={busy}>
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
