import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react'

/** Max pointer travel (px) that still counts as an intentional tap/click. */
export const INTENTIONAL_ACTIVATE_THRESHOLD_PX = 10

type GestureState = {
  x: number
  y: number
  moved: boolean
}

/** Survives React re-renders during a scroll gesture. */
const gestureByTarget = new WeakMap<EventTarget, GestureState>()

/**
 * Pointer props that fire `onActivate` only when the pointer did not travel
 * more than `thresholdPx` between down and click (scroll-safe on touch).
 * Mouse clicks without movement behave as before.
 */
export function intentionalActivateProps(
  onActivate: () => void,
  thresholdPx: number = INTENTIONAL_ACTIVATE_THRESHOLD_PX,
): {
  onPointerDown: (event: ReactPointerEvent) => void
  onPointerMove: (event: ReactPointerEvent) => void
  onPointerCancel: (event: ReactPointerEvent) => void
  onClick: (event: ReactMouseEvent) => void
} {
  return {
    onPointerDown: (event) => {
      gestureByTarget.set(event.currentTarget, {
        x: event.clientX,
        y: event.clientY,
        moved: false,
      })
    },
    onPointerMove: (event) => {
      const state = gestureByTarget.get(event.currentTarget)
      if (!state || state.moved) return
      const dx = event.clientX - state.x
      const dy = event.clientY - state.y
      if (Math.hypot(dx, dy) > thresholdPx) state.moved = true
    },
    onPointerCancel: (event) => {
      const state = gestureByTarget.get(event.currentTarget)
      if (state) state.moved = true
    },
    onClick: (event) => {
      const state = gestureByTarget.get(event.currentTarget)
      gestureByTarget.delete(event.currentTarget)
      if (state?.moved) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      onActivate()
    },
  }
}
