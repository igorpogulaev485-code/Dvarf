import {
  useLayoutEffect,
  useRef,
  useState,
  type DetailsHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

type DetailsMenuProps = Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'children'> & {
  /** Visible summary / trigger label. */
  summary: ReactNode
  children: ReactNode
  summaryClassName?: string
  panelClassName?: string
}

/**
 * Kit popover menu built on `<details>`.
 * Panel portals to document.body (fixed) so sticky scene toolbars
 * («Развернуть все») cannot paint over +N class/effects menus.
 */
export function DetailsMenu({
  summary,
  children,
  className = '',
  summaryClassName = '',
  panelClassName = '',
  onToggle,
  ...rootProps
}: DetailsMenuProps) {
  const rootRef = useRef<HTMLDetailsElement | null>(null)
  const summaryRef = useRef<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{
    top: number
    left: number
    minWidth: number
  } | null>(null)

  const place = () => {
    const el = summaryRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pad = 8
    const minWidth = Math.max(r.width, 12 * 16)
    let left = r.left
    if (left + minWidth > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - pad - minWidth)
    }
    setCoords({
      top: Math.round(r.bottom + 4),
      left: Math.round(Math.max(pad, left)),
      minWidth: Math.round(minWidth),
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    place()
    const onReposition = () => place()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  const panel =
    open && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={`ui-menu__panel ui-menu__panel--portal ${panelClassName}`.trim()}
            style={{
              top: coords.top,
              left: coords.left,
              minWidth: coords.minWidth,
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </div>,
          document.body,
        )
      : null

  return (
    <details
      ref={rootRef}
      className={`ui-menu ${className}`.trim()}
      {...rootProps}
      onToggle={(event) => {
        setOpen(event.currentTarget.open)
        onToggle?.(event)
      }}
    >
      <summary
        ref={summaryRef}
        className={`ui-menu__summary ${summaryClassName}`.trim()}
      >
        {summary}
      </summary>
      {panel}
    </details>
  )
}
