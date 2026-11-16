import { useLayoutEffect, useRef, type RefObject } from 'react'

const DESKTOP_MQ = '(min-width: 960px)'

/**
 * Cap the left ability rail to the stage (center) height on desktop Play Desk.
 * CSS: max-height: var(--play-desk-stage-h) → left = min(content, stage).
 * Class is-rail-capped enables nested list scroll + keeps passives/foot visible.
 */
export function usePlayDeskRailCap(enabled: boolean): {
  leftRef: RefObject<HTMLElement | null>
  stageRef: RefObject<HTMLElement | null>
} {
  const leftRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const left = leftRef.current
    const stage = stageRef.current
    if (!enabled || !left || !stage) return

    const mq = window.matchMedia(DESKTOP_MQ)
    let measuring = false

    const clear = () => {
      left.style.removeProperty('--play-desk-stage-h')
      left.classList.remove('is-rail-capped')
    }

    const sync = () => {
      if (measuring) return
      if (!mq.matches) {
        clear()
        return
      }
      const stageH = Math.round(stage.getBoundingClientRect().height)
      if (stageH <= 0) {
        clear()
        return
      }

      measuring = true
      left.style.setProperty('--play-desk-stage-h', `${stageH}px`)
      const wasCapped = left.classList.contains('is-rail-capped')
      left.classList.remove('is-rail-capped')
      left.style.maxHeight = 'none'
      const contentH = left.scrollHeight
      left.style.removeProperty('max-height')
      const needsCap = contentH > stageH + 1
      if (needsCap) left.classList.add('is-rail-capped')
      else if (wasCapped) left.classList.remove('is-rail-capped')
      measuring = false
    }

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(sync)
    })
    ro.observe(stage)
    ro.observe(left)
    mq.addEventListener('change', sync)
    sync()

    return () => {
      ro.disconnect()
      mq.removeEventListener('change', sync)
      clear()
    }
  }, [enabled])

  return { leftRef, stageRef }
}
