import { useState } from 'react'
import { Text } from '../../ui'
import { CHECKLIST_ITEMS } from './copy.ru'

type ChecklistItem = (typeof CHECKLIST_ITEMS)[number]

type OnboardingChecklistProps = {
  className?: string
  compact?: boolean
  /** Default collapsed summary «Можно позже · N». */
  defaultOpen?: boolean
  /**
   * Remaining items. Empty → nothing rendered («всё сделано»).
   * Defaults to the full static list.
   */
  items?: ChecklistItem[]
}

export function OnboardingChecklist({
  className = '',
  compact = false,
  defaultOpen = false,
  items = CHECKLIST_ITEMS,
}: OnboardingChecklistProps) {
  const [open, setOpen] = useState(defaultOpen)
  if (items.length === 0) return null

  return (
    <section
      className={`onboarding-checklist ${compact ? 'onboarding-checklist--compact' : ''}${
        open ? ' is-open' : ' is-collapsed'
      } ${className}`.trim()}
      data-onboarding="checklist"
      aria-label="Что ещё можно заполнить"
    >
      <button
        type="button"
        className="onboarding-checklist__summary"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="onboarding-checklist__summary-label">
          Можно позже · {items.length}
        </span>
        <span className="onboarding-checklist__summary-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open ? (
        <>
          <Text tone="muted" className="onboarding-checklist__intro">
            Уже можно играть. Остальное — по желанию.
          </Text>
          <ul className="onboarding-checklist__list">
            {items.map((item) => (
              <li key={item.id}>
                <span className="onboarding-checklist__label">{item.label}</span>
                <span className="onboarding-checklist__hint">{item.hint}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}
