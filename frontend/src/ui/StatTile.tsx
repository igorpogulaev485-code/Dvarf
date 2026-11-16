import type { ReactNode } from 'react'

type StatTileProps = {
  /** Крупное число (или короткая строка). */
  value: ReactNode
  /** Мелкая подпись под числом. */
  label: ReactNode
  className?: string
}

/**
 * Плитка метрики (ADM-03): число крупно, подпись мелко.
 * Стили `.ui-stat-tile*` в `01-tokens-base.css`.
 */
export function StatTile({ value, label, className = '' }: StatTileProps) {
  return (
    <div className={`ui-stat-tile ${className}`.trim()}>
      <div className="ui-stat-tile__value">{value}</div>
      <div className="ui-stat-tile__label">{label}</div>
    </div>
  )
}
