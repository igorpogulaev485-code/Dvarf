import type { ReactNode } from 'react'
import { HoverTipCard } from './HoverTipCard'
import type { ValueTipCard } from './valueTips.ru'

type ValueTipWrapProps = {
  tip: ValueTipCard
  children: ReactNode
  className?: string
}

/**
 * Wraps content so a rich tip appears on hover/focus — no «?» icon.
 * Prefer putting `<HoverTipCard>` inside the interactive element when
 * layout forbids an extra wrapper (buttons, vitals).
 */
export function ValueTip({ tip, children, className = '' }: ValueTipWrapProps) {
  return (
    <span className={`has-onboarding-tip onboarding-hover-tip ${className}`.trim()}>
      {children}
      <HoverTipCard tip={tip} />
    </span>
  )
}

export { HoverTipCard }
