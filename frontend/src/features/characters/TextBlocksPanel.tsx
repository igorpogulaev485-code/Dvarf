import {
  Button,
  Field,
  Input,
  NumberInput,
  Panel,
  SlotPips,
  Stack,
  Text,
} from '../../ui'
import type { ResourceReset, SheetResource } from '../../shared/dnd/rest'
import { createResource, RESET_LABELS } from './play'
import {
  createCustomTextBlock,
  displayLabel,
  moveTextBlock,
  type TextBlock,
} from './textBlocks'

type TextBlocksPanelProps = {
  blocks: TextBlock[]
  onChange: (blocks: TextBlock[]) => void
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
}

const RESET_OPTIONS: ResourceReset[] = ['short', 'long', 'manual']

export function TextBlocksPanel({
  blocks,
  onChange,
  resources,
  onResourcesChange,
}: TextBlocksPanelProps) {
  const linkedIds = new Set(
    blocks.map((block) => block.resourceId).filter((id): id is string => Boolean(id)),
  )
  const orphanResources = resources.filter((item) => !linkedIds.has(item.id))

  function updateBlock(key: string, patch: Partial<TextBlock>) {
    onChange(blocks.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function updateResource(id: string, patch: Partial<SheetResource>) {
    onResourcesChange(
      resources.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  function removeResource(id: string) {
    onResourcesChange(resources.filter((item) => item.id !== id))
    onChange(
      blocks.map((block) =>
        block.resourceId === id ? { ...block, resourceId: null } : block,
      ),
    )
  }

  function attachResource(block: TextBlock) {
    const resource = createResource({
      name: displayLabel(block),
      max: 1,
      used: 0,
      reset: 'long',
    })
    onResourcesChange([...resources, resource])
    updateBlock(block.key, { resourceId: resource.id })
  }

  function detachResource(block: TextBlock) {
    if (!block.resourceId) return
    removeResource(block.resourceId)
  }

  function linkOrphanToBlock(resourceId: string, blockKey: string) {
    const target = blocks.find((item) => item.key === blockKey)
    if (!target) return
    // Drop previous link on target if any
    if (target.resourceId && target.resourceId !== resourceId) {
      onResourcesChange(resources.filter((item) => item.id !== target.resourceId))
    }
    onChange(
      blocks.map((block) => {
        if (block.key === blockKey) return { ...block, resourceId }
        if (block.resourceId === resourceId) return { ...block, resourceId: null }
        return block
      }),
    )
  }

  function renderMoveActions(block: TextBlock, index: number) {
    return (
      <div className="text-block__move">
        <Button
          variant="ghost"
          disabled={index === 0}
          aria-label={`Переместить «${displayLabel(block)}» выше`}
          onClick={() => onChange(moveTextBlock(blocks, block.key, 'up'))}
        >
          ↑
        </Button>
        <Button
          variant="ghost"
          disabled={index === blocks.length - 1}
          aria-label={`Переместить «${displayLabel(block)}» ниже`}
          onClick={() => onChange(moveTextBlock(blocks, block.key, 'down'))}
        >
          ↓
        </Button>
      </div>
    )
  }

  function renderResource(block: TextBlock) {
    const resource = block.resourceId
      ? resources.find((item) => item.id === block.resourceId)
      : null

    if (!resource) {
      return (
        <div className="text-block__resource">
          <Button type="button" variant="secondary" onClick={() => attachResource(block)}>
            + пипсы ресурса
          </Button>
        </div>
      )
    }

    return (
      <div className="text-block__resource">
        <div className="text-block__resource-grid">
          <Field label="Ресурс">
            <Input
              value={resource.name}
              onChange={(event) =>
                updateResource(resource.id, { name: event.target.value })
              }
              placeholder={displayLabel(block)}
            />
          </Field>
          <Field label="Макс">
            <NumberInput
              min={0}
              max={20}
              emptyValue={0}
              value={resource.max}
              onValueChange={(value) =>
                updateResource(resource.id, {
                  max: value ?? 0,
                  used: Math.min(resource.used, value ?? 0),
                })
              }
            />
          </Field>
        </div>
        <SlotPips
          max={resource.max}
          used={resource.used}
          fillMode="available"
          label="Доступно"
          summary={`${Math.max(0, resource.max - resource.used)} / ${resource.max}`}
          onChange={(used) => updateResource(resource.id, { used })}
        />
        <div className="text-block__resource-meta">
          <label className="play-resource__reset">
            Сброс
            <select
              value={resource.reset}
              onChange={(event) =>
                updateResource(resource.id, {
                  reset: event.target.value as ResourceReset,
                })
              }
            >
              {RESET_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {RESET_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="linkish"
            onClick={() => detachResource(block)}
          >
            Убрать пипсы
          </button>
        </div>
      </div>
    )
  }

  return (
    <Panel title="Тексты и заметки">
      <Stack gap={14}>
        <Text tone="muted">
          Блоки можно переименовать, скрыть, добавить и менять местами. Пипсы ресурса (ярость, ки…) —
          внутри блока, как в ЛСС.
        </Text>

        {orphanResources.length > 0 ? (
          <div className="text-block__orphans">
            <Text>
              <strong>Ресурсы без блока</strong>
            </Text>
            <Text tone="muted">
              Остались от старого списка. Привяжи к блоку или удали.
            </Text>
            {orphanResources.map((resource) => (
              <div key={resource.id} className="text-block__orphan">
                <SlotPips
                  max={resource.max}
                  used={resource.used}
                  fillMode="available"
                  label={resource.name || 'Ресурс'}
                  summary={`${Math.max(0, resource.max - resource.used)} / ${resource.max}`}
                  onChange={(used) => updateResource(resource.id, { used })}
                />
                <div className="text-block__orphan-actions">
                  <select
                    className="play-select"
                    defaultValue=""
                    aria-label={`Привязать «${resource.name || 'ресурс'}» к блоку`}
                    onChange={(event) => {
                      const key = event.target.value
                      if (!key) return
                      linkOrphanToBlock(resource.id, key)
                      event.target.value = ''
                    }}
                  >
                    <option value="">В блок…</option>
                    {blocks
                      .filter((block) => !block.isHidden)
                      .map((block) => (
                        <option key={block.key} value={block.key}>
                          {displayLabel(block)}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => removeResource(resource.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {blocks.map((block, index) => {
          if (block.isHidden) {
            return (
              <div key={block.key} className="text-block text-block--hidden">
                <div className="text-block__header">
                  <Text tone="muted">{displayLabel(block)} · скрыт</Text>
                  <div className="text-block__actions">
                    {renderMoveActions(block, index)}
                    <Button
                      variant="ghost"
                      onClick={() => updateBlock(block.key, { isHidden: false })}
                    >
                      Показать
                    </Button>
                  </div>
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
                  {renderMoveActions(block, index)}
                  <Button variant="ghost" onClick={() => updateBlock(block.key, { isHidden: true })}>
                    Скрыть
                  </Button>
                  {block.isCustom ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (block.resourceId) {
                          onResourcesChange(
                            resources.filter((item) => item.id !== block.resourceId),
                          )
                        }
                        onChange(blocks.filter((item) => item.key !== block.key))
                      }}
                    >
                      Удалить
                    </Button>
                  ) : null}
                </div>
              </div>
              {renderResource(block)}
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
