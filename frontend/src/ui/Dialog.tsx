import type { ReactNode } from 'react'
import { Button } from './Button'
import { Stack } from './Stack'

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
        <Stack gap={14}>
          <h2 id="ui-dialog-title" className="ui-text">
            {title}
          </h2>
          {children}
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
        </Stack>
      </div>
    </div>
  )
}
