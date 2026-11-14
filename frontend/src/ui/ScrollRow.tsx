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

type SnapItem = { left: number; width: number }

function thinRemnantPx(width: number, pad: number): number {
  return Math.min(pad, Math.floor(width * 0.35))
}

/**
 * Grow trailing spacer from the *real* current max (scrollWidth − clientWidth
 * with the current spacer already applied). Extra spacer raises max 1:1 so the
 * left fade ends on a thin remnant / empty — never pull scrollLeft back.
 */
export function computeEndSpacerPx(
  items: SnapItem[],
  clientWidth: number,
  /** Current max with the spacer already in the layout. */
  currentMax: number,
  /** Current spacer width in px. */
  currentSpacer: number,
  pad: number,
  clearance = SCROLL_ROW_FADE_CLEARANCE_PX,
): number {
  const base = pad + clearance
  if (clientWidth <= 0) return base
  let spacer = Math.max(base, currentSpacer)
  let max = Math.max(0, currentMax + (spacer - currentSpacer))
  if (items.length === 0) return spacer

  for (let step = 0; step < 8; step += 1) {
    if (max <= 0) return spacer
    const fadeEnd = max + pad
    let needMore = 0
    for (const item of items) {
      const left = item.left
      const right = left + item.width
      if (right <= max + 1) continue
      if (left >= max + clientWidth - 1) break

      const thin = thinRemnantPx(item.width, pad)
      const pastFade = Math.max(0, right - fadeEnd)
      const substantial = pastFade >= thin
      if (!substantial) continue
      if (left < fadeEnd - 1) {
        // Scroll further until only a thin remnant remains under the fade.
        const targetMax = right - thin
        needMore = Math.max(0, targetMax - max)
      }
      break
    }
    if (needMore <= 0) break
    spacer += needMore
    max += needMore
  }
  return Math.ceil(spacer)
}

/**
 * End snap = true max (scrollWidth − clientWidth).
 * Left-fade clearance is achieved by {@link computeEndSpacerPx}, not pull-back.
 */
export function computeEndSnapScrollLeft(
  _items: SnapItem[],
  clientWidth: number,
  scrollWidth: number,
  _pad: number,
  _clearance = SCROLL_ROW_FADE_CLEARANCE_PX,
): number {
  return Math.max(0, scrollWidth - clientWidth)
}

/** How many px of a substantial card sit under the left fade at scrollLeft. */
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
    el.scrollLeft = max
    return max
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
      el.scrollLeft = max
      return max
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
 * HOT-01: end = true max; trailing spacer keeps last card fully visible and
 * left fade over remnant/empty only (no pull-back that hides the last card).
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
  const [endSpacerPx, setEndSpacerPx] = useState(SCROLL_ROW_FADE_CLEARANCE_PX)
  const itemSelectorRef = useRef(itemSelector)
  itemSelectorRef.current = itemSelector

  const updateEndSpacer = () => {
    const el = scrollerRef.current
    const spacerEl = spacerRef.current
    if (!el) return
    const nodes = Array.from(
      el.querySelectorAll<HTMLElement>(itemSelectorRef.current),
    )
    const items = nodes.map((n) => ({
      left: n.offsetLeft,
      width: n.offsetWidth,
    }))
    const pad = scrollPadStartPx(el)
    const currentSpacer = spacerEl?.offsetWidth ?? endSpacerPx
    const currentMax = Math.max(0, el.scrollWidth - el.clientWidth)
    const next = computeEndSpacerPx(
      items,
      el.clientWidth,
      currentMax,
      currentSpacer,
      pad,
    )
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
    const settleSnap = () => {
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(() => {
        const max = Math.max(0, el.scrollWidth - el.clientWidth)
        if (max <= 0) return
        const nearEnd = el.scrollLeft >= max - 24
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
      if (el.scrollLeft >= max - 24) {
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
