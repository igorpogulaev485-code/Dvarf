import { useEffect, useMemo, useState, type DragEvent as ReactDragEvent } from 'react'
import { HoverTipCard, PANEL_HELP, panelExplain } from '../onboarding'
import {
  Button,
  Dialog,
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
  type TextBlock,
  type TextBlockPart,
} from './textBlocks'
import type { PhysiqueFields } from './identity'
import {
  APPEARANCE_KEY,
  PHYSIQUE_FIELDS,
  appearancePlain,
  blockHasPlayerContent,
  blockViewPreview,
  countFilledPhysique,
  emptyPersonalityBlocks,
  filledPhysiquePairs,
  listBlocksForFilter,
  physiqueGlancePreview,
  physiqueHasContent,
  shouldShowCollapseBar,
  socialBucket,
  visibleSocialFilters,
  type SocialFilter,
} from './socialScene'

type TextBlocksPanelProps = {
  blocks: TextBlock[]
  onChange: (blocks: TextBlock[]) => void
  resources: SheetResource[]
  onResourcesChange: (resources: SheetResource[]) => void
  /** B10: рост / вес / возраст / глаза / кожа / волосы */
  physique?: PhysiqueFields
  onPhysiqueChange?: (physique: PhysiqueFields) => void
  /** U11: jump to class features instead of a second abilities catalog here. */
  onOpenFeatures?: () => void
}

const RESET_OPTIONS: ResourceReset[] = ['short', 'long', 'manual']

function roleLabel(block: TextBlock): string {
  const bucket = socialBucket(block)
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

function useIsPhone(): boolean {
  const [phone, setPhone] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 959px)').matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 959px)')
    const sync = () => setPhone(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return phone
}

export function TextBlocksPanel({
  blocks,
  onChange,
  resources,
  onResourcesChange,
  physique,
  onPhysiqueChange,
  onOpenFeatures,
}: TextBlocksPanelProps) {
  const isPhone = useIsPhone()
  const hasPhysiqueUi = Boolean(physique && onPhysiqueChange)
  const appearanceBlock = blocks.find((block) => block.key === APPEARANCE_KEY)

  const [filterWish, setFilterWish] = useState<SocialFilter>('personality')
  /** Expanded view (read) keys — editor only after «Изменить». */
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set())
  const [editingKeys, setEditingKeys] = useState<Set<string>>(() => new Set())
  const [insertMenuFor, setInsertMenuFor] = useState<string | null>(null)
  /** Physique: glance → view → edit. Default glance (one line). */
  const [physiquePhase, setPhysiquePhase] = useState<'glance' | 'view' | 'edit'>('glance')
  /** Phone editor dialog: block key or `physique`. */
  const [dialogEditKey, setDialogEditKey] = useState<string | null>(null)

  const filterChips = useMemo(
    () => visibleSocialFilters(blocks, { hasPhysiqueUi }),
    [blocks, hasPhysiqueUi],
  )
  const filter: SocialFilter = filterChips.some((row) => row.id === filterWish)
    ? filterWish
    : (filterChips[0]?.id ?? 'all')

  const visibleBlocks = useMemo(() => {
    const filtered = listBlocksForFilter(blocks, filter)
    const bucketRank = (block: TextBlock) => {
      const bucket = socialBucket(block)
      if (bucket === 'personality') return 0
      if (bucket === 'notes') return 1
      return 2
    }
    return [...filtered].sort((a, b) => {
      const rank = bucketRank(a) - bucketRank(b)
      if (rank !== 0) return rank
      return 0
    })
  }, [blocks, filter])

  const emptyPersonality = useMemo(() => emptyPersonalityBlocks(blocks), [blocks])
  const showEmptyLine =
    (filter === 'all' || filter === 'personality') && emptyPersonality.length > 0
  const showPhysique =
    hasPhysiqueUi && (filter === 'all' || filter === 'personality')

  const physiqueFilled = physique ? countFilledPhysique(physique) : 0
  const physiqueContent = physiqueHasContent(physique, appearanceBlock)

  function replaceBlock(next: TextBlock) {
    onChange(blocks.map((item) => (item.key === next.key ? next : item)))
  }

  function updateBlock(key: string, patch: Partial<TextBlock>) {
    onChange(blocks.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function updateAppearanceText(next: string) {
    const target = blocks.find((item) => item.key === APPEARANCE_KEY)
    if (!target) return
    const textPart = target.parts.find((part) => part.kind === 'text')
    if (textPart && textPart.kind === 'text') {
      replaceBlock(
        patchBlockPart(target, textPart.id, {
          value: storeTextBlockFromEditor(APPEARANCE_KEY, textPart.value, next),
        }),
      )
      return
    }
    replaceBlock(appendBlockPart(target, createTextPart(next)))
  }

  function updateResource(id: string, patch: Partial<SheetResource>) {
    onResourcesChange(
      resources.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  function closeDialogEdit() {
    setDialogEditKey(null)
  }

  function beginEdit(key: string) {
    if (isPhone) {
      setDialogEditKey(key)
      setOpenKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
      setEditingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
      return
    }
    setOpenKeys((prev) => new Set(prev).add(key))
    setEditingKeys((prev) => new Set(prev).add(key))
  }

  function beginPhysiqueEdit() {
    if (isPhone) {
      setDialogEditKey('physique')
      setPhysiquePhase('glance')
      return
    }
    setPhysiquePhase('edit')
  }

  function openView(key: string) {
    setEditingKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function collapseBlock(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    setEditingKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  function collapseAll() {
    setOpenKeys(new Set())
    setEditingKeys(new Set())
    setPhysiquePhase('glance')
    setDialogEditKey(null)
  }

  function expandAll() {
    setOpenKeys(new Set(visibleBlocks.map((block) => block.key)))
    setEditingKeys(new Set())
    if (showPhysique) setPhysiquePhase('view')
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

  function renderResourcePart(
    block: TextBlock,
    part: Extract<TextBlockPart, { kind: 'resource' }>,
  ) {
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

  function renderBlockEditor(block: TextBlock) {
    const bucket = socialBucket(block)
    const hasResource = blockHasResource(block)
    return (
      <>
        <div className="text-block__meta">
          {renderDragHandle(block)}
          <span className={`inventory-role inventory-role--${roleClass(bucket)}`}>
            {roleLabel(block)}
          </span>
          {hasResource ? <span className="attack-held-tag is-on">ресурс</span> : null}
          {block.isHidden ? <span className="attack-held-tag">скрыт</span> : null}
          <button
            type="button"
            className="inventory-card__collapse"
            onClick={() => {
              if (dialogEditKey === block.key) closeDialogEdit()
              else collapseBlock(block.key)
            }}
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
                if (dialogEditKey === block.key) closeDialogEdit()
              }}
            >
              <IconTrash />
              Удалить
            </button>
          ) : null}
        </div>
      </>
    )
  }

  function renderPhysiqueEditor() {
    if (!physique || !onPhysiqueChange) return null
    return (
      <div className="text-physique__edit">
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
        <Field label="Описание">
          <textarea
            className="ui-input text-block__area"
            rows={4}
            value={appearancePlain(appearanceBlock)}
            placeholder="Как выглядит персонаж…"
            onChange={(event) => updateAppearanceText(event.target.value)}
          />
        </Field>
      </div>
    )
  }

  function renderPhysiqueView() {
    if (!physique) return null
    const pairs = filledPhysiquePairs(physique)
    const text = appearancePlain(appearanceBlock)
    return (
      <div className="text-physique__view">
        {pairs.length > 0 ? (
          <ul className="text-physique__pairs">
            {pairs.map((row) => (
              <li key={row.label}>
                <span className="text-physique__pair-label">{row.label}</span>
                <span>{row.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Text tone="muted">Поля роста, глаз и прочего пока пустые</Text>
        )}
        {text ? <p className="text-physique__desc">{text}</p> : null}
        <div className="text-physique__view-actions">
          <Button type="button" onClick={beginPhysiqueEdit}>
            Изменить
          </Button>
          <button
            type="button"
            className="inventory-card__collapse"
            onClick={() => setPhysiquePhase('glance')}
          >
            свернуть
          </button>
        </div>
      </div>
    )
  }

  function renderPhysiqueBlock() {
    if (!showPhysique || !physique || !onPhysiqueChange) return null
    const glance = physiqueGlancePreview(physique, appearanceBlock)

    if (physiquePhase === 'edit' && !isPhone) {
      return (
        <div className="text-physique text-physique--edit">
          <div className="text-physique__head">
            <strong>Внешность</strong>
            <button
              type="button"
              className="inventory-card__collapse"
              onClick={() => setPhysiquePhase('view')}
            >
              свернуть
            </button>
          </div>
          {renderPhysiqueEditor()}
        </div>
      )
    }

    if (physiquePhase === 'view') {
      return (
        <div className="text-physique text-physique--view">
          <div className="text-physique__head">
            <strong>Внешность</strong>
            <span className="text-physique__meta">
              {physiqueContent
                ? `${physiqueFilled}/6${appearancePlain(appearanceBlock) ? ' · описание' : ''}`
                : 'не заполнено'}
            </span>
          </div>
          {renderPhysiqueView()}
        </div>
      )
    }

    return (
      <div className="text-physique text-physique--glance">
        <button
          type="button"
          className="text-physique__toggle"
          aria-expanded={false}
          onClick={() => setPhysiquePhase('view')}
        >
          <strong>Внешность</strong>
          <span className="text-physique__meta">
            {physiqueContent
              ? glance || `${physiqueFilled}/6`
              : 'не заполнено'}
            {' · '}
            показать
          </span>
        </button>
      </div>
    )
  }

  function renderEmptyPersonalityLine() {
    if (!showEmptyLine) return null
    return (
      <div className="text-block text-block--empty-line">
        <p className="text-block__empty-line">
          <span>Не заполнено:{' '}</span>
          {emptyPersonality.map((block, index) => (
            <span key={block.key}>
              {index > 0 ? ' · ' : null}
              <button
                type="button"
                className="linkish text-block__empty-link"
                onClick={() => beginEdit(block.key)}
              >
                {displayLabel(block)}
              </button>
            </span>
          ))}
          <span>{' · '}</span>
          <button
            type="button"
            className="linkish text-block__empty-link"
            onClick={() => {
              const first = emptyPersonality[0]
              if (first) beginEdit(first.key)
            }}
          >
            заполнить
          </button>
        </p>
      </div>
    )
  }

  function renderBlockCard(block: TextBlock) {
    const label = displayLabel(block)
    const bucket = socialBucket(block)
    const role = roleLabel(block)
    const filled = blockHasPlayerContent(block)
    const detailsOpen = openKeys.has(block.key)
    const editing = editingKeys.has(block.key)
    const drop = blockDropProps(block)
    const hasResource = blockHasResource(block)
    const spoilerCount = block.parts.filter((part) => part.kind === 'spoiler').length
    const viewText = blockViewPreview(block.value)

    if (block.isHidden && filter === 'hidden' && !detailsOpen && !editing) {
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
            onClick={() => openView(block.key)}
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
              onClick={() => openView(block.key)}
            >
              ›
            </button>
          </div>
        </div>
      )
    }

    if (editing && !isPhone) {
      return (
        <div
          key={block.key}
          id={`text-block-${block.key}`}
          className={`text-block text-block--expand${
            block.isHidden ? ' text-block--hidden' : ''
          }`}
          {...drop}
        >
          {renderBlockEditor(block)}
        </div>
      )
    }

    if (detailsOpen) {
      return (
        <div
          key={block.key}
          id={`text-block-${block.key}`}
          className={`text-block text-block--expand text-block--view${
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
              onClick={() => collapseBlock(block.key)}
            >
              свернуть
            </button>
          </div>
          <h3 className="text-block__view-title">{label}</h3>
          {viewText ? (
            <p className="text-block__view-body">{viewText}</p>
          ) : (
            <Text tone="muted">Пусто</Text>
          )}
          <div className="text-block__view-actions">
            <Button type="button" onClick={() => beginEdit(block.key)}>
              Изменить
            </Button>
          </div>
        </div>
      )
    }

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
          onClick={() => openView(block.key)}
        >
          <b className="text-block__glance-name">{label}</b>
          <span className={`inventory-role inventory-role--${roleClass(bucket)}`}>
            {role}
          </span>
          {hasResource ? <span className="attack-held-tag is-on">ресурс</span> : null}
          {spoilerCount > 0 ? <span className="attack-held-tag">спойлер</span> : null}
          <span className="inventory-card__glance-spacer" aria-hidden />
          <span className="text-block__glance-preview">
            {viewText || 'нажми, чтобы открыть'}
          </span>
        </button>
        <div className="inventory-card__glance-actions">
          <button
            type="button"
            className="inventory-card__chevron-btn"
            aria-label="Подробнее"
            onClick={() => openView(block.key)}
          >
            ›
          </button>
        </div>
      </div>
    )
  }

  const dialogBlock =
    dialogEditKey && dialogEditKey !== 'physique'
      ? blocks.find((block) => block.key === dialogEditKey)
      : null

  const showCollapseBar = shouldShowCollapseBar(visibleBlocks.length)

  return (
    <Panel
      title="Общение"
      className="text-panel"
      titleTip={<HoverTipCard tip={panelExplain(PANEL_HELP.text_blocks)} />}
      titleAside={
        onOpenFeatures ? (
          <button
            type="button"
            className="play-desk-compact__link"
            onClick={onOpenFeatures}
          >
            Способности
          </button>
        ) : null
      }
    >
      <Stack gap={12}>
        <div className="inventory-filters" role="tablist" aria-label="Фильтр текстов">
          {filterChips.map((row) => (
            <button
              key={row.id}
              type="button"
              role="tab"
              aria-selected={filter === row.id}
              className={`inventory-filter${filter === row.id ? ' is-on' : ''}`}
              onClick={() => setFilterWish(row.id)}
            >
              {row.label}
            </button>
          ))}
        </div>

        {renderPhysiqueBlock()}
        {renderEmptyPersonalityLine()}

        {showCollapseBar ? (
          <div className="abil-column__toolbar text-panel__collapse-bar">
            <button type="button" onClick={collapseAll}>
              ▲ Свернуть все
            </button>
            <button type="button" onClick={expandAll}>
              ▼ Развернуть все
            </button>
          </div>
        ) : null}

        <div className="inventory-panel__toolbar">
          <Button
            variant="secondary"
            className="inventory-toolbar-btn"
            onClick={() => {
              const next = createCustomTextBlock(blocks)
              onChange([...blocks, next])
              setFilterWish('notes')
              beginEdit(next.key)
            }}
          >
            <IconPlus />
            Добавить блок
          </Button>
        </div>

        <Stack gap={10}>
          {visibleBlocks.length === 0 && !showEmptyLine && !showPhysique ? (
            <Text tone="muted">
              {filter === 'all'
                ? 'Нет видимых блоков — добавь заметку или покажи скрытые.'
                : filter === 'personality'
                  ? 'Поля личности пустые — заполни строку выше.'
                  : 'Нет блоков в этом фильтре.'}
            </Text>
          ) : null}
          {visibleBlocks.map((block) => renderBlockCard(block))}
        </Stack>
      </Stack>

      <Dialog
        open={dialogEditKey === 'physique' && Boolean(physique)}
        title="Внешность"
        primaryLabel="Готово"
        secondaryLabel="Закрыть"
        onPrimary={closeDialogEdit}
        onSecondary={closeDialogEdit}
        onDismiss={closeDialogEdit}
        size="wide"
      >
        {renderPhysiqueEditor()}
      </Dialog>

      <Dialog
        open={Boolean(dialogBlock)}
        title={dialogBlock ? displayLabel(dialogBlock) : 'Блок'}
        primaryLabel="Готово"
        secondaryLabel="Закрыть"
        onPrimary={closeDialogEdit}
        onSecondary={closeDialogEdit}
        onDismiss={closeDialogEdit}
        size="wide"
      >
        {dialogBlock ? (
          <div className="text-block text-block--dialog-edit">
            {renderBlockEditor(dialogBlock)}
          </div>
        ) : null}
      </Dialog>
    </Panel>
  )
}
