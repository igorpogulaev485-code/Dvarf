import type { ReactNode } from 'react'
import { ScrollRow, scrollRowEdges } from '../../ui/ScrollRow'

/** @deprecated Prefer scrollRowEdges from ui/ScrollRow — kept for HotBar selfcheck. */
export function hotBarScrollEdges(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
  epsilon = 1,
): { canScrollLeft: boolean; canScrollRight: boolean } {
  return scrollRowEdges(scrollLeft, clientWidth, scrollWidth, epsilon)
}

type PlayDeskHotScrollWrapProps = {
  ariaLabel?: string
  className?: string
  children: ReactNode
  watchKey?: string | number
}

/** Desk hot strip — kit ScrollRow with play-desk item step selector. */
export function PlayDeskHotScrollWrap({
  ariaLabel,
  className = '',
  children,
  watchKey = '',
}: PlayDeskHotScrollWrapProps) {
  return (
    <ScrollRow
      ariaLabel={ariaLabel}
      className={className}
      shellClassName="play-desk__hot-wrap"
      watchKey={watchKey}
      itemSelector=":scope > .play-desk__hot-item, :scope > .play-desk__hot-more"
    >
      {children}
    </ScrollRow>
  )
}
