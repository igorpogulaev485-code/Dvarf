import { useEffect, useMemo, useState } from 'react'
import {
  getCatalogEntry,
  listCatalogEntries,
  type CatalogEntry,
  type CatalogEntryListItem,
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
  optionLabel?: (entry: CatalogEntryListItem) => string
  onChange: (value: string, selected: CatalogEntry | null) => void
}

function kindLabel(kind: CatalogKind): string {
  if (kind === 'weapon') return 'оружие'
  if (kind === 'item') return 'артефакт'
  if (kind === 'armor') return 'доспех'
  return kind
}

const SEARCH_LIMIT = 40
const MIN_QUERY_LEN = 2

export function CatalogCombobox({
  id,
  kind,
  kinds,
  edition,
  value,
  placeholder,
  disabled,
  optionLabel,
  onChange,
}: CatalogComboboxProps) {
  const [options, setOptions] = useState<ComboboxOption[]>([])
  const [entries, setEntries] = useState<CatalogEntryListItem[]>([])
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
    const trimmed = query.trim()

    if (trimmed.length < MIN_QUERY_LEN) {
      setEntries([])
      setOptions([])
      setLoading(false)
      return () => {
        active = false
      }
    }

    const timer = window.setTimeout(() => {
      setLoading(true)
      Promise.all(
        resolvedKinds.map((entryKind) =>
          listCatalogEntries({
            kind: entryKind,
            edition,
            q: trimmed,
            limit: SEARCH_LIMIT,
          }),
        ),
      )
        .then((groups) => {
          if (!active) return
          const items = groups.flat().sort((a, b) => {
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
    }, 220)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [edition, optionLabel, query, resolvedKinds])

  return (
    <Combobox
      id={id}
      value={value}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      loading={loading}
      onChange={(next) => {
        onChange(next, null)
      }}
      onSelectOption={(option) => {
        const listItem = entries.find((item) => item.id === option.id) ?? null
        const label = listItem?.name_ru ?? option.label
        onChange(label, null)
        void getCatalogEntry(option.id)
          .then((full) => {
            onChange(full.name_ru, full)
          })
          .catch(() => {
            onChange(label, null)
          })
      }}
      onQueryChange={setQuery}
    />
  )
}
