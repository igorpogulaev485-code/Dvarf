import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Text } from './Text'

export type BarChartItem = {
  /** Подпись под столбцом (короткая, например «16.11»). */
  label: string
  value: number
  /** Полная подпись для подсказки, например «16.11 — 3 регистрации». */
  title?: string
}

type BarChartProps = {
  items: BarChartItem[]
  /** Высота области столбцов в px. */
  height?: number
  emptyLabel?: string
  /** Подпись легенды / серии над графиком. */
  caption?: ReactNode
  /** Подпись итога (по умолчанию «Итого за 30 дней»). */
  totalLabel?: string
  /**
   * Как часто показывать подпись даты: `auto` — все при ≤14, иначе первая/последняя/каждая 5-я.
   * Число — шаг (1 = все).
   */
  labelEvery?: number | 'auto'
  className?: string
}

function shouldShowLabel(
  index: number,
  total: number,
  labelEvery: number | 'auto',
): boolean {
  if (total <= 0) return false
  if (labelEvery === 'auto') {
    if (total <= 14) return true
    return index === 0 || index === total - 1 || index % 5 === 0
  }
  const step = Math.max(1, Math.floor(labelEvery))
  return index === 0 || index === total - 1 || index % step === 0
}

/**
 * Столбцы UI-кита (ADM-03 / ADM-08).
 * Итог и максимум над рядом; подсказка по наведению / тапу.
 * 30 дней умещаются в ширину рамки (подписи разрежены); без горизонтального обрезания.
 */
export function BarChart({
  items,
  height = 120,
  emptyLabel = 'Пока нет данных',
  caption,
  totalLabel = 'Итого за 30 дней',
  labelEvery = 'auto',
  className = '',
}: BarChartProps) {
  const tipId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const max = Math.max(0, ...items.map((item) => item.value))
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0)
  const safeMax = max > 0 ? max : 1
  const active = activeIndex != null ? items[activeIndex] : null
  const tipText =
    active != null ? (active.title ?? `${active.label}: ${active.value}`) : null

  useEffect(() => {
    if (activeIndex == null) return
    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current
      if (!root) return
      if (event.target instanceof Node && root.contains(event.target)) return
      setActiveIndex(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [activeIndex])

  return (
    <div className={`ui-bar-chart ${className}`.trim()} ref={rootRef}>
      {caption ? (
        <div className="ui-bar-chart__caption">
          <Text tone="muted">{caption}</Text>
        </div>
      ) : null}
      {items.length > 0 ? (
        <div className="ui-bar-chart__meta">
          <Text tone="muted">
            {totalLabel}: {total}
          </Text>
          <Text tone="muted" className="ui-bar-chart__max">
            Макс.: {max}
          </Text>
        </div>
      ) : null}
      {items.length === 0 ? (
        <Text tone="muted">{emptyLabel}</Text>
      ) : (
        <div
          className="ui-bar-chart__frame"
          role="img"
          aria-label="Столбцы по дням"
          aria-describedby={tipText ? tipId : undefined}
        >
          <div className="ui-bar-chart__axis" aria-hidden>
            <span>{max > 0 ? max : ''}</span>
            <span>0</span>
          </div>
          <div className="ui-bar-chart__row" style={{ minHeight: height }}>
            {items.map((item, index) => {
              const ratio = Math.max(0, Math.min(1, item.value / safeMax))
              const barH = Math.round(ratio * (height - 28))
              const tip = item.title ?? `${item.label}: ${item.value}`
              const showLabel = shouldShowLabel(index, items.length, labelEvery)
              return (
                <button
                  key={`${item.label}-${index}`}
                  type="button"
                  className={`ui-bar-chart__col${activeIndex === index ? ' is-active' : ''}`}
                  title={tip}
                  aria-label={tip}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex((cur) => (cur === index ? null : cur))}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex((cur) => (cur === index ? null : cur))}
                  onClick={() => setActiveIndex(index)}
                >
                  <span className="ui-bar-chart__value" aria-hidden>
                    {item.value > 0 ? item.value : ''}
                  </span>
                  <span
                    className="ui-bar-chart__bar"
                    style={{ height: `${Math.max(item.value > 0 ? 4 : 0, barH)}px` }}
                    aria-hidden
                  />
                  <span className="ui-bar-chart__label" aria-hidden={!showLabel}>
                    {showLabel ? item.label : ''}
                  </span>
                </button>
              )
            })}
          </div>
          {tipText ? (
            <div id={tipId} className="ui-bar-chart__tip" role="status">
              {tipText}
            </div>
          ) : (
            <div className="ui-bar-chart__tip ui-bar-chart__tip--placeholder" aria-hidden>
              {'\u00a0'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
