import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  const titleId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    bodyRef.current?.scrollTo({ top: 0 })

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

  if (!open || typeof document === 'undefined') {
    return null
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    if (!backdropCloses || !onSecondary) return
    onSecondary()
  }

  return createPortal(
    <div
      className="ui-dialog-backdrop"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div
        className={`ui-dialog${size === 'wide' ? ' ui-dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="ui-text ui-dialog__title">
          {title}
        </h2>
        <div ref={bodyRef} className="ui-dialog__body">
          {children}
        </div>
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
    </div>,
    document.body,
  )
}
