import { useState } from 'react'
import { Button, Field, Input, Panel, Stack, Text } from '../../ui'
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

function ProficiencyPicker({
  title,
  hint,
  presets,
  selected,
  onToggle,
  onAddCustom,
}: {
  title: string
  hint: string
  presets: readonly string[]
  selected: string[]
  onToggle: (name: string) => void
  onAddCustom: (name: string) => void
}) {
  const [custom, setCustom] = useState('')
  const customExtras = selected.filter(
    (name) => !presets.some((preset) => preset.toLowerCase() === name.toLowerCase()),
  )

  return (
    <div>
      <Text tone="muted">{title}</Text>
      <Text tone="muted">{hint}</Text>
      <div className="chip-row" style={{ marginTop: 8 }}>
        {presets.map((name) => (
          <button
            key={name}
            type="button"
            className={`sheet-chip${isNameSelected(selected, name) ? ' is-on' : ''}`}
            onClick={() => onToggle(name)}
          >
            {name}
          </button>
        ))}
        {customExtras.map((name) => (
          <button
            key={name}
            type="button"
            className="sheet-chip is-on"
            onClick={() => onToggle(name)}
            title="Свой пункт — клик снять"
          >
            {name}
          </button>
        ))}
      </div>
      <div className="languages-tools-add" style={{ marginTop: 10 }}>
        <Field label="Свой вариант">
          <Input
            value={custom}
            placeholder="Название…"
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              onAddCustom(custom)
              setCustom('')
            }}
          />
        </Field>
        <Button
          type="button"
          variant="secondary"
          disabled={!custom.trim()}
          onClick={() => {
            onAddCustom(custom)
            setCustom('')
          }}
        >
          Добавить
        </Button>
      </div>
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
        <ProficiencyPicker
          title="Языки"
          hint="Чипы вкл/выкл. Общий часто дают расой — отметь, если есть."
          presets={LANGUAGE_PRESETS}
          selected={languages}
          onToggle={(name) => onChange({ languages: toggleNameInList(languages, name) })}
          onAddCustom={(name) => onChange({ languages: addCustomName(languages, name) })}
        />
        <ProficiencyPicker
          title="Инструменты"
          hint="Воровские, ремесло, музыка, транспорт — плюс свой текст."
          presets={TOOL_PRESETS}
          selected={tools}
          onToggle={(name) => onChange({ tools: toggleNameInList(tools, name) })}
          onAddCustom={(name) => onChange({ tools: addCustomName(tools, name) })}
        />
      </Stack>
    </Panel>
  )
}
