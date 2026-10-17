import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  primaryDisabled?: boolean
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
  primaryDisabled = false,
  size = 'default',
}: DialogProps) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="ui-dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        // Клик по затемнению (не по диалогу) → secondary/закрытие
        if (e.target === e.currentTarget && onSecondary) {
          onSecondary()
        }
      }}
    >
      <div
        className={`ui-dialog${size === 'wide' ? ' ui-dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
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
            <Button onClick={onPrimary} disabled={busy || primaryDisabled}>
              {primaryLabel}
            </Button>
          </div>
        </Stack>
      </div>
    </div>,
    document.body,
  )
}
