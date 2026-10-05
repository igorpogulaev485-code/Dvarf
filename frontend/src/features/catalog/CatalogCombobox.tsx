import { useEffect, useState } from 'react'
import {
  listCatalogEntries,
  type CatalogEntry,
  type CatalogKind,
} from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { Combobox, type ComboboxOption } from '../../ui/Combobox'

type CatalogComboboxProps = {
  id?: string
  kind: CatalogKind
  edition: RulesEdition
  value: string
  placeholder?: string
  disabled?: boolean
  onChange: (value: string, selected: CatalogEntry | null) => void
}

export function CatalogCombobox({
  id,
  kind,
  edition,
  value,
  placeholder,
  disabled,
  onChange,
}: CatalogComboboxProps) {
  const [options, setOptions] = useState<ComboboxOption[]>([])
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState(value)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      listCatalogEntries({ kind, edition, q: query || undefined })
        .then((items) => {
          if (!active) return
          setEntries(items)
          setOptions(items.map((item) => ({ id: item.id, label: item.name_ru })))
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
  }, [kind, edition, query])

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
        onChange(option.label, entry)
      }}
      onQueryChange={setQuery}
    />
  )
}
