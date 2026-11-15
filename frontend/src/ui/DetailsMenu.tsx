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
  title,
  ...rootProps
}: DetailsMenuProps) {
  const rootRef = useRef<HTMLDetailsElement | null>(null)
  const summaryRef = useRef<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{
    top: number
    left: number
    minWidth: number
    maxHeight: number
  } | null>(null)
  /* Native title overlays popover fields while open (CMB-01 speed tile). */
  const tipTitle = open ? undefined : title

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
    // LOBBY-FIX: на 390 «Ещё» должно умещать «Добычу» — панель влезает в viewport.
    const spaceBelow = window.innerHeight - r.bottom - pad
    const spaceAbove = r.top - pad
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow
    const maxHeight = Math.max(160, Math.floor(openUp ? spaceAbove - 4 : spaceBelow - 4))
    const top = openUp
      ? Math.round(Math.max(pad, r.top - 4 - Math.min(maxHeight, spaceAbove)))
      : Math.round(r.bottom + 4)
    setCoords({
      top,
      left: Math.round(Math.max(pad, left)),
      minWidth: Math.round(minWidth),
      maxHeight,
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

  const closeMenu = () => {
    const root = rootRef.current
    if (root?.open) root.open = false
    setOpen(false)
  }

  const panel =
    open && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={`ui-menu__panel ui-menu__panel--portal ${panelClassName}`.trim()}
            style={{
              top: coords.top,
              left: coords.left,
              minWidth: coords.minWidth,
              maxHeight: coords.maxHeight,
              overflowY: 'auto',
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              // Выбор пункта закрывает меню — иначе портал остаётся поверх модалки.
              const target = event.target as HTMLElement | null
              if (target?.closest('button:not(:disabled), a[href], [data-menu-close]')) {
                closeMenu()
              }
            }}
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
      title={tipTitle}
      data-menu-open={open ? 'true' : undefined}
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
