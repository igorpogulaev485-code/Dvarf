import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DiceRollerPanel } from '../diceRoller/DiceRollerPanel'
import { BottomSheet, DiceFab, FloatingPanel } from '../../ui'
import { DiceMark } from './DiceMark'

const DESKTOP_MQ = '(min-width: 960px)'
/** Local key only. Not a character id, so the roll is not written into a hero journal. */
const SHELL_ROLL_KEY = 'shell-self'

type ShellDiceProps = {
  open: boolean
  onToggle: () => void
  onClose: () => void
}

export function ShellDice({ open, onToggle, onClose }: ShellDiceProps) {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MQ).matches : true,
  )
  const desktopRef = useRef<HTMLButtonElement | null>(null)
  const phoneRef = useRef<HTMLButtonElement | null>(null)
  const [phoneSlot, setPhoneSlot] = useState<HTMLElement | null>(null)
  const [coords, setCoords] = useState<{
    bottom: number
    right: number
    width: number
    maxHeight: number
  } | null>(null)

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const sync = () => setDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    setPhoneSlot(document.getElementById('shell-tab-dice-slot'))
    return () => mq.removeEventListener('change', sync)
  }, [])

  const place = useCallback(() => {
    const fab = desktop ? desktopRef.current : phoneRef.current
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
  }, [desktop])

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

  const panel = (
    <div className="shell-dice-panel">
      <p className="shell-dice-hint">Бросок для себя — никуда не записывается</p>
      <DiceRollerPanel characterId={SHELL_ROLL_KEY} />
    </div>
  )

  return (
    <>
      <div className="ui-dice-fab-slot no-print">
        <DiceFab
          ref={desktopRef}
          active={open}
          aria-label="к20"
          onClick={onToggle}
          data-testid="dice-fab"
        />
      </div>
      {phoneSlot
        ? createPortal(
            <button
              ref={phoneRef}
              type="button"
              className={`tab-fab no-print${open ? ' is-on' : ''}`}
              aria-label="к20"
              aria-pressed={open}
              title="к20"
              onClick={onToggle}
              data-testid="shell-tab-dice"
            >
              <DiceMark />
            </button>,
            phoneSlot,
          )
        : null}
      {desktop ? (
        <FloatingPanel
          open={open}
          title="Бросок кубиков"
          onClose={onClose}
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
          onClose={onClose}
          className="no-print"
          maxHeightRatio={0.58}
        >
          {panel}
        </BottomSheet>
      )}
    </>
  )
}
