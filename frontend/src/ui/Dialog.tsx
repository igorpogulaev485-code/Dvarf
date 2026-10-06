import { useEffect, type MouseEvent, type ReactNode } from 'react'
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
  /** Disables only the primary action (Cancel stays available). */
  primaryDisabled?: boolean
  size?: 'default' | 'wide'
  /** Close when clicking the dimmed backdrop. Default: true if onSecondary is set. */
  closeOnBackdrop?: boolean
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
  closeOnBackdrop,
}: DialogProps) {
  const canClose = Boolean(onSecondary) && !busy
  const backdropCloses = closeOnBackdrop ?? canClose

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && canClose && onSecondary) {
        event.preventDefault()
        onSecondary()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, canClose, onSecondary])

  if (!open) {
    return null
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    if (!backdropCloses || !onSecondary) return
    onSecondary()
  }

  return (
    <div
      className="ui-dialog-backdrop"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div
        className={`ui-dialog${size === 'wide' ? ' ui-dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
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
          <Button onClick={onPrimary} disabled={busy || primaryDisabled}>
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
