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
    top?: number
    bottom?: number
    left: number
    right?: number
    minWidth: number
    maxHeight: number
    sheet?: boolean
  } | null>(null)
  /* Native title overlays popover fields while open (CMB-01 speed tile). */
  const tipTitle = open ? undefined : title

  const place = () => {
    const el = summaryRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pad = 8
    const narrow = window.innerWidth < 640
    const toolbarMore =
      className.includes('session-toolbar-more') ||
      panelClassName.includes('session-toolbar-more')
    // LOBBY-FIX прогон 9: на телефоне «Ещё» — лист снизу, чтобы низ меню не обрезался.
    if (narrow && toolbarMore) {
      setCoords({
        bottom: pad,
        left: pad,
        right: pad,
        minWidth: Math.round(window.innerWidth - pad * 2),
        maxHeight: Math.max(220, Math.floor(window.innerHeight * 0.72)),
        sheet: true,
      })
      return
    }
    const minWidth = Math.max(r.width, 12 * 16)
    let left = r.left
    if (left + minWidth > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - pad - minWidth)
    }
    const spaceBelow = window.innerHeight - r.bottom - pad
    const spaceAbove = r.top - pad
    const openUp = spaceAbove > spaceBelow
    const available = Math.max(openUp ? spaceAbove : spaceBelow, 120)
    const maxHeight = Math.max(
      180,
      Math.min(Math.floor(available - 8), Math.floor(window.innerHeight * 0.75)),
    )
    const top = openUp
      ? Math.round(Math.max(pad, r.top - 4 - maxHeight))
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
            className={`ui-menu__panel ui-menu__panel--portal${coords.sheet ? ' ui-menu__panel--sheet' : ''} ${panelClassName}`.trim()}
            style={{
              // sheet: top:auto overrides kit `.ui-menu__panel--portal { top:0 }`
              top: coords.sheet ? 'auto' : coords.top,
              bottom: coords.sheet ? coords.bottom : undefined,
              left: coords.left,
              right: coords.sheet ? coords.right : undefined,
              width: coords.sheet
                ? `calc(100vw - ${coords.left + (coords.right ?? 8)}px)`
                : undefined,
              minWidth: coords.minWidth,
              maxHeight: coords.maxHeight,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
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
