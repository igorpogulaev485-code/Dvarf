import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type FloatingPanelCoords = {
  top?: number
  bottom?: number
  left?: number
  right?: number
  width?: number
  maxHeight?: number
}

type FloatingPanelProps = {
  open: boolean
  title: string
  children: ReactNode
  /** Anchor-relative fixed coords (viewport). */
  coords: FloatingPanelCoords | null
  onClose: () => void
  /** Optional labelled-by id; defaults to generated title id. */
  titleId?: string
  className?: string
  /** Extra class on the panel surface. */
  panelClassName?: string
  showClose?: boolean
}

/**
 * Kit floating panel — portal, Esc / backdrop dismiss, no body scroll lock
 * (sheet stays usable behind a compact desk panel).
 */
export function FloatingPanel({
  open,
  title,
  children,
  coords,
  onClose,
  titleId = 'ui-floating-panel-title',
  className = '',
  panelClassName = '',
  showClose = true,
}: FloatingPanelProps) {
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const style: CSSProperties = {
    position: 'fixed',
    top: coords?.top,
    bottom: coords?.bottom,
    left: coords?.left,
    right: coords?.right,
    width: coords?.width,
    maxHeight: coords?.maxHeight,
  }

  return createPortal(
    <div className={`ui-floating-root ${className}`.trim()}>
      <button
        type="button"
        className="ui-floating-backdrop"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        className={`ui-floating-panel ${panelClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={style}
      >
        <div className="ui-floating-panel__header">
          <h2 id={titleId} className="ui-floating-panel__title">
            {title}
          </h2>
          {showClose ? (
            <button
              type="button"
              className="ui-floating-panel__close"
              aria-label="Закрыть"
              onClick={onClose}
            >
              ×
            </button>
          ) : null}
        </div>
        <div className="ui-floating-panel__body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
