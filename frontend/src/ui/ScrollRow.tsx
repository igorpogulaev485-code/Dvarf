import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/** Pure edge flags for horizontal ScrollRow (selfcheck + UI). */
export function scrollRowEdges(
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

/** Read scroll-padding-inline-start in px (fade clearance for snap). */
export function scrollPadStartPx(el: HTMLElement): number {
  const raw = getComputedStyle(el).scrollPaddingInlineStart
  const n = Number.parseFloat(raw || '0')
  return Number.isFinite(n) ? n : 0
}

/** Extra px past scroll-padding so soft fade + chevron clear the card face. */
export const SCROLL_ROW_FADE_CLEARANCE_PX = 8

/** Hard cap: trailing empty at end ≈ fade + gap, never a half-row void. */
export const SCROLL_ROW_END_SPACER_CAP_PX = 60

type SnapItem = { left: number; width: number }

function thinRemnantPx(width: number, pad: number): number {
  return Math.min(pad, Math.floor(width * 0.35))
}

/**
 * Trailing spacer from *natural* scroll width (spacer collapsed to 0).
 * - content fits → 0 (no scroll, no ‹ ›)
 * - overflow → min(pad + clearance, cap ≈ 60)
 * Never accumulates across remeasures; never grows to chase left-fade clearance.
 */
export function computeEndSpacerPx(
  /** scrollWidth with end-spacer forced to 0. */
  naturalScrollWidth: number,
  clientWidth: number,
  pad: number,
  clearance = SCROLL_ROW_FADE_CLEARANCE_PX,
  cap = SCROLL_ROW_END_SPACER_CAP_PX,
): number {
  if (clientWidth <= 0) return 0
  if (naturalScrollWidth <= clientWidth + 1) return 0
  return Math.min(cap, Math.max(0, Math.ceil(pad + clearance)))
}

/**
 * End snap ≈ true max. Pull back only when a *full* card (starts in view)
 * sits under the left fade AND the last card stays fully visible after pull.
 * Never hide the last card to chase fade clearance.
 */
export function computeEndSnapScrollLeft(
  items: SnapItem[],
  clientWidth: number,
  scrollWidth: number,
  pad: number,
  clearance = SCROLL_ROW_FADE_CLEARANCE_PX,
): number {
  const max = Math.max(0, scrollWidth - clientWidth)
  if (items.length === 0 || max <= 0) return 0

  const fadeEnd = max + pad
  for (const item of items) {
    const left = item.left
    const right = left + item.width
    if (right <= max + 1) continue
    if (left >= max + clientWidth - 1) break
    const thin = thinRemnantPx(item.width, pad)
    const pastFade = Math.max(0, right - fadeEnd)
    if (pastFade < thin) continue
    // Remnant that started before the viewport — OK under fade.
    if (left < max - 1) continue
    if (left < fadeEnd - 1) {
      const target = Math.max(0, Math.min(max, left - pad - clearance))
      const last = items[items.length - 1]
      const lastRight = last.left + last.width
      if (lastRight <= target + clientWidth + 2) return target
    }
    break
  }
  return max
}

/**
 * Overlap px when a *full* card (starts in the viewport) sits under the left fade.
 * Remnants that began before scrollLeft do not count.
 */
export function leftFadeOverlapPx(
  items: SnapItem[],
  scrollLeft: number,
  clientWidth: number,
  pad: number,
): number {
  const fadeEnd = scrollLeft + pad
  for (const item of items) {
    const left = item.left
    const right = left + item.width
    if (right <= scrollLeft + 1) continue
    if (left >= scrollLeft + clientWidth - 1) break
    if (left < scrollLeft - 1) continue // remnant — OK
    const thin = thinRemnantPx(item.width, pad)
    const pastFade = Math.max(0, right - fadeEnd)
    const substantial = pastFade >= thin
    if (!substantial) continue
    if (left < fadeEnd - 1) {
      return Math.max(0, Math.round(fadeEnd - left))
    }
    break
  }
  return 0
}

/** Last item fully inside the viewport (small trailing spacer OK). */
export function lastItemFullyVisible(
  items: SnapItem[],
  scrollLeft: number,
  clientWidth: number,
  epsilon = 2,
): boolean {
  if (items.length === 0) return true
  const last = items[items.length - 1]
  const right = last.left + last.width
  return right <= scrollLeft + clientWidth + epsilon
}

/**
 * Snap so a card starts just past the left fade (scroll-padding).
 * At end: true max — last card fully visible thanks to end spacer.
 */
export function snapScrollLeft(
  el: HTMLElement,
  itemSelector: string,
  prefer: 'nearest' | 'start' | 'end' = 'nearest',
): number {
  const nodes = Array.from(el.querySelectorAll<HTMLElement>(itemSelector))
  if (nodes.length === 0) return el.scrollLeft
  const pad = scrollPadStartPx(el)
  const max = Math.max(0, el.scrollWidth - el.clientWidth)
  const items: SnapItem[] = nodes.map((item) => ({
    left: item.offsetLeft,
    width: item.offsetWidth,
  }))
  const candidates = items
    .map((item) => item.left - pad)
    .filter((sl) => sl >= -0.5 && sl <= max + 0.5)
    .map((sl) => Math.max(0, Math.min(max, sl)))

  if (prefer === 'start') {
    el.scrollLeft = 0
    return 0
  }

  if (prefer === 'end') {
    const snapped = computeEndSnapScrollLeft(
      items,
      el.clientWidth,
      el.scrollWidth,
      pad,
    )
    el.scrollLeft = snapped
    return snapped
  }

  const cur = el.scrollLeft
  let best = cur
  let bestDist = Infinity
  for (const sl of candidates) {
    const d = Math.abs(sl - cur)
    if (d < bestDist) {
      bestDist = d
      best = sl
    }
  }
  if (Math.abs(0 - cur) < bestDist) best = 0
  if (Math.abs(max - cur) <= bestDist) {
    if (cur > max - 24) {
      return snapScrollLeft(el, itemSelector, 'end')
    }
  }
  el.scrollLeft = best
  return best
}

type ScrollRowProps = {
  ariaLabel?: string
  className?: string
  /** Extra class on the outer shell (`.ui-scroll-row`). */
  shellClassName?: string
  children: ReactNode
  /** Recompute edges when these change (item counts / labels). */
  watchKey?: string | number
  /** Selector for child items used when stepping by arrow click. */
  itemSelector?: string
}

function scrollByApproxOneItem(
  el: HTMLElement,
  dir: -1 | 1,
  itemSelector: string,
) {
  const items = Array.from(el.querySelectorAll<HTMLElement>(itemSelector))
  const pad = scrollPadStartPx(el)
  if (items.length === 0) {
    el.scrollBy({ left: dir * 140, behavior: 'smooth' })
    return
  }
  if (dir > 0) {
    const line = el.scrollLeft + pad + 2
    const next = items.find((item) => item.offsetLeft > line)
    if (!next) {
      snapScrollLeft(el, itemSelector, 'end')
      return
    }
    el.scrollTo({
      left: Math.max(0, next.offsetLeft - pad),
      behavior: 'smooth',
    })
    return
  }
  const line = el.scrollLeft + pad - 2
  const prev = [...items]
    .reverse()
    .find((item) => item.offsetLeft < line)
  if (!prev || prev.offsetLeft - pad <= 0) {
    el.scrollTo({ left: 0, behavior: 'smooth' })
    return
  }
  el.scrollTo({
    left: Math.max(0, prev.offsetLeft - pad),
    behavior: 'smooth',
  })
}

/**
 * Kit horizontal scroll row — one line, no wrap.
 * Edge cue: ~40px fade overlay + small semi-transparent round ‹/›,
 * only on the side that can still scroll.
 * HOT-01: end = true max; small capped end-spacer (0 when content fits).
 */
export function ScrollRow({
  ariaLabel,
  className = '',
  shellClassName = '',
  children,
  watchKey = '',
  itemSelector = ':scope > :not(.ui-scroll-row__end-spacer)',
}: ScrollRowProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const spacerRef = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [endSpacerPx, setEndSpacerPx] = useState(0)
  const itemSelectorRef = useRef(itemSelector)
  itemSelectorRef.current = itemSelector

  const applySpacerWidth = (px: number) => {
    const spacerEl = spacerRef.current
    if (!spacerEl) return
    spacerEl.style.flex = `0 0 ${px}px`
    spacerEl.style.width = `${px}px`
    spacerEl.style.minWidth = `${px}px`
  }

  const updateEndSpacer = () => {
    const el = scrollerRef.current
    if (!el) return
    // Natural width WITHOUT spacer — prevents accumulation across remeasures.
    applySpacerWidth(0)
    void el.offsetWidth
    const pad = scrollPadStartPx(el)
    const next = computeEndSpacerPx(el.scrollWidth, el.clientWidth, pad)
    applySpacerWidth(next)
    setEndSpacerPx((prev) => (prev === next ? prev : next))
  }

  const updateScrollHints = () => {
    const el = scrollerRef.current
    if (!el) return
    const edgeEpsilon = 8
    if (el.scrollLeft > 0 && el.scrollLeft < edgeEpsilon) {
      el.scrollLeft = 0
    }
    const edges = scrollRowEdges(
      el.scrollLeft,
      el.clientWidth,
      el.scrollWidth,
      edgeEpsilon,
    )
    setCanScrollLeft(edges.canScrollLeft)
    // Hide › at logical end-snap (may be slightly below raw max after pull-back).
    if (edges.canScrollRight) {
      const nodes = Array.from(
        el.querySelectorAll<HTMLElement>(itemSelectorRef.current),
      )
      const items = nodes.map((n) => ({
        left: n.offsetLeft,
        width: n.offsetWidth,
      }))
      const endLeft = computeEndSnapScrollLeft(
        items,
        el.clientWidth,
        el.scrollWidth,
        scrollPadStartPx(el),
      )
      if (el.scrollLeft >= endLeft - edgeEpsilon) {
        setCanScrollRight(false)
        return
      }
    }
    setCanScrollRight(edges.canScrollRight)
  }

  useLayoutEffect(() => {
    updateEndSpacer()
    updateScrollHints()
    const raf = requestAnimationFrame(() => {
      updateEndSpacer()
      updateScrollHints()
      requestAnimationFrame(() => {
        updateEndSpacer()
        updateScrollHints()
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [watchKey, endSpacerPx])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    let settleTimer: ReturnType<typeof setTimeout> | null = null
    const logicalEndLeft = () => {
      const nodes = Array.from(
        el.querySelectorAll<HTMLElement>(itemSelectorRef.current),
      )
      return computeEndSnapScrollLeft(
        nodes.map((n) => ({ left: n.offsetLeft, width: n.offsetWidth })),
        el.clientWidth,
        el.scrollWidth,
        scrollPadStartPx(el),
      )
    }
    const settleSnap = () => {
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(() => {
        const max = Math.max(0, el.scrollWidth - el.clientWidth)
        if (max <= 0) return
        const endLeft = logicalEndLeft()
        const nearEnd = el.scrollLeft >= endLeft - 24 || el.scrollLeft >= max - 8
        if (el.scrollLeft <= 8) {
          el.scrollLeft = 0
        } else if (nearEnd) {
          snapScrollLeft(el, itemSelectorRef.current, 'end')
        } else {
          snapScrollLeft(el, itemSelectorRef.current, 'nearest')
        }
        updateScrollHints()
      }, 80)
    }

    const onScroll = () => {
      updateScrollHints()
      settleSnap()
    }
    const onScrollEnd = () => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth)
      const endLeft = logicalEndLeft()
      const nearEnd = el.scrollLeft >= endLeft - 24 || el.scrollLeft >= max - 8
      if (nearEnd) {
        snapScrollLeft(el, itemSelectorRef.current, 'end')
      } else if (el.scrollLeft > 8) {
        snapScrollLeft(el, itemSelectorRef.current, 'nearest')
      }
      updateScrollHints()
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('scrollend', onScrollEnd)

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      el.scrollLeft += event.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })

    const onResize = () => {
      updateEndSpacer()
      updateScrollHints()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(el)
    for (const child of Array.from(el.children)) {
      if (child instanceof HTMLElement) ro.observe(child)
    }
    window.addEventListener('resize', onResize)
    document.fonts?.ready?.then?.(onResize).catch?.(() => {})

    return () => {
      if (settleTimer) clearTimeout(settleTimer)
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('scrollend', onScrollEnd)
      el.removeEventListener('wheel', onWheel)
      ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [watchKey])

  return (
    <div className={`ui-scroll-row ${shellClassName}`.trim()}>
      {canScrollLeft ? (
        <div className="ui-scroll-row__edge ui-scroll-row__edge--left" aria-hidden="true">
          <button
            type="button"
            className="ui-scroll-row__chevron"
            aria-label="Прокрутить влево"
            onClick={() => {
              const el = scrollerRef.current
              if (el) scrollByApproxOneItem(el, -1, itemSelector)
            }}
          >
            ‹
          </button>
        </div>
      ) : null}
      {canScrollRight ? (
        <div className="ui-scroll-row__edge ui-scroll-row__edge--right" aria-hidden="true">
          <button
            type="button"
            className="ui-scroll-row__chevron"
            aria-label="Прокрутить вправо"
            onClick={() => {
              const el = scrollerRef.current
              if (el) scrollByApproxOneItem(el, 1, itemSelector)
            }}
          >
            ›
          </button>
        </div>
      ) : null}
      <div className={className} ref={scrollerRef} aria-label={ariaLabel}>
        {children}
        <div
          ref={spacerRef}
          className="ui-scroll-row__end-spacer"
          aria-hidden="true"
          style={{
            flex: `0 0 ${endSpacerPx}px`,
            width: endSpacerPx,
            minWidth: endSpacerPx,
          }}
        />
      </div>
    </div>
  )
}
