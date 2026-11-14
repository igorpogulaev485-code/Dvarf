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

/**
 * Kit horizontal scroll row — one line, no wrap.
 * Edge cue: ~40px fade overlay + small semi-transparent round ‹/›,
 * only on the side that can still scroll.
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

  const updateScrollHints = () => {
    const el = scrollerRef.current
    if (!el) return
    const edges = scrollRowEdges(el.scrollLeft, el.clientWidth, el.scrollWidth)
    setCanScrollLeft(edges.canScrollLeft)
    setCanScrollRight(edges.canScrollRight)
  }

  useLayoutEffect(() => {
    updateScrollHints()
    // Fonts / late flex layout can change scrollWidth after first paint.
    const raf = requestAnimationFrame(() => {
      updateScrollHints()
      requestAnimationFrame(updateScrollHints)
    })
    return () => cancelAnimationFrame(raf)
  }, [watchKey])

  useEffect(() => {
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
    document.fonts?.ready?.then?.(() => updateScrollHints()).catch?.(() => {})

    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onWheel)
      ro.disconnect()
      window.removeEventListener('resize', updateScrollHints)
    }
  }, [watchKey])

  return (
    <div className={`ui-scroll-row ${shellClassName}`.trim()}>
      {canScrollLeft ? (
        <button
          type="button"
          className="ui-scroll-row__edge ui-scroll-row__edge--left"
          aria-label="Прокрутить влево"
          onClick={() => {
            const el = scrollerRef.current
            if (el) scrollByApproxOneItem(el, -1, itemSelector)
          }}
        >
          <span className="ui-scroll-row__chevron" aria-hidden="true">
            ‹
          </span>
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          className="ui-scroll-row__edge ui-scroll-row__edge--right"
          aria-label="Прокрутить вправо"
          onClick={() => {
            const el = scrollerRef.current
            if (el) scrollByApproxOneItem(el, 1, itemSelector)
          }}
        >
          <span className="ui-scroll-row__chevron" aria-hidden="true">
            ›
          </span>
        </button>
      ) : null}
      <div className={className} ref={scrollerRef} aria-label={ariaLabel}>
        {children}
      </div>
    </div>
  )
}
