import type { ReactNode } from 'react'
import { Text } from './Text'

export type BarChartItem = {
  /** Подпись под столбцом (короткая, например «16.11»). */
  label: string
  value: number
  /** Полная подпись для title/aria, если нужна. */
  title?: string
}

type BarChartProps = {
  items: BarChartItem[]
  /** Высота области столбцов в px. */
  height?: number
  emptyLabel?: string
  /** Подпись легенды / серии над графиком. */
  caption?: ReactNode
  className?: string
}

/**
 * Минимальные столбцы UI-кита (ADM-03).
 * Горизонтальная прокрутка внутри рамки — страница не уезжает вбок на 390.
 */
export function BarChart({
  items,
  height = 120,
  emptyLabel = 'Пока нет данных',
  caption,
  className = '',
}: BarChartProps) {
  const max = Math.max(0, ...items.map((item) => item.value))
  const safeMax = max > 0 ? max : 1

  return (
    <div className={`ui-bar-chart ${className}`.trim()}>
      {caption ? (
        <div className="ui-bar-chart__caption">
          <Text tone="muted">{caption}</Text>
        </div>
      ) : null}
      {items.length === 0 ? (
        <Text tone="muted">{emptyLabel}</Text>
      ) : (
        <div className="ui-bar-chart__scroll" role="img" aria-label="Столбцы по дням">
          <div className="ui-bar-chart__row" style={{ minHeight: height }}>
            {items.map((item, index) => {
              const ratio = Math.max(0, Math.min(1, item.value / safeMax))
              const barH = Math.round(ratio * (height - 28))
              return (
                <div
                  key={`${item.label}-${index}`}
                  className="ui-bar-chart__col"
                  title={item.title ?? `${item.label}: ${item.value}`}
                >
                  <span className="ui-bar-chart__value" aria-hidden>
                    {item.value > 0 ? item.value : ''}
                  </span>
                  <span
                    className="ui-bar-chart__bar"
                    style={{ height: `${Math.max(item.value > 0 ? 4 : 0, barH)}px` }}
                    aria-hidden
                  />
                  <span className="ui-bar-chart__label">{item.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
