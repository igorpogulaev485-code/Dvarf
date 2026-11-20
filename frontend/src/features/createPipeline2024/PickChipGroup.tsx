import { useState } from 'react'
import { Input, Stack, Text, ToggleChip } from '../../ui'

type PickChipGroupProps = {
  label: string
  hint?: string
  options: Array<{ id: string; label: string; rest?: string }>
  selected: string[]
  max: number
  onChange: (next: string[]) => void
  multi?: boolean
  /** Prefix for data-testid on each chip: `p24-m03-pick-<id>`. */
  testIdPrefix?: string
}

const SEARCH_FROM = 12

/** Multi/single select chips for class skills, mastery, nested feat picks, etc. */
export function PickChipGroup({
  label,
  hint,
  options,
  selected,
  max,
  onChange,
  multi = true,
  testIdPrefix = 'p24-m03-pick',
}: PickChipGroupProps) {
  const [query, setQuery] = useState('')
  const searchable = options.length >= SEARCH_FROM
  const q = query.trim().toLowerCase()
  const visible = q
    ? options.filter((opt) => `${opt.label} ${opt.rest ?? ''}`.toLowerCase().includes(q))
    : options
  const dense = options.length >= SEARCH_FROM

  function toggle(id: string) {
    if (!multi || max <= 1) {
      onChange(selected.includes(id) ? [] : [id])
      return
    }
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id))
      return
    }
    if (selected.length >= max) {
      onChange([...selected.slice(1), id])
      return
    }
    onChange([...selected, id])
  }

  return (
    <Stack gap={8}>
      <Text
        as="h3"
        className="create-pipeline__section-title"
        data-testid={
          testIdPrefix === 'p24-m03-pick-mastery'
            ? 'p24-m03-mastery-heading'
            : undefined
        }
      >
        {label}
        {max > 0 ? ` (${selected.length}/${max})` : null}
      </Text>
      {hint ? <Text tone="muted">{hint}</Text> : null}
      {searchable ? (
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск…"
          aria-label={`Поиск: ${label}`}
        />
      ) : null}
      <div
        role="group"
        aria-label={label}
        className={`create-2024__pick-grid${dense ? ' create-2024__pick-grid--dense' : ''}`}
      >
        {visible.map((opt) => (
          <ToggleChip
            key={opt.id}
            main={opt.label}
            rest={opt.rest}
            checked={selected.includes(opt.id)}
            onChange={() => toggle(opt.id)}
            data-testid={`${testIdPrefix}-${opt.id}`}
          />
        ))}
        {visible.length === 0 ? <Text tone="muted">Ничего не найдено</Text> : null}
      </div>
    </Stack>
  )
}
