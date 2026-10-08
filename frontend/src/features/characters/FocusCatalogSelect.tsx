import { useEffect, useMemo, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { Field, Input, Text } from '../../ui'
import {
  applyFocusSelectionToItemFields,
  focusOptionsFromCatalog,
  selectionFromCatalogOption,
  selectionFromCustomName,
  type FocusSelection,
} from './focusCatalog'
import {
  FOCUS_KIND_LABEL_RU,
  type FocusKind,
} from './spellFocus'

type FocusCatalogSelectProps = {
  edition: RulesEdition
  /** Limit options to a PHB family; `any` = all focuses. */
  family: FocusKind
  /** Current selection (controlled). */
  value: FocusSelection | null
  onChange: (selection: FocusSelection) => void
  label?: string
  /** Allow picking family when family prop is `any`. */
  allowFamilyPick?: boolean
}

const CUSTOM_VALUE = '__custom__'

export function FocusCatalogSelect({
  edition,
  family,
  value,
  onChange,
  label = 'Фокус из справочника',
  allowFamilyPick = false,
}: FocusCatalogSelectProps) {
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [familyPick, setFamilyPick] = useState<FocusKind>(family)
  const [customName, setCustomName] = useState(value?.custom ? value.name : '')

  useEffect(() => {
    setFamilyPick(family)
  }, [family])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listCatalogEntries({ kind: 'item', edition })
      .then((rows) => {
        if (!cancelled) setEntries(rows)
      })
      .catch(() => {
        if (!cancelled) setEntries([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [edition])

  const effectiveFamily = allowFamilyPick ? familyPick : family
  const options = useMemo(
    () => focusOptionsFromCatalog(entries, effectiveFamily),
    [entries, effectiveFamily],
  )

  const selectValue = value?.custom
    ? CUSTOM_VALUE
    : value?.catalog_id && options.some((row) => row.catalog_id === value.catalog_id)
      ? value.catalog_id
      : value?.name
        ? options.find((row) => row.name_ru === value.name)?.catalog_id ?? ''
        : ''

  return (
    <div className="focus-catalog-select">
      {allowFamilyPick ? (
        <Field label="Семья фокуса">
          <select
            className="play-select"
            value={familyPick}
            onChange={(event) => {
              const next = event.target.value as FocusKind
              setFamilyPick(next)
              if (value?.custom) {
                onChange(selectionFromCustomName(value.name, next))
              }
            }}
          >
            {(Object.keys(FOCUS_KIND_LABEL_RU) as FocusKind[]).map((key) => (
              <option key={key} value={key}>
                {FOCUS_KIND_LABEL_RU[key]}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field label={label} hint="Строки из справочника снаряжения">
        <select
          className="play-select"
          disabled={loading}
          value={selectValue}
          onChange={(event) => {
            const next = event.target.value
            if (next === CUSTOM_VALUE) {
              const sel = selectionFromCustomName(
                customName || 'Свой фокус',
                effectiveFamily,
              )
              setCustomName(sel.name)
              onChange(sel)
              return
            }
            const hit = options.find((row) => row.catalog_id === next)
            if (hit) onChange(selectionFromCatalogOption(hit))
          }}
        >
          <option value="">{loading ? 'Загружаю…' : '— выбрать —'}</option>
          {options.map((row) => (
            <option key={row.catalog_id} value={row.catalog_id}>
              {row.name_ru}
              {row.cost_gp != null ? ` · ${row.cost_gp} зм` : ''}
              {row.weight_lb != null ? ` · ${row.weight_lb} фнт` : ''}
            </option>
          ))}
          <option value={CUSTOM_VALUE}>Своё название…</option>
        </select>
      </Field>

      {value?.custom ? (
        <Field label="Как выглядит" hint="Цена 0 зм · вес 1 фнт">
          <Input
            value={customName}
            placeholder="Например: глаз бехолдера"
            onChange={(event) => {
              const name = event.target.value
              setCustomName(name)
              onChange(selectionFromCustomName(name, effectiveFamily))
            }}
          />
        </Field>
      ) : null}

      {value && !value.custom ? (
        <Text tone="muted">
          {applyFocusSelectionToItemFields(value).name}
          {value.cost_gp != null ? ` · ${value.cost_gp} зм` : ''}
          {value.weight_lb != null ? ` · ${value.weight_lb} фнт` : ''}
        </Text>
      ) : null}
    </div>
  )
}
