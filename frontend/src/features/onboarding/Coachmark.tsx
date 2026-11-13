import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Stack, Text } from '../../ui'
import { acquireBodyScrollLock } from '../../ui/bodyScrollLock'
import { queryVisibleAnchor } from './anchors'

type CoachmarkProps = {
  open: boolean
  anchorSelector: string
  title: string
  body: string
  stepLabel: string
  primaryLabel: string
  secondaryLabel?: string
  onPrimary: () => void
  onSecondary?: () => void
}

type Rect = { top: number; left: number; width: number; height: number }
type CardPos = { top: number; left: number; width: number }

function readRect(selector: string): Rect | null {
  const el = queryVisibleAnchor(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 && r.height < 2) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

function scrollAnchorIntoView(selector: string): void {
  const el = queryVisibleAnchor(selector)
  if (!el) return
  try {
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' as ScrollBehavior })
  } catch {
    el.scrollIntoView(true)
  }
}

function placeCard(hole: Rect | null, cardHeight: number): CardPos {
  const narrow =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 959px)').matches
  const bottomSafe = narrow ? 80 : 16
  const gap = 12
  const cardWidth = Math.min(300, window.innerWidth - 24)
  const height = Math.max(cardHeight, narrow ? 220 : 180)

  if (!hole) {
    return {
      top: Math.max(24, window.innerHeight * 0.28),
      left: Math.max(12, (window.innerWidth - cardWidth) / 2),
      width: cardWidth,
    }
  }

  const spaceBelow = window.innerHeight - (hole.top + hole.height) - bottomSafe
  const holeNearBottom = hole.top + hole.height > window.innerHeight - bottomSafe - 24
  const placeAbove = holeNearBottom || spaceBelow < height + gap

  let top = placeAbove ? hole.top - height - gap : hole.top + hole.height + gap
  if (placeAbove) {
    // Never cover the spotlighted bottom control (mobile scenes / help).
    top = Math.min(top, hole.top - height - gap)
    top = Math.max(12, top)
  } else {
    top = Math.min(top, window.innerHeight - bottomSafe - height)
    top = Math.max(12, top)
  }

  return {
    top,
    left: Math.min(Math.max(12, hole.left), window.innerWidth - cardWidth - 12),
    width: cardWidth,
  }
}

export function Coachmark({
  open,
  anchorSelector,
  title,
  body,
  stepLabel,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: CoachmarkProps) {
  const [rect, setRect] = useState<Rect | null>(null)
  const [cardHeight, setCardHeight] = useState(220)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      setRect(null)
      return
    }
    let cancelled = false
    let raf = 0
    scrollAnchorIntoView(anchorSelector)
    function measure() {
      if (cancelled) return
      const next = readRect(anchorSelector)
      // Ignore absurd readings (e.g. mid-layout flashes far below the fold).
      if (next && next.top > window.innerHeight + 40) return
      setRect(next)
    }
    measure()
    raf = window.requestAnimationFrame(() => {
      measure()
      raf = window.requestAnimationFrame(measure)
    })
    const target = queryVisibleAnchor(anchorSelector)
    const ro =
      target && 'ResizeObserver' in window
        ? new ResizeObserver(() => measure())
        : null
    if (target && ro) ro.observe(target)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    const t1 = window.setTimeout(measure, 50)
    const t2 = window.setTimeout(measure, 200)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      ro?.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, anchorSelector])

  useLayoutEffect(() => {
    if (!open) return
    const el = cardRef.current
    if (!el) return
    const apply = () => {
      const h = el.getBoundingClientRect().height
      if (h > 2) setCardHeight(h)
    }
    apply()
    const ro =
      'ResizeObserver' in window ? new ResizeObserver(() => apply()) : null
    if (ro) ro.observe(el)
    return () => ro?.disconnect()
  }, [open, title, body, stepLabel, primaryLabel, secondaryLabel, rect])

  useEffect(() => {
    if (!open) return
    document.body.classList.add('onboarding-tour-active')
    // Lock after first layout measure so anchors keep stable viewport rects.
    const release = acquireBodyScrollLock()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && onSecondary) {
        event.preventDefault()
        onSecondary()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('onboarding-tour-active')
      release()
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onSecondary])

  if (!open) return null

  const pad = 8
  const hole = rect
    ? {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null

  const cardStyle = placeCard(hole, cardHeight)

  return createPortal(
    <div className="onboarding-coach" role="dialog" aria-modal="true" aria-labelledby="onboarding-coach-title">
      {/* Full-screen click catcher — hole is visual-only (B2). */}
      <div className="onboarding-coach__blocker" aria-hidden />
      {hole ? (
        <div
          className="onboarding-coach__hole"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
          aria-hidden
        />
      ) : (
        <div className="onboarding-coach__dim" aria-hidden />
      )}
      <div ref={cardRef} className="onboarding-coach__card" style={cardStyle}>
        <Text tone="muted" className="onboarding-coach__step">
          {stepLabel}
        </Text>
        <h2 id="onboarding-coach-title" className="ui-text onboarding-coach__title">
          {title}
        </h2>
        <Text className="onboarding-coach__body">{body}</Text>
        <Stack gap={8} className="onboarding-coach__actions">
          {secondaryLabel && onSecondary ? (
            <Button variant="ghost" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          ) : null}
          <Button onClick={onPrimary}>{primaryLabel}</Button>
        </Stack>
      </div>
    </div>,
    document.body,
  )
}
