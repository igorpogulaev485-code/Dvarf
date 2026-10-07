import { useMemo, useState } from 'react'
import { Combobox, Field, Text, type ComboboxOption } from '../../ui'
import {
  addCustomName,
  isNameSelected,
  toggleNameInList,
} from './languagesTools'

type NameListPickerProps = {
  title: string
  hint: string
  presets: readonly string[]
  selected: string[]
  placeholder: string
  onChange: (next: string[]) => void
}

/** Combobox + removable chips — same UX as languages/tools. */
export function NameListPicker({
  title,
  hint,
  presets,
  selected,
  placeholder,
  onChange,
}: NameListPickerProps) {
  const [query, setQuery] = useState('')

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = presets
      .filter((name) => !isNameSelected(selected, name))
      .filter((name) => !q || name.toLowerCase().includes(q))
      .map((name) => ({ id: name, label: name }))

    const custom = query.trim()
    if (
      custom &&
      !isNameSelected(selected, custom) &&
      !filtered.some((option) => option.label.toLowerCase() === custom.toLowerCase())
    ) {
      filtered.push({ id: `custom:${custom}`, label: custom })
    }
    return filtered
  }, [presets, query, selected])

  function pick(option: ComboboxOption) {
    onChange(addCustomName(selected, option.label))
    setQuery('')
  }

  return (
    <div className="multi-pick">
      <Field label={title} hint={hint}>
        <Combobox
          value={query}
          options={options}
          placeholder={placeholder}
          emptyHint="Введите название и выберите его в списке"
          onChange={setQuery}
          onSelectOption={pick}
        />
      </Field>
      {selected.length > 0 ? (
        <div className="tag-row" aria-label={`Выбрано: ${title}`}>
          {selected.map((name) => (
            <button
              key={name}
              type="button"
              className="tag-chip"
              onClick={() => onChange(toggleNameInList(selected, name))}
              title="Убрать"
            >
              <span>{name}</span>
              <span className="tag-chip__x" aria-hidden>
                ×
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Text tone="muted" className="multi-pick__empty">
          Пока не выбрано
        </Text>
      )}
    </div>
  )
}
