import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
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

/** Reserve for «+N» face (kit ClassChipRow / ActiveEffects). */
const STATES_MORE_RESERVE_PX = 40

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

/** One-line ellipsis title; full name in native tooltip (HOT-01). */
function HotResourceName({ name }: { name: string }): ReactNode {
  const label = name.trim()
  return (
    <span className="play-desk__hot-res-name" title={label || undefined}>
      {label}
    </span>
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
  /* SCN-01: квадратики при max ≤ 5; ± счётчик при max > 5 (Lay on Hands и т.п.). */
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

/**
 * HOT-01: fixed-width «Состояния» card — chips that fit + «+N» (hidden only).
 * Click / +N → existing HotConditionsDialog (kit §2e), not a new popover.
 */
function ConditionsHotCard({
  parts,
  titleParts,
  emptyChrome,
  onOpenConditions,
}: {
  parts: string[]
  titleParts?: string[]
  emptyChrome: boolean
  onOpenConditions?: () => void
}) {
  const hostRef = useRef<HTMLSpanElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [visibleCount, setVisibleCount] = useState<number | null>(null)
  const conditionsOn = parts.length > 0
  const rowKey = parts.join('|')

  const shown =
    !conditionsOn ||
    visibleCount == null ||
    visibleCount >= parts.length
      ? parts
      : parts.slice(0, Math.max(1, visibleCount))
  const overflow =
    conditionsOn && visibleCount != null && visibleCount < parts.length
      ? parts.length - Math.max(1, visibleCount)
      : 0

  useLayoutEffect(() => {
    if (!conditionsOn) {
      setVisibleCount(null)
      return
    }
    const host = hostRef.current
    const measure = measureRef.current
    if (!host || !measure) return

    const recompute = () => {
      const hostW = host.clientWidth
      if (hostW <= 0) return
      measure.style.setProperty('--play-desk-hot-cond-measure-w', `${hostW}px`)
      const chips = Array.from(
        measure.querySelectorAll<HTMLElement>('[data-hot-cond-measure]'),
      )
      if (chips.length === 0) {
        setVisibleCount(parts.length)
        return
      }
      const rowTop = chips[0].offsetTop
      let fitAll = 0
      for (const chip of chips) {
        if (chip.offsetTop > rowTop + 1) break
        fitAll += 1
      }
      if (fitAll >= chips.length) {
        setVisibleCount(chips.length)
        return
      }
      let width = 0
      let kept = 0
      const maxW = Math.max(0, hostW - STATES_MORE_RESERVE_PX)
      for (const chip of chips) {
        const next = width + chip.offsetWidth + (kept > 0 ? 4 : 0)
        if (next > maxW) break
        width = next
        kept += 1
      }
      setVisibleCount(Math.max(1, kept))
    }

    recompute()
    const raf = requestAnimationFrame(() => {
      recompute()
      requestAnimationFrame(recompute)
    })
    const ro = new ResizeObserver(() => recompute())
    ro.observe(host)
    window.addEventListener('resize', recompute)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [conditionsOn, parts.length, rowKey])

  if (!conditionsOn) {
    return (
      <button
        type="button"
        className="play-desk__hot-item play-desk__hot-item--btn play-desk__hot-item--states play-desk__hot-item--states-empty"
        title={
          emptyChrome
            ? 'Состояния и концентрация — открыть'
            : 'Нажми, чтобы изменить состояния'
        }
        aria-label="Состояния: нет"
        aria-pressed={false}
        onClick={onOpenConditions}
        data-sc06-hot-empty={emptyChrome ? '1' : '0'}
        data-scn01-states-empty="1"
      >
        <span className="play-desk__hot-res-head">
          <IconConditions className="play-desk__hot-icon" />
          <span className="play-desk__hot-label">Состояния</span>
        </span>
        <span className="play-desk__hot-cond-empty">нет</span>
      </button>
    )
  }

  const title = `Состояния: ${(titleParts ?? parts).join(', ')}`

  const measure =
    typeof document !== 'undefined'
      ? createPortal(
          <div
            className="play-desk__hot-cond-measure"
            ref={measureRef}
            aria-hidden="true"
          >
            {parts.map((label) => (
              <span
                key={label}
                className="play-desk__hot-cond-chip"
                data-hot-cond-measure
              >
                {label}
              </span>
            ))}
          </div>,
          document.body,
        )
      : null

  return (
    <>
      {measure}
      <button
        type="button"
        className="play-desk__hot-item play-desk__hot-item--btn play-desk__hot-item--states is-on"
        title={title}
        aria-label={title}
        aria-pressed={true}
        onClick={onOpenConditions}
        data-sc06-hot-empty="0"
      >
        <span className="play-desk__hot-res-head">
          <IconConditions className="play-desk__hot-icon" />
          <span className="play-desk__hot-label">Состояния</span>
        </span>
        <span className="play-desk__hot-cond-row" ref={hostRef}>
          {shown.map((label) => (
            <span key={label} className="play-desk__hot-cond-chip">
              {label}
            </span>
          ))}
          {overflow > 0 ? (
            <span
              className="play-desk__hot-cond-more"
              title={`Ещё ${overflow} — открыть список состояний`}
            >
              +{overflow}
            </span>
          ) : null}
        </span>
      </button>
    </>
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
  // Face chips: short exhaustion label (full stage stays in dialog / title).
  const exhaustionStage =
    exhaustion > 0 ? conditionLevelLabel('exhaustion', exhaustion) : null
  const parts = [
    ...conditionNames,
    exhaustion > 0 ? `Истощение ${exhaustion}` : null,
  ].filter(Boolean) as string[]
  const partsTitle = [
    ...conditionNames,
    exhaustion > 0
      ? exhaustionStage
        ? `Истощение ${exhaustion} (${exhaustionStage})`
        : `Истощение ${exhaustion}`
      : null,
  ].filter(Boolean) as string[]
  // SC-01 / решение 13.11 18:05: пустые блоки («нет», «—») свёрнуты.
  // SC-06: пустые состояния + нет концентрации = одна узкая кнопка (Б → диалог).
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
    parts.join(','),
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
      <ConditionsHotCard
        parts={parts}
        titleParts={partsTitle}
        emptyChrome={emptyChrome}
        onOpenConditions={onOpenConditions}
      />
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
