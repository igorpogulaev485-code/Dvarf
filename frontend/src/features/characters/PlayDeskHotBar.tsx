import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { conditionLevelLabel } from '../../shared/dnd/conditions'
import type { ConcentrationState } from './play'
import { resourceShowsOnHot, type SheetResource } from '../../shared/dnd/rest'
import { shouldUseCompactResourceTrack } from '../../ui/resourceTrackDisplay'
import {
  IconConcentration,
  IconConditions,
  IconPouch,
} from './deskIcons'

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
   * M-02 / M07: phone overflow = pinned + «Ещё N» (no silent sideways scroll).
   * Desktop (≥960) keeps the scroll row with edge arrows (§2l / UX restore).
   */
  mobileMoreOverflow?: boolean
}

/** Pure edge flags for the hot-bar scroller (selfcheck + UI). */
export function hotBarScrollEdges(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
  epsilon = 1,
): { canScrollLeft: boolean; canScrollRight: boolean } {
  if (scrollWidth <= clientWidth + epsilon) {
    return { canScrollLeft: false, canScrollRight: false }
  }
  return {
    canScrollLeft: scrollLeft > epsilon,
    canScrollRight: scrollLeft + clientWidth < scrollWidth - epsilon,
  }
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
        <div
          className="play-desk__pips"
          role="group"
          aria-label={`${row.name}: ${remaining}/${row.max}`}
        >
          {Array.from({ length: row.max }, (_, index) => {
            const isOn = index < remaining
            return (
              <button
                key={`${row.id}-${index}`}
                type="button"
                className={`play-desk__pip${isOn ? ' is-on' : ''}`}
                aria-label={
                  isOn
                    ? `${row.name}: потратить заряд ${index + 1}`
                    : `${row.name}: вернуть заряд ${index + 1}`
                }
                onClick={() => {
                  if (isOn) {
                    onResourceUsedChange(row.id, Math.min(row.max, row.used + 1))
                  } else {
                    onResourceUsedChange(row.id, Math.max(0, row.used - 1))
                  }
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function scrollHotBarByApproxOneItem(el: HTMLElement, dir: -1 | 1) {
  const items = Array.from(
    el.querySelectorAll<HTMLElement>(':scope > .play-desk__hot-item'),
  )
  const gap = 6
  if (items.length === 0) {
    el.scrollBy({ left: dir * 140, behavior: 'smooth' })
    return
  }
  if (dir > 0) {
    const next = items.find((item) => item.offsetLeft + item.offsetWidth > el.scrollLeft + 8)
    el.scrollBy({ left: (next?.offsetWidth ?? 140) + gap, behavior: 'smooth' })
    return
  }
  const prev = [...items]
    .reverse()
    .find((item) => item.offsetLeft < el.scrollLeft - 1)
  el.scrollBy({ left: -((prev?.offsetWidth ?? 140) + gap), behavior: 'smooth' })
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
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollHints = () => {
    if (mobileMoreOverflow) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }
    const el = scrollerRef.current
    if (!el) return
    const edges = hotBarScrollEdges(el.scrollLeft, el.clientWidth, el.scrollWidth)
    setCanScrollLeft(edges.canScrollLeft)
    setCanScrollRight(edges.canScrollRight)
  }

  useLayoutEffect(() => {
    updateScrollHints()
  }, [
    hotResources.length,
    conditionsLabel,
    concOn,
    concentration?.name,
    mobileMoreOverflow,
    pinnedResources.length,
    overflowResources.length,
  ])

  useEffect(() => {
    if (mobileMoreOverflow) return
    const el = scrollerRef.current
    if (!el) return

    const onScroll = () => updateScrollHints()
    el.addEventListener('scroll', onScroll, { passive: true })

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      el.scrollLeft += event.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })

    const ro = new ResizeObserver(() => updateScrollHints())
    ro.observe(el)
    for (const child of Array.from(el.children)) {
      if (child instanceof HTMLElement) ro.observe(child)
    }

    window.addEventListener('resize', updateScrollHints)

    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onWheel)
      ro.disconnect()
      window.removeEventListener('resize', updateScrollHints)
    }
  }, [
    hotResources.length,
    conditionsLabel,
    concOn,
    concentration?.name,
    mobileMoreOverflow,
  ])

  return (
    <div className="play-desk__hot-wrap">
      {canScrollLeft ? (
        <>
          <div className="play-desk__hot-fade play-desk__hot-fade--left" aria-hidden="true" />
          <button
            type="button"
            className="play-desk__hot-arrow play-desk__hot-arrow--left"
            aria-label="Прокрутить влево"
            onClick={() => {
              const el = scrollerRef.current
              if (el) scrollHotBarByApproxOneItem(el, -1)
            }}
          >
            ‹
          </button>
        </>
      ) : null}
      {canScrollRight ? (
        <>
          <div className="play-desk__hot-fade play-desk__hot-fade--right" aria-hidden="true" />
          <button
            type="button"
            className="play-desk__hot-arrow play-desk__hot-arrow--right"
            aria-label="Прокрутить вправо"
            onClick={() => {
              const el = scrollerRef.current
              if (el) scrollHotBarByApproxOneItem(el, 1)
            }}
          >
            ›
          </button>
        </>
      ) : null}
      <div
        className={`play-desk__hot${emptyChrome ? ' play-desk__hot--empty-chrome' : ''}`}
        ref={scrollerRef}
        aria-label="Боевая полоса"
        data-sc06-hot-empty={emptyChrome ? '1' : '0'}
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
      </div>
    </div>
  )
}
