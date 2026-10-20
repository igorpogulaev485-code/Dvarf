import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ValueTipCard } from './valueTips.ru'

type Coords = { top: number; left: number }

/**
 * Renders nothing visible by itself. Parent must have `.has-onboarding-tip`.
 * On hover/focus of that parent — fixed portal tip (escapes overflow clips).
 */
export function HoverTipCard({ tip }: { tip: ValueTipCard }) {
  const probeRef = useRef<HTMLSpanElement | null>(null)
  const [coords, setCoords] = useState<Coords | null>(null)

  useEffect(() => {
    const el = probeRef.current?.closest('.has-onboarding-tip')
    if (!(el instanceof HTMLElement)) return
    const host = el

    let showTimer = 0

    function place() {
      const r = host.getBoundingClientRect()
      const width = Math.min(280, window.innerWidth * 0.72)
      const alignRight =
        host.classList.contains('play-desk-header__hp') ||
        host.classList.contains('play-desk-header__rest') ||
        host.classList.contains('play-desk-header__chip')
      let left = alignRight ? r.right - width : r.left + r.width / 2 - width / 2
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
      const estimatedH = 150
      const preferUp = r.bottom + 8 + estimatedH > window.innerHeight - 8
      const top = preferUp ? Math.max(8, r.top - 8 - estimatedH) : r.bottom + 8
      setCoords({ top, left })
    }

    function onEnter() {
      window.clearTimeout(showTimer)
      showTimer = window.setTimeout(place, 200)
    }

    function onLeave() {
      window.clearTimeout(showTimer)
      setCoords(null)
    }

    function onFocusOut(event: FocusEvent) {
      if (!host.contains(event.relatedTarget as Node)) onLeave()
    }

    host.addEventListener('mouseenter', onEnter)
    host.addEventListener('mouseleave', onLeave)
    host.addEventListener('focusin', onEnter)
    host.addEventListener('focusout', onFocusOut)
    return () => {
      window.clearTimeout(showTimer)
      host.removeEventListener('mouseenter', onEnter)
      host.removeEventListener('mouseleave', onLeave)
      host.removeEventListener('focusin', onEnter)
      host.removeEventListener('focusout', onFocusOut)
    }
  }, [tip.title])

  return (
    <>
      <span ref={probeRef} className="onboarding-hover-tip__probe" aria-hidden="true" />
      {coords
        ? createPortal(
            <div
              className="onboarding-hover-tip__card onboarding-hover-tip__card--fixed"
              style={{ top: coords.top, left: coords.left }}
              role="tooltip"
            >
              <b>{tip.title}</b>
              <span className="onboarding-hover-tip__meaning">{tip.meaning}</span>
              <small>{tip.use}</small>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
