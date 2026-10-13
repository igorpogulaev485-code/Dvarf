import { useMemo, useState } from 'react'
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

type TextFilter = 'all' | 'personality' | 'features' | 'notes' | 'resource' | 'hidden'

const FILTERS: Array<{ id: TextFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'personality', label: 'Личность' },
  { id: 'features', label: 'Умения' },
  { id: 'notes', label: 'Заметки' },
  { id: 'resource', label: 'С ресурсом' },
  { id: 'hidden', label: 'Скрытые' },
]

const PERSONALITY_KEYS = new Set([
  'personality',
  'ideals',
  'bonds',
  'flaws',
  'appearance',
  'background',
  'quests',
])

const FEATURE_KEYS = new Set(['traits', 'features', 'feats'])

function previewText(value: string, max = 110): string {
  const flat = value.replace(/\s+/g, ' ').trim()
  if (!flat) return ''
  if (flat.length <= max) return flat
  return `${flat.slice(0, max - 1)}…`
}

function blockBucket(block: TextBlock): 'personality' | 'features' | 'notes' {
  if (block.isCustom) return 'notes'
  if (PERSONALITY_KEYS.has(block.key)) return 'personality'
  if (FEATURE_KEYS.has(block.key)) return 'features'
  return 'notes'
}

function roleLabel(block: TextBlock): string {
  const bucket = blockBucket(block)
  if (bucket === 'personality') return 'Личность'
  if (bucket === 'features') return 'Умения'
  return 'Заметка'
}

function IconPlus() {
  return (
    <svg className="inventory-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg className="inventory-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-7 0 1 12h6l1-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TextBlocksPanel({
  blocks,
  onChange,
  resources,
  onResourcesChange,
}: TextBlocksPanelProps) {
  const [filter, setFilter] = useState<TextFilter>('all')
  /** Accordion: at most one block detail open. */
  const [openKey, setOpenKey] = useState<string | null>(null)

  const linkedIds = new Set(
    blocks.map((block) => block.resourceId).filter((id): id is string => Boolean(id)),
  )
  const orphanResources = resources.filter((item) => !linkedIds.has(item.id))

  const visibleBlocks = useMemo(() => {
    return blocks.filter((block) => {
      if (filter === 'all') return !block.isHidden
      if (filter === 'hidden') return block.isHidden
      if (filter === 'resource') return Boolean(block.resourceId) && !block.isHidden
      if (filter === 'personality') {
        return !block.isHidden && blockBucket(block) === 'personality'
      }
      if (filter === 'features') {
        return !block.isHidden && blockBucket(block) === 'features'
      }
      return !block.isHidden && blockBucket(block) === 'notes'
    })
  }, [blocks, filter])

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

  function toggleDetails(key: string) {
    setOpenKey((prev) => {
      const next = prev === key ? null : key
      if (next) {
        window.requestAnimationFrame(() => {
          document
            .getElementById(`text-block-${next}`)
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        })
      }
      return next
    })
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

  function renderBlockCard(block: TextBlock, index: number) {
    const label = displayLabel(block)
    const bucket = blockBucket(block)
    const role = roleLabel(block)
    const preview = previewText(block.value)
    const filled = Boolean(block.value.trim())
    const detailsOpen = openKey === block.key
    const absoluteIndex = blocks.findIndex((row) => row.key === block.key)

    if (block.isHidden && filter === 'hidden' && !detailsOpen) {
      return (
        <div
          key={block.key}
          id={`text-block-${block.key}`}
          className="text-block text-block--compact text-block--hidden"
        >
          <button
            type="button"
            className="text-block__glance"
            onClick={() => toggleDetails(block.key)}
          >
            <b className="text-block__glance-name">{label}</b>
            <span className={`inventory-role inventory-role--${bucket === 'features' ? 'armor' : bucket === 'personality' ? 'weapon' : 'other'}`}>
              {role}
            </span>
            <span className="attack-held-tag">скрыт</span>
            <span className="inventory-card__glance-spacer" aria-hidden />
            <span className="inventory-card__glance-meta">{filled ? 'есть текст' : 'пусто'}</span>
          </button>
          <div className="inventory-card__glance-actions">
            <button
              type="button"
              className="inventory-equip is-on"
              onClick={() => updateBlock(block.key, { isHidden: false })}
            >
              Показать
            </button>
            <button
              type="button"
              className="inventory-card__chevron-btn"
              aria-label="Подробнее"
              onClick={() => toggleDetails(block.key)}
            >
              ›
            </button>
          </div>
        </div>
      )
    }

    if (!detailsOpen) {
      return (
        <div
          key={block.key}
          id={`text-block-${block.key}`}
          className={`text-block text-block--compact${filled ? '' : ' text-block--empty'}`}
        >
          <button
            type="button"
            className="text-block__glance"
            onClick={() => toggleDetails(block.key)}
          >
            <b className="text-block__glance-name">{label}</b>
            <span
              className={`inventory-role inventory-role--${
                bucket === 'features' ? 'armor' : bucket === 'personality' ? 'weapon' : 'other'
              }`}
            >
              {role}
            </span>
            {block.resourceId ? <span className="attack-held-tag is-on">ресурс</span> : null}
            <span className="inventory-card__glance-spacer" aria-hidden />
            <span className="text-block__glance-preview">
              {preview || 'пусто — нажми, чтобы заполнить'}
            </span>
          </button>
          <div className="inventory-card__glance-actions">
            <button
              type="button"
              className="inventory-card__chevron-btn"
              aria-label="Подробнее"
              onClick={() => toggleDetails(block.key)}
            >
              ›
            </button>
          </div>
        </div>
      )
    }

    return (
      <div
        key={block.key}
        id={`text-block-${block.key}`}
        className={`text-block text-block--expand${
          block.isHidden ? ' text-block--hidden' : ''
        }`}
      >
        <div className="text-block__meta">
          <span
            className={`inventory-role inventory-role--${
              bucket === 'features' ? 'armor' : bucket === 'personality' ? 'weapon' : 'other'
            }`}
          >
            {role}
          </span>
          {block.resourceId ? <span className="attack-held-tag is-on">ресурс</span> : null}
          {block.isHidden ? <span className="attack-held-tag">скрыт</span> : null}
          <button
            type="button"
            className="inventory-card__collapse"
            onClick={() => toggleDetails(block.key)}
          >
            свернуть
          </button>
        </div>

        <div className="text-block__header">
          <Field label="Заголовок блока">
            <Input
              className="text-block__title-input"
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
            {renderMoveActions(block, absoluteIndex >= 0 ? absoluteIndex : index)}
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

        <div className="inventory-card__footer">
          {block.isHidden ? (
            <button
              type="button"
              className="inventory-equip is-on"
              onClick={() => updateBlock(block.key, { isHidden: false })}
            >
              Показать
            </button>
          ) : (
            <button
              type="button"
              className="inventory-action"
              onClick={() => updateBlock(block.key, { isHidden: true })}
            >
              Скрыть
            </button>
          )}
          {block.isCustom ? (
            <button
              type="button"
              className="inventory-action inventory-action--danger"
              onClick={() => {
                if (block.resourceId) {
                  onResourcesChange(
                    resources.filter((item) => item.id !== block.resourceId),
                  )
                }
                onChange(blocks.filter((item) => item.key !== block.key))
              }}
            >
              <IconTrash />
              Удалить
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <Panel title="Тексты и заметки" className="text-panel">
      <Stack gap={12}>
        <Text tone="muted">
          Сцена Общение: личность и заметки. Строка — превью; клик — правка (одна открыта).
        </Text>

        <div className="inventory-panel__toolbar">
          <Button
            variant="secondary"
            className="inventory-toolbar-btn"
            onClick={() => {
              const next = createCustomTextBlock(blocks)
              onChange([...blocks, next])
              setFilter('notes')
              setOpenKey(next.key)
            }}
          >
            <IconPlus />
            Добавить блок
          </Button>
        </div>

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

        <div className="inventory-filters" role="tablist" aria-label="Фильтр текстов">
          {FILTERS.map((row) => (
            <button
              key={row.id}
              type="button"
              role="tab"
              aria-selected={filter === row.id}
              className={`inventory-filter${filter === row.id ? ' is-on' : ''}`}
              onClick={() => setFilter(row.id)}
            >
              {row.label}
            </button>
          ))}
        </div>

        <Stack gap={10}>
          {visibleBlocks.length === 0 ? (
            <Text tone="muted">
              {filter === 'all'
                ? 'Нет видимых блоков — добавь заметку или покажи скрытые.'
                : 'Нет блоков в этом фильтре.'}
            </Text>
          ) : null}
          {visibleBlocks.map((block, index) => renderBlockCard(block, index))}
        </Stack>
      </Stack>
    </Panel>
  )
}
