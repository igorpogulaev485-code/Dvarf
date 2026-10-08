import { useEffect, useMemo, useState } from 'react'
import {
  listCatalogEntries,
  type CatalogEntry,
  type CatalogKind,
} from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { Combobox, type ComboboxOption } from '../../ui/Combobox'

type CatalogComboboxProps = {
  id?: string
  kind?: CatalogKind
  kinds?: CatalogKind[]
  edition: RulesEdition
  value: string
  placeholder?: string
  disabled?: boolean
  /** Limit list to children of this catalog parent (e.g. subclasses of a class). */
  parentId?: string | null
  optionLabel?: (entry: CatalogEntry) => string
  /** Keep only matching catalog rows in the dropdown. */
  filterEntry?: (entry: CatalogEntry) => boolean
  onChange: (value: string, selected: CatalogEntry | null) => void
}

function kindLabel(kind: CatalogKind): string {
  if (kind === 'weapon') return 'оружие'
  if (kind === 'item') return 'артефакт'
  if (kind === 'bestiary') return 'бестиарий'
  return kind
}

/**
 * Prefer the requested rules edition; collapse same-name rows across editions
 * (e.g. class «Плут» 2014 + 2024) so the dropdown never shows twins.
 */
function dedupeCatalogEntries(
  entries: CatalogEntry[],
  edition: RulesEdition,
): CatalogEntry[] {
  const bySlug = new Map<string, CatalogEntry>()
  for (const item of entries) {
    const key = `${item.kind}:${item.slug}`
    const prev = bySlug.get(key)
    if (!prev) {
      bySlug.set(key, item)
      continue
    }
    const prevExact = prev.rules_edition === edition
    const nextExact = item.rules_edition === edition
    if (nextExact && !prevExact) bySlug.set(key, item)
  }

  const byName = new Map<string, CatalogEntry>()
  for (const item of bySlug.values()) {
    const key = `${item.kind}:${item.name_ru.trim().toLowerCase()}`
    const prev = byName.get(key)
    if (!prev) {
      byName.set(key, item)
      continue
    }
    const prevExact = prev.rules_edition === edition
    const nextExact = item.rules_edition === edition
    if (nextExact && !prevExact) byName.set(key, item)
  }

  return [...byName.values()]
}

export function CatalogCombobox({
  id,
  kind,
  kinds,
  edition,
  value,
  placeholder,
  disabled,
  parentId,
  optionLabel,
  filterEntry,
  onChange,
}: CatalogComboboxProps) {
  const [options, setOptions] = useState<ComboboxOption[]>([])
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState(value)
  const kindsKey = (kinds ?? (kind ? [kind] : [])).join(',')
  const resolvedKinds = useMemo(
    () => kindsKey.split(',').filter(Boolean) as CatalogKind[],
    [kindsKey],
  )

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      Promise.all(
        resolvedKinds.map((entryKind) =>
          listCatalogEntries({
            kind: entryKind,
            edition,
            q: query || undefined,
            parentId: parentId || undefined,
          }),
        ),
      )
        .then((groups) => {
          if (!active) return
          const filtered = groups
            .flat()
            .filter((item) => (filterEntry ? filterEntry(item) : true))
          const items = dedupeCatalogEntries(filtered, edition).sort((a, b) => {
            if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
            return a.name_ru.localeCompare(b.name_ru, 'ru')
          })
          setEntries(items)
          setOptions(
            items.map((item) => ({
              id: item.id,
              label:
                optionLabel?.(item) ??
                (resolvedKinds.length > 1
                  ? `${item.name_ru} · ${kindLabel(item.kind)}`
                  : item.name_ru),
            })),
          )
        })
        .catch(() => {
          if (!active) return
          setEntries([])
          setOptions([])
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 180)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [edition, filterEntry, optionLabel, parentId, query, resolvedKinds])

  return (
    <Combobox
      id={id}
      value={value}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      loading={loading}
      onChange={(next) => {
        const match =
          entries.find((item) => item.name_ru.toLowerCase() === next.trim().toLowerCase()) ?? null
        onChange(next, match)
      }}
      onSelectOption={(option) => {
        const entry = entries.find((item) => item.id === option.id) ?? null
        onChange(entry?.name_ru ?? option.label, entry)
      }}
      onQueryChange={setQuery}
    />
  )
}
