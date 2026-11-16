import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { acquireBodyScrollLock } from './bodyScrollLock'

type BottomSheetProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  titleId?: string
  className?: string
  /** Fraction of viewport height (0–1). Default 0.62 — leaves sheet fields reachable. */
  maxHeightRatio?: number
  showClose?: boolean
}

/**
 * Kit bottom sheet — partial-height drawer for narrow viewports.
 * Locks body scroll while open; Esc / backdrop / × close.
 */
export function BottomSheet({
  open,
  title,
  children,
  onClose,
  titleId = 'ui-bottom-sheet-title',
  className = '',
  maxHeightRatio = 0.62,
  showClose = true,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const release = acquireBodyScrollLock()
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      release()
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const maxHeight = `${Math.round(Math.min(0.85, Math.max(0.35, maxHeightRatio)) * 100)}dvh`

  return createPortal(
    <div className={`ui-bottom-sheet-root ${className}`.trim()}>
      <button
        type="button"
        className="ui-bottom-sheet-backdrop"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        className="ui-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ maxHeight }}
      >
        <div className="ui-bottom-sheet__grab" aria-hidden />
        <div className="ui-bottom-sheet__header">
          <h2 id={titleId} className="ui-bottom-sheet__title">
            {title}
          </h2>
          {showClose ? (
            <button
              type="button"
              className="ui-bottom-sheet__close"
              aria-label="Закрыть"
              onClick={onClose}
            >
              ×
            </button>
          ) : null}
        </div>
        <div className="ui-bottom-sheet__body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
