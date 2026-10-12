import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Field, Input, Text } from '../../ui'

export type CatalogCardItem = {
  id: string
  title: string
  subtitle?: string
  source?: string | null
  disabled?: boolean
}

type CatalogCardListProps = {
  items: CatalogCardItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  emptyText?: string
  /** Show name search + source chips. Default true. */
  enableFilters?: boolean
  searchPlaceholder?: string
  /**
   * When this changes (create-pipeline step), clear search + source filters.
   * Prefer passing the pipeline step id from the parent.
   */
  resetToken?: string | number
  /**
   * Detail panel rendered directly under the selected card (mobile).
   * Hidden on ≥861px via CSS; desktop keeps the side detail column.
   */
  selectedDetail?: ReactNode
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

export function CatalogCardList({
  items,
  selectedId,
  onSelect,
  emptyText = 'Ничего не найдено',
  enableFilters = true,
  searchPlaceholder = 'Поиск по имени…',
  resetToken,
  selectedDetail,
}: CatalogCardListProps) {
  const [query, setQuery] = useState('')
  const [sources, setSources] = useState<string[]>([])
  const selectedAnchorRef = useRef<HTMLLIElement | null>(null)

  useEffect(() => {
    if (resetToken === undefined) return
    setQuery('')
    setSources([])
  }, [resetToken])

  useEffect(() => {
    if (!selectedId || !selectedDetail) return
    const node = selectedAnchorRef.current
    if (!node) return
    // Keep selection + inline detail in view on phone after tap.
    const frame = window.requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selectedId, selectedDetail])

  const sourceOptions = useMemo(() => {
    const set = new Set<string>()
    for (const item of items) {
      const src = item.source?.trim()
      if (src) set.add(src)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ru'))
  }, [items])

  const filtered = useMemo(() => {
    const q = normalize(query)
    return items.filter((item) => {
      if (sources.length > 0) {
        const src = item.source?.trim() ?? ''
        if (!sources.includes(src)) return false
      }
      if (!q) return true
      const hay = `${item.title} ${item.subtitle ?? ''} ${item.source ?? ''}`
      return normalize(hay).includes(q)
    })
  }, [items, query, sources])

  function toggleSource(source: string) {
    setSources((prev) =>
      prev.includes(source) ? prev.filter((row) => row !== source) : [...prev, source],
    )
  }

  return (
    <div className="create-pipeline__catalog-list">
      {enableFilters ? (
        <div className="create-pipeline__filters">
          <Field label="Поиск">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </Field>
          {sourceOptions.length > 0 ? (
            <div className="create-pipeline__source-chips" role="group" aria-label="Источники">
              {sourceOptions.map((source) => {
                const active = sources.includes(source)
                return (
                  <button
                    key={source}
                    type="button"
                    className={
                      active
                        ? 'create-pipeline__chip create-pipeline__chip--active'
                        : 'create-pipeline__chip'
                    }
                    onClick={() => toggleSource(source)}
                  >
                    {source}
                  </button>
                )
              })}
              {sources.length > 0 ? (
                <button
                  type="button"
                  className="create-pipeline__chip create-pipeline__chip--clear"
                  onClick={() => setSources([])}
                >
                  Все
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!filtered.length ? (
        <Text tone="muted">{emptyText}</Text>
      ) : (
        <ul className="create-pipeline__card-list">
          {filtered.map((item) => {
            const selected = item.id === selectedId
            return (
              <li
                key={item.id}
                ref={selected ? selectedAnchorRef : undefined}
                className={
                  selected
                    ? 'create-pipeline__card-item create-pipeline__card-item--selected'
                    : 'create-pipeline__card-item'
                }
              >
                <button
                  type="button"
                  className={
                    selected
                      ? 'create-pipeline__card create-pipeline__card--selected'
                      : 'create-pipeline__card'
                  }
                  disabled={item.disabled}
                  onClick={() => onSelect(item.id)}
                >
                  <span className="create-pipeline__card-title">{item.title}</span>
                  {item.subtitle ? (
                    <span className="create-pipeline__card-sub">{item.subtitle}</span>
                  ) : null}
                  {item.source ? (
                    <span className="create-pipeline__card-source">{item.source}</span>
                  ) : null}
                </button>
                {selected && selectedDetail ? (
                  <div className="create-pipeline__inline-detail">{selectedDetail}</div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
