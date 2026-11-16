import type { ReactNode } from 'react'

type MetricGridProps = {
  /** Подзаголовок группы (например «Аккаунты»). */
  title?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Сетка плиток метрик (ADM-03).
 * 390 → 2 в ряд, ≥960 → 3, ≥1280 → 4. Без page-level CSS.
 */
export function MetricGrid({ title, children, className = '' }: MetricGridProps) {
  return (
    <section className={`ui-metric-grid-block ${className}`.trim()}>
      {title ? <h3 className="ui-metric-grid-block__title">{title}</h3> : null}
      <div className="ui-metric-grid">{children}</div>
    </section>
  )
}
