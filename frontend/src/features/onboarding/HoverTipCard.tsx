import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ValueTipCard } from './valueTips.ru'

type Coords = { top: number; left: number }

const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 12

/**
 * Parent must have `.has-onboarding-tip`.
 * Desktop: hover/focus → tip.
 * Touch: long-press → sticky tip until tap outside / Escape.
 */
export function HoverTipCard({ tip }: { tip: ValueTipCard }) {
  const probeRef = useRef<HTMLSpanElement | null>(null)
  const [coords, setCoords] = useState<Coords | null>(null)
  const stickyRef = useRef(false)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const el = probeRef.current?.closest('.has-onboarding-tip')
    if (!(el instanceof HTMLElement)) return
    const host = el

    let showTimer = 0
    let pressTimer = 0
    let startX = 0
    let startY = 0

    function place() {
      const r = host.getBoundingClientRect()
      const width = Math.min(280, window.innerWidth * 0.72)
      const alignRight =
        host.classList.contains('play-desk-header__hp') ||
        host.classList.contains('play-desk-header__rest') ||
        host.classList.contains('play-desk-header__chip') ||
        host.classList.contains('mobile-vitals__hp') ||
        host.classList.contains('mobile-vitals__collapse-hp')
      let left = alignRight ? r.right - width : r.left + r.width / 2 - width / 2
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
      const estimatedH = 150
      const preferUp = r.bottom + 8 + estimatedH > window.innerHeight - 8
      const top = preferUp ? Math.max(8, r.top - 8 - estimatedH) : r.bottom + 8
      setCoords({ top, left })
    }

    function close() {
      window.clearTimeout(showTimer)
      window.clearTimeout(pressTimer)
      stickyRef.current = false
      setCoords(null)
    }

    function onEnter() {
      if (stickyRef.current) return
      window.clearTimeout(showTimer)
      showTimer = window.setTimeout(place, 200)
    }

    function onLeave() {
      if (stickyRef.current) return
      window.clearTimeout(showTimer)
      setCoords(null)
    }

    function onFocusOut(event: FocusEvent) {
      if (stickyRef.current) return
      if (!host.contains(event.relatedTarget as Node)) onLeave()
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) return
      const t = event.touches[0]
      startX = t.clientX
      startY = t.clientY
      suppressClickRef.current = false
      window.clearTimeout(pressTimer)
      pressTimer = window.setTimeout(() => {
        stickyRef.current = true
        suppressClickRef.current = true
        place()
        try {
          navigator.vibrate?.(10)
        } catch {
          /* ignore */
        }
      }, LONG_PRESS_MS)
    }

    function onTouchMove(event: TouchEvent) {
      const t = event.touches[0]
      if (!t) return
      if (
        Math.abs(t.clientX - startX) > MOVE_CANCEL_PX ||
        Math.abs(t.clientY - startY) > MOVE_CANCEL_PX
      ) {
        window.clearTimeout(pressTimer)
      }
    }

    function onTouchEnd() {
      window.clearTimeout(pressTimer)
    }

    function onClickCapture(event: Event) {
      if (!suppressClickRef.current) return
      event.preventDefault()
      event.stopPropagation()
      suppressClickRef.current = false
    }

    function onDocPointerDown(event: Event) {
      if (!stickyRef.current) return
      const target = event.target as Node | null
      if (host.contains(target)) return
      const tipEl = document.querySelector('.onboarding-hover-tip__card--fixed')
      if (tipEl?.contains(target)) return
      close()
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }

    host.addEventListener('mouseenter', onEnter)
    host.addEventListener('mouseleave', onLeave)
    host.addEventListener('focusin', onEnter)
    host.addEventListener('focusout', onFocusOut)
    host.addEventListener('touchstart', onTouchStart, { passive: true })
    host.addEventListener('touchmove', onTouchMove, { passive: true })
    host.addEventListener('touchend', onTouchEnd)
    host.addEventListener('touchcancel', onTouchEnd)
    host.addEventListener('click', onClickCapture, true)
    document.addEventListener('pointerdown', onDocPointerDown, true)
    document.addEventListener('keydown', onKey)

    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(pressTimer)
      host.removeEventListener('mouseenter', onEnter)
      host.removeEventListener('mouseleave', onLeave)
      host.removeEventListener('focusin', onEnter)
      host.removeEventListener('focusout', onFocusOut)
      host.removeEventListener('touchstart', onTouchStart)
      host.removeEventListener('touchmove', onTouchMove)
      host.removeEventListener('touchend', onTouchEnd)
      host.removeEventListener('touchcancel', onTouchEnd)
      host.removeEventListener('click', onClickCapture, true)
      document.removeEventListener('pointerdown', onDocPointerDown, true)
      document.removeEventListener('keydown', onKey)
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
