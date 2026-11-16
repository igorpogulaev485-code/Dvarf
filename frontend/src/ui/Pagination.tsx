import { useState, type FormEvent } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'
import { Text } from './Text'

export const PAGINATION_PAGE_SIZES = [20, 50, 100] as const

export type PaginationPageSize = (typeof PAGINATION_PAGE_SIZES)[number]

export type PaginationProps = {
  page: number
  totalPages: number
  total: number
  pageSize: number
  pageSizeOptions?: readonly number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  className?: string
}

/** Номера с сокращением: 1 … 4 5 6 … 281 */
export function buildPaginationItems(
  current: number,
  total: number,
): Array<number | 'gap'> {
  if (total <= 0) return []
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }
  const page = Math.min(Math.max(1, current), total)
  const marks = new Set<number>([1, total, page, page - 1, page + 1])
  if (page <= 3) {
    marks.add(2)
    marks.add(3)
    marks.add(4)
  }
  if (page >= total - 2) {
    marks.add(total - 1)
    marks.add(total - 2)
    marks.add(total - 3)
  }
  const sorted = [...marks].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const out: Array<number | 'gap'> = []
  let prev = 0
  for (const n of sorted) {
    if (prev > 0 && n - prev > 1) out.push('gap')
    out.push(n)
    prev = n
  }
  return out
}

/**
 * Пагинатор UI-кита (ADM-08): одна строка на десктопе, компакт на 390.
 * Без page-level CSS — только `.ui-pagination*`.
 */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  pageSizeOptions = PAGINATION_PAGE_SIZES,
  onPageChange,
  onPageSizeChange,
  className = '',
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages)
  const safePage = Math.min(Math.max(1, page), safeTotalPages)
  const items = buildPaginationItems(safePage, safeTotalPages)
  const [jumpDraft, setJumpDraft] = useState('')

  function go(next: number) {
    const clamped = Math.min(Math.max(1, next), safeTotalPages)
    if (clamped !== safePage) onPageChange(clamped)
  }

  function submitJump(event: FormEvent) {
    event.preventDefault()
    const parsed = Number.parseInt(jumpDraft.trim(), 10)
    if (!Number.isFinite(parsed)) return
    go(parsed)
    setJumpDraft('')
  }

  const summary = `Страница ${safePage} из ${safeTotalPages} · всего ${total}`

  return (
    <nav
      className={`ui-pagination ${className}`.trim()}
      aria-label="Страницы списка"
    >
      <Text tone="muted" className="ui-pagination__summary">
        {summary}
      </Text>

      <div className="ui-pagination__row ui-pagination__row--full">
        <Button
          variant="secondary"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => go(1)}
          aria-label="Первая страница"
        >
          «
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => go(safePage - 1)}
        >
          ‹ Назад
        </Button>
        <div className="ui-pagination__pages" role="list">
          {items.map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className="ui-pagination__gap" aria-hidden>
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === safePage ? 'primary' : 'secondary'}
                size="sm"
                aria-current={item === safePage ? 'page' : undefined}
                onClick={() => go(item)}
              >
                {item}
              </Button>
            ),
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={safePage >= safeTotalPages}
          onClick={() => go(safePage + 1)}
        >
          Вперёд ›
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={safePage >= safeTotalPages}
          onClick={() => go(safeTotalPages)}
          aria-label="Последняя страница"
        >
          »
        </Button>
      </div>

      <div className="ui-pagination__row ui-pagination__row--compact">
        <Button
          variant="secondary"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => go(safePage - 1)}
          aria-label="Назад"
        >
          ‹
        </Button>
        <Text className="ui-pagination__compact-label">
          {safePage} / {safeTotalPages}
        </Text>
        <Button
          variant="secondary"
          size="sm"
          disabled={safePage >= safeTotalPages}
          onClick={() => go(safePage + 1)}
          aria-label="Вперёд"
        >
          ›
        </Button>
      </div>

      <div className="ui-pagination__tools">
        <form className="ui-pagination__jump" onSubmit={submitJump}>
          <Text as="span" tone="muted" className="ui-pagination__tools-label">
            Перейти к
          </Text>
          <Input
            id="ui-pagination-jump"
            type="number"
            inputMode="numeric"
            min={1}
            max={safeTotalPages}
            size="sm"
            narrow
            placeholder="№"
            value={jumpDraft}
            onChange={(e) => setJumpDraft(e.target.value)}
            aria-label="Номер страницы"
            className="ui-pagination__jump-input"
          />
          <Button type="submit" variant="secondary" size="sm">
            Перейти
          </Button>
        </form>
        <Text as="span" tone="muted" className="ui-pagination__tools-sep" aria-hidden>
          ·
        </Text>
        <label className="ui-pagination__size" htmlFor="ui-pagination-size">
          <Text as="span" tone="muted" className="ui-pagination__tools-label">
            На странице
          </Text>
          <Select
            id="ui-pagination-size"
            size="sm"
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Размер страницы"
            className="ui-pagination__size-select"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </label>
      </div>
    </nav>
  )
}
