import { useEffect, useId, useRef, useState } from 'react'
import { conditionLevelLabel } from '../../shared/dnd/conditions'
import type { ConcentrationState } from './play'
import { resourceShowsOnHot, type SheetResource } from '../../shared/dnd/rest'
import { ResourcePips } from '../../ui/ResourcePips'
import { shouldUseCompactResourceTrack } from '../../ui/resourceTrackDisplay'
import {
  IconConcentration,
  IconConditions,
  IconPouch,
} from './deskIcons'
import {
  hotBarScrollEdges,
  PlayDeskHotScrollWrap,
} from './PlayDeskHotScrollWrap'

export { hotBarScrollEdges }

/** Phone: how many resource chips stay visible before «Ещё». */
export const MOBILE_HOT_PINNED_RESOURCE_COUNT = 2

type PlayDeskHotBarProps = {
  conditionNames: string[]
  exhaustion: number
  concentration: ConcentrationState | null
  resources: SheetResource[]
  onOpenConditions?: () => void
  onClearConcentration?: () => void
  onResourceUsedChange: (id: string, used: number) => void
  /**
   * Legacy phone «Ещё N». UIKIT-02: keep false — one row + scroll + arrows
   * for resources (same as skills).
   */
  mobileMoreOverflow?: boolean
}

function HotResourceName({ name }: { name: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = name.trim().length > 18
  if (!long) {
    return <span className="play-desk__hot-res-name">{name}</span>
  }
  return (
    <button
      type="button"
      className={`play-desk__hot-res-name${expanded ? ' is-expanded' : ''}`}
      title={expanded ? 'Свернуть название' : name}
      aria-expanded={expanded}
      onClick={() => setExpanded((prev) => !prev)}
    >
      {name}
    </button>
  )
}

function ResourceChip({
  row,
  onResourceUsedChange,
}: {
  row: SheetResource
  onResourceUsedChange: (id: string, used: number) => void
}) {
  const remaining = Math.max(0, row.max - row.used)
  const compact = shouldUseCompactResourceTrack(row.max)
  if (row.unlimited) {
    return (
      <div className="play-desk__hot-item play-desk__hot-item--res play-desk__hot-item--res-compact">
        <span className="play-desk__hot-res-head">
          <IconPouch className="play-desk__hot-icon" />
          <HotResourceName name={row.name} />
        </span>
        <div className="play-desk__stepper" role="group" aria-label={`${row.name}: без лимита`}>
          <span className="play-desk__stepper-value">без лимита</span>
        </div>
      </div>
    )
  }
  /* До SC / UIKIT: квадратики зарядов; ± только для пулов >10 (Lay on Hands и т.п.). */
  return (
    <div
      className={`play-desk__hot-item play-desk__hot-item--res${
        compact ? ' play-desk__hot-item--res-compact' : ''
      }`}
    >
      <span className="play-desk__hot-res-head">
        <IconPouch className="play-desk__hot-icon" />
        <HotResourceName name={row.name} />
      </span>
      {compact ? (
        <div
          className="play-desk__stepper"
          role="group"
          aria-label={`${row.name}: ${remaining}/${row.max}`}
        >
          <button
            type="button"
            className="play-desk__step"
            disabled={remaining <= 0}
            aria-label={`${row.name}: потратить 1`}
            onClick={() =>
              onResourceUsedChange(row.id, Math.min(row.max, row.used + 1))
            }
          >
            −
          </button>
          <span className="play-desk__stepper-value">
            {remaining}
            <span className="play-desk__stepper-max">/{row.max}</span>
          </span>
          <button
            type="button"
            className="play-desk__step"
            disabled={row.used <= 0}
            aria-label={`${row.name}: вернуть 1`}
            onClick={() =>
              onResourceUsedChange(row.id, Math.max(0, row.used - 1))
            }
          >
            +
          </button>
        </div>
      ) : (
        <ResourcePips
          max={row.max}
          used={row.used}
          fillMode="available"
          label={`${row.name}: ${remaining}/${row.max}`}
          onChange={(nextUsed) => onResourceUsedChange(row.id, nextUsed)}
        />
      )}
    </div>
  )
}

function MoreResources({
  overflowResources,
  onResourceUsedChange,
}: {
  overflowResources: SheetResource[]
  onResourceUsedChange: (id: string, used: number) => void
}) {
  const moreId = useId()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!moreOpen) return
    function onDocPointer(event: MouseEvent) {
      const root = moreWrapRef.current
      if (!root) return
      if (event.target instanceof Node && root.contains(event.target)) return
      setMoreOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDocPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  if (overflowResources.length === 0) return null

  return (
    <div className="play-desk__hot-more" ref={moreWrapRef}>
      <button
        type="button"
        className={`play-desk__hot-item play-desk__hot-item--btn play-desk__hot-more-btn${
          moreOpen ? ' is-on' : ''
        }`}
        aria-expanded={moreOpen}
        aria-controls={moreId}
        title="Остальные ресурсы"
        onClick={() => setMoreOpen((open) => !open)}
      >
        Ещё {overflowResources.length}
      </button>
      {moreOpen ? (
        <div
          id={moreId}
          className="play-desk__hot-more-panel"
          role="region"
          aria-label="Остальные ресурсы"
        >
          {overflowResources.map((row) => (
            <ResourceChip
              key={row.id}
              row={row}
              onResourceUsedChange={onResourceUsedChange}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Combat strip under modes: conditions, concentration, resource pips.
 * Initiative / inspiration / exhaustion / rest live in PlayDeskHeader. */
export function PlayDeskHotBar({
  conditionNames,
  exhaustion,
  concentration,
  resources,
  onOpenConditions,
  onClearConcentration,
  onResourceUsedChange,
  mobileMoreOverflow = false,
}: PlayDeskHotBarProps) {
  const exhaustionStage =
    exhaustion > 0 ? conditionLevelLabel('exhaustion', exhaustion) : null
  const parts = [
    ...conditionNames,
    exhaustion > 0
      ? exhaustionStage
        ? `Истощение ${exhaustion} (${exhaustionStage})`
        : `Истощение ${exhaustion}`
      : null,
  ].filter(Boolean) as string[]
  // SC-01 / решение 13.11 18:05: пустые блоки («нет», «—») свёрнуты.
  // SC-06: пустые состояния + нет концентрации = одна узкая кнопка (Б → диалог).
  const conditionsLabel = parts.length > 0 ? parts.join(', ') : null
  const conditionsOn = parts.length > 0
  const hotResources = resources.filter(resourceShowsOnHot)
  const pinnedResources = mobileMoreOverflow
    ? hotResources.slice(0, MOBILE_HOT_PINNED_RESOURCE_COUNT)
    : hotResources
  const overflowResources = mobileMoreOverflow
    ? hotResources.slice(MOBILE_HOT_PINNED_RESOURCE_COUNT)
    : []
  const concOn = Boolean(concentration)
  const emptyChrome = !conditionsOn && !concOn
  const watchKey = [
    hotResources.length,
    conditionsLabel ?? '',
    concOn ? concentration?.name ?? '' : '',
    mobileMoreOverflow ? 'more' : 'scroll',
    pinnedResources.length,
    overflowResources.length,
  ].join('|')

  return (
    <PlayDeskHotScrollWrap
      ariaLabel="Боевая полоса"
      className={`play-desk__hot${emptyChrome ? ' play-desk__hot--empty-chrome' : ''}`}
      watchKey={watchKey}
    >
      <button
        type="button"
        className={`play-desk__hot-item play-desk__hot-item--btn${
          conditionsOn
            ? ' play-desk__hot-item--wide is-on'
            : ' play-desk__hot-item--compact play-desk__hot-item--empty-row'
        }`}
        title={
          emptyChrome
            ? 'Состояния и концентрация — открыть'
            : 'Нажми, чтобы изменить состояния'
        }
        aria-pressed={conditionsOn}
        onClick={onOpenConditions}
        data-sc06-hot-empty={emptyChrome ? '1' : '0'}
      >
        <IconConditions className="play-desk__hot-icon" />
        <span className="play-desk__hot-label">
          {conditionsOn ? `Состояния: ${conditionsLabel}` : 'Состояния'}
        </span>
      </button>
      {concentration ? (
        <div className="play-desk__hot-item play-desk__hot-item--wide is-on">
          <IconConcentration className="play-desk__hot-icon" />
          <span className="play-desk__hot-label">
            Концентрация: <strong>{concentration.name}</strong>
          </span>
          {onClearConcentration ? (
            <button type="button" className="linkish" onClick={onClearConcentration}>
              Снять
            </button>
          ) : null}
        </div>
      ) : null}
      {pinnedResources.map((row) => (
        <ResourceChip
          key={row.id}
          row={row}
          onResourceUsedChange={onResourceUsedChange}
        />
      ))}
      {mobileMoreOverflow ? (
        <MoreResources
          overflowResources={overflowResources}
          onResourceUsedChange={onResourceUsedChange}
        />
      ) : null}
    </PlayDeskHotScrollWrap>
  )
}
