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

/**
 * Pure end-snap: leftmost substantial card must clear the left fade/‹.
 * Prefer max scroll; if a full-ish card would sit under the fade, pull back
 * even when that clips a few px of the last card on the right.
 * Thin remnant under fade is OK (symmetric to start).
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

  const viewLeft = max
  const fadeEnd = viewLeft + pad
  let best = max

  for (const item of items) {
    const left = item.left
    const right = left + item.width
    if (right <= viewLeft + 1) continue // fully scrolled off left
    if (left >= viewLeft + clientWidth - 1) break

    const pastFade = Math.max(0, right - fadeEnd)
    const substantial =
      pastFade >= Math.min(pad, Math.floor(item.width * 0.35))
    // Thin clipped remnant under the fade — leave it; check next card.
    if (!substantial) continue

    if (left < fadeEnd - 1) {
      // Always clear the face — never keep a substantial card under ‹/fade.
      best = Math.max(0, Math.min(max, left - pad - clearance))
    }
    break
  }

  // Valid max (remnant or empty under fade) — do not wander to a start-align.
  return best
}

/**
 * Snap so a card starts just past the left fade (scroll-padding).
 * At end: fade/‹ cover only a clipped remnant (or empty pad) — never a
 * substantial card face (symmetric to the right fade at start).
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

  // nearest: pick candidate closest to current scrollLeft
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
  // Also allow plain 0 / max as terminals
  if (Math.abs(0 - cur) < bestDist) best = 0
  if (Math.abs(max - cur) <= bestDist) {
    // prefer end snap helper logic when near max
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
    // Next card whose start is past the current snap line (scrollLeft + pad)
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
 * HOT-01: fade is visual-only; chevron is the hit target. Snap uses
 * scroll-padding so whole cards clear the fade (clipped remnant under it).
 */
export function ScrollRow({
  ariaLabel,
  className = '',
  shellClassName = '',
  children,
  watchKey = '',
  itemSelector = ':scope > *',
}: ScrollRowProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const itemSelectorRef = useRef(itemSelector)
  itemSelectorRef.current = itemSelector

  const updateScrollHints = () => {
    const el = scrollerRef.current
    if (!el) return
    // Mobile hot: scrollLeft can stick ~4px at "start" and falsely show ‹.
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
    // Logical end: fade-clear snap may sit below raw max — hide › there so
    // clicking › cannot park a full card under the left fade.
    if (edges.canScrollRight) {
      const nodes = Array.from(
        el.querySelectorAll<HTMLElement>(itemSelectorRef.current),
      )
      const items = nodes.map((n) => ({
        left: n.offsetLeft,
        width: n.offsetWidth,
      }))
      const logicalEnd = computeEndSnapScrollLeft(
        items,
        el.clientWidth,
        el.scrollWidth,
        scrollPadStartPx(el),
      )
      if (el.scrollLeft >= logicalEnd - edgeEpsilon) {
        setCanScrollRight(false)
        return
      }
    }
    setCanScrollRight(edges.canScrollRight)
  }

  useLayoutEffect(() => {
    updateScrollHints()
    const raf = requestAnimationFrame(() => {
      updateScrollHints()
      requestAnimationFrame(updateScrollHints)
    })
    return () => cancelAnimationFrame(raf)
  }, [watchKey])

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
        // Treat fade-clear end snap as the end zone (may be below raw max).
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

    const ro = new ResizeObserver(() => updateScrollHints())
    ro.observe(el)
    for (const child of Array.from(el.children)) {
      if (child instanceof HTMLElement) ro.observe(child)
    }
    window.addEventListener('resize', updateScrollHints)
    document.fonts?.ready?.then?.(() => updateScrollHints()).catch?.(() => {})

    return () => {
      if (settleTimer) clearTimeout(settleTimer)
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('scrollend', onScrollEnd)
      el.removeEventListener('wheel', onWheel)
      ro.disconnect()
      window.removeEventListener('resize', updateScrollHints)
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
      </div>
    </div>
  )
}
