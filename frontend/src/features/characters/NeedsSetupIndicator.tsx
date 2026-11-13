import { useEffect, useId, useRef, useState } from 'react'
import type { NeedsSetupItem } from './needsSetup'

type NeedsSetupIndicatorProps = {
  items: NeedsSetupItem[]
  onSelect: (item: NeedsSetupItem) => void
  /** Compact chip for mobile vitals. */
  compact?: boolean
}

/** B20: one header chip «Нужно настроить: N» with a short jump list. */
export function NeedsSetupIndicator({
  items,
  onSelect,
  compact = false,
}: NeedsSetupIndicatorProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const listId = useId()

  useEffect(() => {
    if (items.length === 0) setOpen(false)
  }, [items.length])

  useEffect(() => {
    if (!open) return
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
  }, [open])

  if (items.length === 0) return null
  const n = items.length

  return (
    <div
      ref={rootRef}
      className={`needs-setup${compact ? ' needs-setup--compact' : ''}${
        open ? ' is-open' : ''
      }`}
    >
      <button
        type="button"
        className="needs-setup__btn"
        aria-expanded={open}
        aria-controls={listId}
        title="Что ещё нужно настроить на листе"
        onClick={() => setOpen((prev) => !prev)}
      >
        Нужно настроить: {n}
      </button>
      {open ? (
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
                <span className="needs-setup__group">
                  {item.kind === 'feature_choice'
                    ? 'Способности'
                    : item.kind === 'asi'
                      ? 'Способности'
                      : item.kind === 'spells'
                        ? 'Магия'
                        : item.kind === 'alignment'
                          ? 'Основное'
                          : 'Напарники'}
                </span>
                <span className="needs-setup__label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
