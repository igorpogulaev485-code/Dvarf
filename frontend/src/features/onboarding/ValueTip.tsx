import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'
import type { ValueTipCard } from './valueTips.ru'

type ValueTipProps = {
  tip: ValueTipCard
  /** Force open (screenshots). */
  forceOpen?: boolean
  className?: string
  /** Prefer opening upward when near bottom of viewport. */
  preferUp?: boolean
}

type PopPos = { top: number; left: number; place: 'up' | 'down' }

export function ValueTip({ tip, forceOpen = false, className = '', preferUp = false }: ValueTipProps) {
  const [open, setOpen] = useState(forceOpen)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const popoverId = useId()
  const [pos, setPos] = useState<PopPos | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    function place() {
      const anchor = rootRef.current
      if (!anchor) return
      const r = anchor.getBoundingClientRect()
      const gap = 8
      const prefer = preferUp || r.bottom > window.innerHeight - 180
      const width = Math.min(260, window.innerWidth * 0.72)
      let left = r.left + r.width / 2 - width / 2
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
      if (prefer) {
        const popH = popRef.current?.offsetHeight ?? 140
        setPos({ top: Math.max(8, r.top - gap - popH), left, place: 'up' })
      } else {
        setPos({ top: r.bottom + gap, left, place: 'down' })
      }
    }
    place()
    const raf = window.requestAnimationFrame(place)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, preferUp, tip.title])

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      const t = event.target as Node
      if (rootRef.current?.contains(t)) return
      if (popRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle(event: SyntheticEvent) {
    event.preventDefault()
    event.stopPropagation()
    setOpen((v) => !v)
  }

  return (
    <span
      className={`onboarding-value-tip ${className}`.trim()}
      ref={rootRef}
      onClick={(event) => event.stopPropagation()}
    >
      {/* span, not button: often sits inside play-desk buttons (HP / chips). */}
      <span
        role="button"
        tabIndex={0}
        className="onboarding-value-tip__btn"
        aria-label={`Что значит: ${tip.title}`}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') toggle(event)
        }}
      >
        ?
      </span>
      {open && pos
        ? createPortal(
            <div
              ref={popRef}
              id={popoverId}
              className={`onboarding-value-tip__pop onboarding-value-tip__pop--portal onboarding-value-tip__pop--${pos.place}`}
              role="dialog"
              aria-label={tip.title}
              style={{ top: pos.top, left: pos.left }}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="onboarding-value-tip__title">{tip.title}</p>
              <p className="onboarding-value-tip__line">
                <strong>Что значит.</strong> {tip.meaning}
              </p>
              <p className="onboarding-value-tip__line onboarding-value-tip__line--muted">
                <strong>За столом.</strong> {tip.use}
              </p>
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
