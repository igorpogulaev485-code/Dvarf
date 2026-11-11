import { useMemo, useState, type DragEvent as ReactDragEvent } from 'react'
import { HoverTipCard, PANEL_HELP, panelExplain } from '../onboarding'
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
import {
  storeTextBlockFromEditor,
  stripDvarfInternalMarkers,
} from '../../shared/dnd/backgroundGrants'
import { createResource, RESET_LABELS } from './play'
import {
  appendBlockPart,
  blockHasResource,
  createDividerPart,
  createResourcePart,
  createSpoilerPart,
  createTextPart,
  createCustomTextBlock,
  displayLabel,
  listResourceIds,
  moveTextBlockBefore,
  patchBlockPart,
  removeBlockPart,
  updateBlockParts,
  type TextBlock,
  type TextBlockPart,
} from './textBlocks'
import type { PhysiqueFields } from './identity'

type TextBlocksPanelProps = {
  blocks: TextBlock[]
  onChange: (blocks: TextBlock[]) => void
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  /** B10: рост / вес / возраст / глаза / кожа / волосы */
  physique?: PhysiqueFields
  onPhysiqueChange?: (physique: PhysiqueFields) => void
}

const PHYSIQUE_FIELDS: Array<{ key: keyof PhysiqueFields; label: string; placeholder: string }> =
  [
    { key: 'height', label: 'Рост', placeholder: '4 фута' },
    { key: 'weight', label: 'Вес', placeholder: '160 фунтов' },
    { key: 'age', label: 'Возраст', placeholder: '150' },
    { key: 'eyes', label: 'Глаза', placeholder: 'Зелёные' },
    { key: 'skin', label: 'Кожа', placeholder: 'Светлая' },
    { key: 'hair', label: 'Волосы', placeholder: 'Каштановые' },
  ]

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
  const flat = stripDvarfInternalMarkers(value).replace(/\s+/g, ' ').trim()
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

function roleClass(bucket: 'personality' | 'features' | 'notes'): string {
  if (bucket === 'features') return 'armor'
  if (bucket === 'personality') return 'weapon'
  return 'other'
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

function blockHasContent(block: TextBlock): boolean {
  return block.parts.some((part) => {
    if (part.kind === 'text') return Boolean(part.value.trim())
    if (part.kind === 'spoiler') {
      return Boolean(part.title.trim() || part.body.trim())
    }
    if (part.kind === 'divider') return Boolean(part.label.trim())
    if (part.kind === 'resource') return true
    return false
  })
}

export function TextBlocksPanel({
  blocks,
  onChange,
  resources,
  onResourcesChange,
  physique,
  onPhysiqueChange,
}: TextBlocksPanelProps) {
  // B10: start on personality — not the full technical dump.
  const [filter, setFilter] = useState<TextFilter>('personality')
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set())
  const [insertMenuFor, setInsertMenuFor] = useState<string | null>(null)
  const [orphansOpen, setOrphansOpen] = useState(false)
  const [physiqueOpen, setPhysiqueOpen] = useState(true)

  const linkedIds = new Set(
    blocks.flatMap((block) => listResourceIds(block.parts)),
  )
  const orphanResources = resources.filter((item) => !linkedIds.has(item.id))

  const visibleBlocks = useMemo(() => {
    const filtered = blocks.filter((block) => {
      if (filter === 'all') return !block.isHidden
      if (filter === 'hidden') return block.isHidden
      if (filter === 'resource') return blockHasResource(block) && !block.isHidden
      if (filter === 'personality') {
        return !block.isHidden && blockBucket(block) === 'personality'
      }
      if (filter === 'features') {
        return !block.isHidden && blockBucket(block) === 'features'
      }
      return !block.isHidden && blockBucket(block) === 'notes'
    })
    const bucketRank = (block: TextBlock) => {
      const bucket = blockBucket(block)
      if (bucket === 'personality') return 0
      if (bucket === 'notes') return 1
      return 2
    }
    return [...filtered].sort((a, b) => {
      const rank = bucketRank(a) - bucketRank(b)
      if (rank !== 0) return rank
      // Empty personality last within personality.
      if (blockBucket(a) === 'personality') {
        return Number(blockHasContent(a)) === Number(blockHasContent(b))
          ? 0
          : blockHasContent(a)
            ? -1
            : 1
      }
      return 0
    })
  }, [blocks, filter])

  const physiqueFilled = physique
    ? PHYSIQUE_FIELDS.filter((row) => physique[row.key].trim()).length
    : 0

  function replaceBlock(next: TextBlock) {
    onChange(blocks.map((item) => (item.key === next.key ? next : item)))
  }

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
        updateBlockParts(
          block,
          block.parts.filter(
            (part) => !(part.kind === 'resource' && part.resourceId === id),
          ),
        ),
      ),
    )
  }

  function linkOrphanToBlock(resourceId: string, blockKey: string) {
    const target = blocks.find((item) => item.key === blockKey)
    if (!target) return
    onChange(
      blocks.map((block) => {
        if (block.key !== blockKey) {
          // Detach from other blocks if re-linked.
          if (!listResourceIds(block.parts).includes(resourceId)) return block
          return updateBlockParts(
            block,
            block.parts.filter(
              (part) => !(part.kind === 'resource' && part.resourceId === resourceId),
            ),
          )
        }
        if (listResourceIds(block.parts).includes(resourceId)) return block
        return appendBlockPart(block, createResourcePart(resourceId))
      }),
    )
  }

  function toggleDetails(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function collapseAll() {
    setOpenKeys(new Set())
  }

  function expandAll() {
    setOpenKeys(new Set(visibleBlocks.map((block) => block.key)))
  }

  function insertPart(block: TextBlock, kind: TextBlockPart['kind']) {
    if (kind === 'text') {
      replaceBlock(appendBlockPart(block, createTextPart('')))
    } else if (kind === 'resource') {
      const resource = createResource({
        name: displayLabel(block),
        max: 1,
        used: 0,
        reset: 'long',
        onHot: false,
      })
      onResourcesChange([...resources, resource])
      replaceBlock(appendBlockPart(block, createResourcePart(resource.id)))
    } else if (kind === 'spoiler') {
      replaceBlock(appendBlockPart(block, createSpoilerPart()))
    } else {
      replaceBlock(appendBlockPart(block, createDividerPart('')))
    }
    setInsertMenuFor(null)
  }

  function dropPart(block: TextBlock, part: TextBlockPart) {
    if (part.kind === 'resource') {
      onResourcesChange(resources.filter((item) => item.id !== part.resourceId))
    }
    replaceBlock(removeBlockPart(block, part.id))
  }

  function renderDragHandle(block: TextBlock) {
    return (
      <span
        className="abil-block__drag text-block__drag"
        draggable
        title="Зажми и перетащи блок"
        aria-label={`Перетащить «${displayLabel(block)}»`}
        onClick={(event) => event.stopPropagation()}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/text-block', block.key)
          event.dataTransfer.effectAllowed = 'move'
          event.currentTarget.closest('.text-block')?.classList.add('is-dragging')
        }}
        onDragEnd={(event) => {
          event.currentTarget.closest('.text-block')?.classList.remove('is-dragging')
          document
            .querySelectorAll('.text-block.drag-over')
            .forEach((node) => node.classList.remove('drag-over'))
        }}
      >
        ⋮⋮
      </span>
    )
  }

  function blockDropProps(block: TextBlock) {
    return {
      onDragOver: (event: ReactDragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.currentTarget.classList.add('drag-over')
      },
      onDragLeave: (event: ReactDragEvent<HTMLDivElement>) => {
        event.currentTarget.classList.remove('drag-over')
      },
      onDrop: (event: ReactDragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.currentTarget.classList.remove('drag-over')
        const from = event.dataTransfer.getData('text/text-block')
        if (from) onChange(moveTextBlockBefore(blocks, from, block.key))
      },
    }
  }

  function renderResourcePart(block: TextBlock, part: Extract<TextBlockPart, { kind: 'resource' }>) {
    const resource = resources.find((item) => item.id === part.resourceId)
    if (!resource) {
      return (
        <div key={part.id} className="text-block__part text-block__part--resource">
          <Text tone="muted">Ресурс не найден</Text>
          <button type="button" className="linkish" onClick={() => dropPart(block, part)}>
            Убрать
          </button>
        </div>
      )
    }
    const onHot = resource.onHot === true
    return (
      <div key={part.id} className="text-block__part text-block__part--resource">
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
            className={`inventory-fav${onHot ? ' is-on' : ''}`}
            title={
              onHot
                ? 'Убрать пипсы с боевой полосы'
                : 'Показать пипсы на боевой полосе'
            }
            aria-pressed={onHot}
            onClick={() => updateResource(resource.id, { onHot: !onHot })}
          >
            {onHot ? '★ hot' : '☆ hot'}
          </button>
          <button type="button" className="linkish" onClick={() => dropPart(block, part)}>
            Убрать
          </button>
        </div>
      </div>
    )
  }

  function renderPart(block: TextBlock, part: TextBlockPart) {
    if (part.kind === 'resource') return renderResourcePart(block, part)

    if (part.kind === 'divider') {
      return (
        <div key={part.id} className="text-block__part text-block__part--divider">
          <div className="text-block__divider" aria-hidden>
            <span className="text-block__divider-line" />
            <Input
              className="text-block__divider-input"
              value={part.label}
              placeholder="Разделитель"
              onChange={(event) =>
                replaceBlock(
                  patchBlockPart(block, part.id, { label: event.target.value }),
                )
              }
            />
            <span className="text-block__divider-line" />
          </div>
          <button type="button" className="linkish" onClick={() => dropPart(block, part)}>
            Убрать
          </button>
        </div>
      )
    }

    if (part.kind === 'spoiler') {
      return (
        <div key={part.id} className="text-block__part text-block__part--spoiler">
          <button
            type="button"
            className="text-block__spoiler-head"
            aria-expanded={part.open}
            onClick={() =>
              replaceBlock(patchBlockPart(block, part.id, { open: !part.open }))
            }
          >
            <span aria-hidden>{part.open ? '▾' : '▸'}</span>
            <span className="text-block__spoiler-title">
              {part.title.trim() || 'Спойлер'}
            </span>
          </button>
          {part.open ? (
            <div className="text-block__spoiler-body">
              <Field label="Заголовок спойлера">
                <Input
                  value={part.title}
                  onChange={(event) =>
                    replaceBlock(
                      patchBlockPart(block, part.id, { title: event.target.value }),
                    )
                  }
                />
              </Field>
              <textarea
                className="ui-input text-block__area"
                rows={3}
                value={part.body}
                placeholder="Текст спойлера…"
                onChange={(event) =>
                  replaceBlock(
                    patchBlockPart(block, part.id, { body: event.target.value }),
                  )
                }
              />
            </div>
          ) : null}
          <button type="button" className="linkish" onClick={() => dropPart(block, part)}>
            Убрать спойлер
          </button>
        </div>
      )
    }

    return (
      <div key={part.id} className="text-block__part text-block__part--text">
        <textarea
          className="ui-input text-block__area"
          rows={4}
          value={stripDvarfInternalMarkers(part.value)}
          placeholder="Текст…"
          onChange={(event) =>
            replaceBlock(
              patchBlockPart(block, part.id, {
                value: storeTextBlockFromEditor(
                  block.key,
                  part.value,
                  event.target.value,
                ),
              }),
            )
          }
        />
        {block.parts.filter((row) => row.kind === 'text').length > 1 ? (
          <button type="button" className="linkish" onClick={() => dropPart(block, part)}>
            Убрать текст
          </button>
        ) : null}
      </div>
    )
  }

  function renderInsertBar(block: TextBlock) {
    const open = insertMenuFor === block.key
    return (
      <div className="text-block__insert">
        <button
          type="button"
          className="text-block__insert-trigger"
          aria-expanded={open}
          onClick={() => setInsertMenuFor(open ? null : block.key)}
        >
          + Вставка
        </button>
        {open ? (
          <div className="text-block__insert-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => insertPart(block, 'resource')}>
              Ресурс
            </button>
            <button type="button" role="menuitem" onClick={() => insertPart(block, 'spoiler')}>
              Спойлер
            </button>
            <button type="button" role="menuitem" onClick={() => insertPart(block, 'divider')}>
              Разделитель
            </button>
            <button type="button" role="menuitem" onClick={() => insertPart(block, 'text')}>
              Текст
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  function renderBlockCard(block: TextBlock) {
    const label = displayLabel(block)
    const bucket = blockBucket(block)
    const role = roleLabel(block)
    const preview = previewText(block.value)
    const filled =
      Boolean(stripDvarfInternalMarkers(block.value).trim()) ||
      blockHasResource(block)
    const detailsOpen = openKeys.has(block.key)
    const drop = blockDropProps(block)
    const hasResource = blockHasResource(block)
    const spoilerCount = block.parts.filter((part) => part.kind === 'spoiler').length

    if (block.isHidden && filter === 'hidden' && !detailsOpen) {
      return (
        <div
          key={block.key}
          id={`text-block-${block.key}`}
          className="text-block text-block--compact text-block--hidden"
          {...drop}
        >
          {renderDragHandle(block)}
          <button
            type="button"
            className="text-block__glance"
            onClick={() => toggleDetails(block.key)}
          >
            <b className="text-block__glance-name">{label}</b>
            <span className={`inventory-role inventory-role--${roleClass(bucket)}`}>
              {role}
            </span>
            <span className="attack-held-tag">скрыт</span>
            <span className="inventory-card__glance-spacer" aria-hidden />
            <span className="inventory-card__glance-meta">
              {filled ? 'есть текст' : 'пусто'}
            </span>
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
          {...drop}
        >
          {renderDragHandle(block)}
          <button
            type="button"
            className="text-block__glance"
            onClick={() => toggleDetails(block.key)}
          >
            <b className="text-block__glance-name">{label}</b>
            <span className={`inventory-role inventory-role--${roleClass(bucket)}`}>
              {role}
            </span>
            {hasResource ? <span className="attack-held-tag is-on">ресурс</span> : null}
            {spoilerCount > 0 ? (
              <span className="attack-held-tag">спойлер</span>
            ) : null}
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
        {...drop}
      >
        <div className="text-block__meta">
          {renderDragHandle(block)}
          <span className={`inventory-role inventory-role--${roleClass(bucket)}`}>
            {role}
          </span>
          {hasResource ? <span className="attack-held-tag is-on">ресурс</span> : null}
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
        </div>

        <div className="text-block__parts">
          {block.parts.map((part) => renderPart(block, part))}
        </div>

        {renderInsertBar(block)}

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
                const ids = listResourceIds(block.parts)
                if (ids.length > 0) {
                  onResourcesChange(
                    resources.filter((item) => !ids.includes(item.id)),
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
    <Panel
      title="Общение"
      className="text-panel"
      titleTip={<HoverTipCard tip={panelExplain(PANEL_HELP.text_blocks)} />}
    >
      <p className="text-panel__lede">
        Сначала личность и внешность. Умения класса — во вкладке «Способности».
      </p>

      <Stack gap={12}>
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

        {physique && onPhysiqueChange && (filter === 'all' || filter === 'personality') ? (
          <div className="text-physique">
            <button
              type="button"
              className="text-physique__toggle"
              aria-expanded={physiqueOpen}
              onClick={() => setPhysiqueOpen((prev) => !prev)}
            >
              <strong>Внешность</strong>
              <span className="text-physique__meta">
                {physiqueFilled > 0 ? `${physiqueFilled}/6` : 'не заполнено'}
                {' · '}
                {physiqueOpen ? 'свернуть' : 'показать'}
              </span>
            </button>
            {physiqueOpen ? (
              <div className="text-physique__grid">
                {PHYSIQUE_FIELDS.map((row) => (
                  <Field key={row.key} label={row.label}>
                    <Input
                      value={physique[row.key]}
                      placeholder={row.placeholder}
                      onChange={(event) =>
                        onPhysiqueChange({
                          ...physique,
                          [row.key]: event.target.value,
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="abil-column__toolbar text-panel__collapse-bar">
          <button type="button" onClick={collapseAll}>
            ▲ Свернуть все
          </button>
          <button type="button" onClick={expandAll}>
            ▼ Развернуть все
          </button>
        </div>

        <div className="inventory-panel__toolbar">
          <Button
            variant="secondary"
            className="inventory-toolbar-btn"
            onClick={() => {
              const next = createCustomTextBlock(blocks)
              onChange([...blocks, next])
              setFilter('notes')
              setOpenKeys((prev) => new Set(prev).add(next.key))
            }}
          >
            <IconPlus />
            Добавить блок
          </Button>
        </div>

        <Stack gap={10}>
          {visibleBlocks.length === 0 ? (
            <Text tone="muted">
              {filter === 'all'
                ? 'Нет видимых блоков — добавь заметку или покажи скрытые.'
                : filter === 'personality'
                  ? 'Пустые поля личности свёрнуты в карточках — открой нужное и заполни.'
                  : 'Нет блоков в этом фильтре.'}
            </Text>
          ) : null}
          {visibleBlocks.map((block) => renderBlockCard(block))}
        </Stack>

        {orphanResources.length > 0 ? (
          <div className="text-block__orphans">
            <button
              type="button"
              className="text-block__orphans-toggle"
              aria-expanded={orphansOpen}
              onClick={() => setOrphansOpen((prev) => !prev)}
            >
              <strong>Ресурсы без блока</strong>
              <span>
                {orphanResources.length} · служебное ·{' '}
                {orphansOpen ? 'свернуть' : 'показать'}
              </span>
            </button>
            {orphansOpen ? (
              <>
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
              </>
            ) : null}
          </div>
        ) : null}
      </Stack>
    </Panel>
  )
}
