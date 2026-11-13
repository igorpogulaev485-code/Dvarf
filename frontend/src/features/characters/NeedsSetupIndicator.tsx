import { useEffect, useId, useRef, useState } from 'react'
import { Dialog } from '../../ui/Dialog'
import type { NeedsSetupItem } from './needsSetup'

type NeedsSetupIndicatorProps = {
  items: NeedsSetupItem[]
  onSelect: (item: NeedsSetupItem) => void
  /** Compact chip for mobile vitals. */
  compact?: boolean
  /** Icon + count only (collapsed mobile header). */
  iconOnly?: boolean
  /** Open the list as a bottom sheet (phone); desktop keeps the dropdown. */
  asSheet?: boolean
}

function groupLabel(item: NeedsSetupItem): string {
  return item.kind === 'feature_choice'
    ? 'Способности'
    : item.kind === 'asi'
      ? 'Способности'
      : item.kind === 'spells'
        ? 'Магия'
        : item.kind === 'alignment'
          ? 'Основное'
          : 'Напарники'
}

/** B20: one header chip «Нужно настроить: N» with a short jump list. */
export function NeedsSetupIndicator({
  items,
  onSelect,
  compact = false,
  iconOnly = false,
  asSheet = false,
}: NeedsSetupIndicatorProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const listId = useId()

  useEffect(() => {
    if (items.length === 0) setOpen(false)
  }, [items.length])

  useEffect(() => {
    if (!open || asSheet) return
    const onDoc = (event: MouseEvent) => {
      const el = rootRef.current
      if (!el) return
      if (event.target instanceof Node && !el.contains(event.target)) {
        setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, asSheet])

  if (items.length === 0) return null
  const n = items.length
  const btnLabel = `Нужно настроить: ${n}`

  const listItems = (
    <ul id={listId} className="needs-setup__list" role="listbox">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className="needs-setup__item"
            role="option"
            onClick={() => {
              setOpen(false)
              onSelect(item)
            }}
          >
            <span className="needs-setup__group">{groupLabel(item)}</span>
            <span className="needs-setup__label">{item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div
      ref={rootRef}
      className={`needs-setup${compact ? ' needs-setup--compact' : ''}${
        iconOnly ? ' needs-setup--icon' : ''
      }${open ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className="needs-setup__btn"
        aria-expanded={open}
        aria-controls={asSheet ? undefined : listId}
        aria-haspopup={asSheet ? 'dialog' : 'listbox'}
        aria-label={btnLabel}
        title="Что ещё нужно настроить на листе"
        onClick={() => setOpen((prev) => !prev)}
      >
        {iconOnly ? (
          <>
            <span className="needs-setup__bang" aria-hidden>
              !
            </span>
            <span className="needs-setup__count">{n}</span>
          </>
        ) : (
          btnLabel
        )}
      </button>
      {open && !asSheet ? listItems : null}
      {asSheet ? (
        <Dialog
          open={open}
          title={btnLabel}
          primaryLabel="Закрыть"
          onPrimary={() => setOpen(false)}
          onSecondary={() => setOpen(false)}
          closeOnBackdrop
        >
          <div className="needs-setup__sheet">{listItems}</div>
        </Dialog>
      ) : null}
    </div>
  )
}
