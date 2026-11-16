import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BottomSheet, DiceFab, FloatingPanel } from '../../ui'
import { DiceRollerPanel } from './DiceRollerPanel'
import type { DiceLogEntry } from './types'

const DESKTOP_MQ = '(min-width: 960px)'

type Props = {
  characterId: string
  /** Optional seed log (preview / screenshots). */
  initialLog?: DiceLogEntry[]
  /** Start open (e2e / screenshots). */
  defaultOpen?: boolean
}

/**
 * FAB + panel host for a finished character sheet.
 * Desktop (≥960): floating panel near the button.
 * Phone: bottom sheet (partial height).
 */
export function DiceRollerHost({
  characterId,
  initialLog,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MQ).matches : true,
  )
  const [coords, setCoords] = useState<{
    bottom: number
    left?: number
    right?: number
    width: number
    maxHeight: number
  } | null>(null)
  const fabRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const sync = () => setDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const place = useCallback(() => {
    const fab = fabRef.current
    if (!fab) return
    const r = fab.getBoundingClientRect()
    const pad = 12
    const width = Math.min(400, window.innerWidth - pad * 2)
    // Grow up from the FAB: height = min(content, viewport − pads − gap to FAB).
    const gap = 10
    const bottom = Math.max(pad, window.innerHeight - r.top + gap)
    const available = Math.max(280, r.top - pad - gap)
    const spaceRight = window.innerWidth - r.left - pad
    // FAB is bottom-left — open panel to the right of it when it fits.
    if (spaceRight >= width) {
      setCoords({
        bottom,
        left: Math.max(pad, Math.round(r.left)),
        width,
        maxHeight: available,
      })
      return
    }
    setCoords({
      bottom,
      right: pad,
      width: Math.min(width, window.innerWidth - pad * 2),
      maxHeight: available,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open || !desktop) {
      setCoords(null)
      return
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, desktop, place])

  const close = useCallback(() => setOpen(false), [])
  const liftForMobileNav =
    typeof document !== 'undefined' &&
    Boolean(document.querySelector('.mobile-scene-nav'))

  return (
    <>
      <div className="ui-dice-fab-slot no-print">
        <DiceFab
          ref={fabRef}
          active={open}
          liftForMobileNav={liftForMobileNav}
          onClick={() => setOpen((v) => !v)}
          data-testid="dice-fab"
        />
      </div>

      {desktop ? (
        <FloatingPanel
          open={open}
          title="Бросок кубиков"
          onClose={close}
          coords={
            coords
              ? {
                  bottom: coords.bottom,
                  left: coords.left,
                  right: coords.right,
                  width: coords.width,
                  maxHeight: coords.maxHeight,
                }
              : { bottom: 88, left: 16, width: 360, maxHeight: 520 }
          }
          panelClassName="no-print"
          className="no-print"
        >
          <DiceRollerPanel characterId={characterId} initialLog={initialLog} />
        </FloatingPanel>
      ) : (
        <BottomSheet
          open={open}
          title="Бросок кубиков"
          onClose={close}
          className="no-print"
          maxHeightRatio={0.58}
        >
          <DiceRollerPanel characterId={characterId} initialLog={initialLog} />
        </BottomSheet>
      )}
    </>
  )
}
