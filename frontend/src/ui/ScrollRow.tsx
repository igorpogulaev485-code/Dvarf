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

/**
 * Snap so a card starts just past the left fade (scroll-padding).
 * At end: prefer the rightmost snap where the last card stays fully visible —
 * fade covers only a clipped remnant of the previous card, not pips of a whole card.
 */
export function snapScrollLeft(
  el: HTMLElement,
  itemSelector: string,
  prefer: 'nearest' | 'start' | 'end' = 'nearest',
): number {
  const items = Array.from(el.querySelectorAll<HTMLElement>(itemSelector))
  if (items.length === 0) return el.scrollLeft
  const pad = scrollPadStartPx(el)
  const max = Math.max(0, el.scrollWidth - el.clientWidth)
  const rim = 6
  const candidates = items
    .map((item) => item.offsetLeft - pad)
    .filter((sl) => sl >= -0.5 && sl <= max + 0.5)
    .map((sl) => Math.max(0, Math.min(max, sl)))

  if (prefer === 'start') {
    el.scrollLeft = 0
    return 0
  }

  if (prefer === 'end') {
    // At max: if a mostly-visible card still starts under the left fade,
    // pull back so it clears — fade covers only a thin clipped remnant.
    let best = max
    const viewLeft = max
    const fadeEnd = max + pad
    for (const item of items) {
      const left = item.offsetLeft
      const right = left + item.offsetWidth
      if (right <= viewLeft + 1) continue
      const pastFade = Math.max(0, right - fadeEnd)
      const mostlyVisible =
        pastFade >= Math.min(pad, Math.floor(item.offsetWidth * 0.4))
      // Thin clipped remnant under the fade — skip to the next card.
      if (!mostlyVisible) continue
      if (left < fadeEnd - 1) {
        // Extra 8px past scroll-padding so soft fade/chevron clear the card face.
        const target = Math.max(0, Math.min(max, left - pad - 8))
        const last = items[items.length - 1]
        const lastRight = last.offsetLeft + last.offsetWidth - target
        // Allow a few px of the last card past the right rim.
        if (lastRight <= el.clientWidth + 24) {
          best = target
        }
      }
      break
    }
    // If we already pulled back for fade clearance, keep that offset —
    // re-snapping to start-align candidates would put the card under the fade again.
    if (best < max) {
      el.scrollLeft = best
      return best
    }
    // At raw max: optionally land on a start-snap that still shows the last card.
    const last = items[items.length - 1]
    let snapped = best
    let snappedDist = Infinity
    for (const sl of candidates) {
      const lastRight = last.offsetLeft + last.offsetWidth - sl
      if (lastRight > el.clientWidth - rim + 8) continue
      const d = Math.abs(sl - best)
      if (d < snappedDist) {
        snappedDist = d
        snapped = sl
      }
    }
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
    const settleSnap = () => {
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(() => {
        const max = Math.max(0, el.scrollWidth - el.clientWidth)
        if (max <= 0) return
        const pad = scrollPadStartPx(el)
        // Near end includes pull-back for fade clearance (pad + chevron).
        const nearEnd = el.scrollLeft >= max - Math.max(8, pad + 24)
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
      const pad = scrollPadStartPx(el)
      const nearEnd = el.scrollLeft >= max - Math.max(8, pad + 24)
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
