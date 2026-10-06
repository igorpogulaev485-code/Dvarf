import { useMemo, useState } from 'react'
import { Combobox, Field, Panel, Stack, Text, type ComboboxOption } from '../../ui'
import {
  LANGUAGE_PRESETS,
  TOOL_PRESETS,
  addCustomName,
  isNameSelected,
  toggleNameInList,
} from './languagesTools'

type LanguagesToolsPanelProps = {
  languages: string[]
  tools: string[]
  onChange: (patch: { languages?: string[]; tools?: string[] }) => void
}

function MultiSelectPicker({
  title,
  hint,
  presets,
  selected,
  placeholder,
  onAdd,
  onRemove,
}: {
  title: string
  hint: string
  presets: readonly string[]
  selected: string[]
  placeholder: string
  onAdd: (name: string) => void
  onRemove: (name: string) => void
}) {
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
    onAdd(option.label)
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
              onClick={() => onRemove(name)}
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

export function LanguagesToolsPanel({
  languages,
  tools,
  onChange,
}: LanguagesToolsPanelProps) {
  return (
    <Panel title="Языки и инструменты">
      <Stack gap={14}>
        <MultiSelectPicker
          title="Языки"
          hint="Начните вводить — выберите из списка или свой вариант. Плашка снимается кликом."
          presets={LANGUAGE_PRESETS}
          selected={languages}
          placeholder="Найти язык…"
          onAdd={(name) => onChange({ languages: addCustomName(languages, name) })}
          onRemove={(name) => onChange({ languages: toggleNameInList(languages, name) })}
        />
        <MultiSelectPicker
          title="Инструменты"
          hint="Воровские, ремесло, музыка, транспорт — плюс свой текст."
          presets={TOOL_PRESETS}
          selected={tools}
          placeholder="Найти инструмент…"
          onAdd={(name) => onChange({ tools: addCustomName(tools, name) })}
          onRemove={(name) => onChange({ tools: toggleNameInList(tools, name) })}
        />
      </Stack>
    </Panel>
  )
}
