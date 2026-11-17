import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BottomSheet, DiceFab, FloatingPanel } from '../../ui'
import { DiceRollerPanel } from './DiceRollerPanel'
import { subscribeDiceJournalOpen } from './journalBridge'
import type { DiceLogEntry } from './types'
import type { RollHistoryEntry } from '../characters/playDeskUi'

const DESKTOP_MQ = '(min-width: 960px)'

type Props = {
  characterId: string
  /** Optional seed log (preview / screenshots). */
  initialLog?: DiceLogEntry[]
  /** Start open (e2e / screenshots). */
  defaultOpen?: boolean
  /** Open session → show «Только себе» and post free rolls. */
  openSessionId?: string | null
  /** Sheet history for one-time journal merge. */
  sheetRollHistory?: RollHistoryEntry[] | null
}

/**
 * FAB + panel host for a finished character sheet.
 * Desktop (≥960): floating panel above the bottom-right FAB.
 * Phone: bottom sheet (partial height).
 */
export function DiceRollerHost({
  characterId,
  initialLog,
  defaultOpen = false,
  openSessionId = null,
  sheetRollHistory = null,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [focusJournal, setFocusJournal] = useState(false)
  const [journalTab, setJournalTab] = useState<'mine'>('mine')
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MQ).matches : true,
  )
  const [coords, setCoords] = useState<{
    bottom: number
    right: number
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

  useEffect(() => {
    return subscribeDiceJournalOpen((req) => {
      if (req.characterId !== characterId) return
      setJournalTab(req.tab ?? 'mine')
      setFocusJournal(true)
      setOpen(true)
    })
  }, [characterId])

  const place = useCallback(() => {
    const fab = fabRef.current
    if (!fab) return
    const r = fab.getBoundingClientRect()
    const pad = 12
    const width = Math.min(400, window.innerWidth - pad * 2)
    const gap = 10
    const bottom = Math.max(pad, window.innerHeight - r.top + gap)
    const available = Math.max(280, r.top - pad - gap)
    setCoords({
      bottom,
      right: Math.max(pad, window.innerWidth - r.right),
      width,
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

  const close = useCallback(() => {
    setOpen(false)
    setFocusJournal(false)
  }, [])
  const liftForMobileNav =
    typeof document !== 'undefined' &&
    Boolean(document.querySelector('.mobile-scene-nav'))

  const panel = (
    <DiceRollerPanel
      characterId={characterId}
      initialLog={initialLog}
      openSessionId={openSessionId}
      sheetRollHistory={sheetRollHistory}
      focusJournal={focusJournal}
      journalTab={journalTab}
      onJournalTabChange={setJournalTab}
    />
  )

  return (
    <>
      <div className="ui-dice-fab-slot no-print">
        <DiceFab
          ref={fabRef}
          active={open}
          liftForMobileNav={liftForMobileNav}
          onClick={() => {
            setFocusJournal(false)
            setOpen((v) => !v)
          }}
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
                  right: coords.right,
                  width: coords.width,
                  maxHeight: coords.maxHeight,
                }
              : { bottom: 88, right: 16, width: 360, maxHeight: 520 }
          }
          panelClassName="no-print"
          className="no-print"
        >
          {panel}
        </FloatingPanel>
      ) : (
        <BottomSheet
          open={open}
          title="Бросок кубиков"
          onClose={close}
          className="no-print"
          maxHeightRatio={0.58}
        >
          {panel}
        </BottomSheet>
      )}
    </>
  )
}
