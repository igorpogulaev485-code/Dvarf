import { Text } from '../../ui'
import { CHECKLIST_ITEMS } from './copy.ru'

type OnboardingChecklistProps = {
  className?: string
  compact?: boolean
}

export function OnboardingChecklist({ className = '', compact = false }: OnboardingChecklistProps) {
  return (
    <section
      className={`onboarding-checklist ${compact ? 'onboarding-checklist--compact' : ''} ${className}`.trim()}
      data-onboarding="checklist"
      aria-label="Что ещё можно заполнить"
    >
      <Text as="h3" className="onboarding-checklist__title">
        Можно позже
      </Text>
      <Text tone="muted" className="onboarding-checklist__intro">
        Уже можно играть. Остальное — по желанию.
      </Text>
      <ul className="onboarding-checklist__list">
        {CHECKLIST_ITEMS.map((item) => (
          <li key={item.id}>
            <span className="onboarding-checklist__label">{item.label}</span>
            <span className="onboarding-checklist__hint">{item.hint}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
