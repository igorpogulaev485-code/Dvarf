import { Button, Field, Input, Panel, Stack, Text } from '../../ui'
import {
  createCustomTextBlock,
  displayLabel,
  type TextBlock,
} from './textBlocks'

type TextBlocksPanelProps = {
  blocks: TextBlock[]
  onChange: (blocks: TextBlock[]) => void
}

export function TextBlocksPanel({ blocks, onChange }: TextBlocksPanelProps) {
  function updateBlock(key: string, patch: Partial<TextBlock>) {
    onChange(blocks.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  return (
    <Panel title="Тексты и заметки">
      <Stack gap={14}>
        <Text tone="muted">
          Блоки можно переименовать, скрыть или добавить свои — как в LSS. Пока plain text; rich
          editor позже.
        </Text>

        {blocks.map((block) => {
          if (block.isHidden) {
            return (
              <div key={block.key} className="text-block text-block--hidden">
                <div className="text-block__header">
                  <Text tone="muted">{displayLabel(block)} · скрыт</Text>
                  <Button variant="ghost" onClick={() => updateBlock(block.key, { isHidden: false })}>
                    Показать
                  </Button>
                </div>
              </div>
            )
          }

          return (
            <div key={block.key} className="text-block">
              <div className="text-block__header">
                <Field label="Заголовок блока">
                  <Input
                    value={block.customLabel ?? block.defaultLabel}
                    onChange={(event) => {
                      const next = event.target.value
                      updateBlock(block.key, {
                        customLabel:
                          next.trim() === block.defaultLabel.trim() ? null : next,
                      })
                    }}
                  />
                </Field>
                <div className="text-block__actions">
                  <Button variant="ghost" onClick={() => updateBlock(block.key, { isHidden: true })}>
                    Скрыть
                  </Button>
                  {block.isCustom ? (
                    <Button
                      variant="ghost"
                      onClick={() => onChange(blocks.filter((item) => item.key !== block.key))}
                    >
                      Удалить
                    </Button>
                  ) : null}
                </div>
              </div>
              <textarea
                className="ui-input text-block__area"
                rows={5}
                value={block.value}
                placeholder="Текст блока…"
                onChange={(event) => updateBlock(block.key, { value: event.target.value })}
              />
            </div>
          )
        })}

        <div>
          <Button
            variant="secondary"
            onClick={() => onChange([...blocks, createCustomTextBlock(blocks)])}
          >
            Добавить блок
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}
