import { Panel, Stack } from '../../ui'
import {
  LANGUAGE_PRESETS,
  TOOL_PRESETS,
} from './languagesTools'
import { NameListPicker } from './NameListPicker'

type LanguagesToolsPanelProps = {
  languages: string[]
  tools: string[]
  onChange: (patch: { languages?: string[]; tools?: string[] }) => void
}

export function LanguagesToolsPanel({
  languages,
  tools,
  onChange,
}: LanguagesToolsPanelProps) {
  return (
    <Panel title="Языки и инструменты">
      <Stack gap={14}>
        <NameListPicker
          title="Языки"
          hint="Начните вводить — выберите из списка или свой вариант. Плашка снимается кликом."
          presets={LANGUAGE_PRESETS}
          selected={languages}
          placeholder="Найти язык…"
          onChange={(next) => onChange({ languages: next })}
        />
        <NameListPicker
          title="Инструменты"
          hint="Воровские, ремесло, музыка, транспорт — плюс свой текст."
          presets={TOOL_PRESETS}
          selected={tools}
          placeholder="Найти инструмент…"
          onChange={(next) => onChange({ tools: next })}
        />
      </Stack>
    </Panel>
  )
}
