import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Stack, Text } from '../../ui'
import { acquireBodyScrollLock } from '../../ui/bodyScrollLock'

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

function readRect(selector: string): Rect | null {
  const el = document.querySelector(selector)
  if (!(el instanceof HTMLElement)) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 && r.height < 2) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
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

  useLayoutEffect(() => {
    if (!open) {
      setRect(null)
      return
    }
    function measure() {
      setRect(readRect(anchorSelector))
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, anchorSelector])

  useEffect(() => {
    if (!open) return
    const release = acquireBodyScrollLock()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && onSecondary) {
        event.preventDefault()
        onSecondary()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
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

  const cardStyle = hole
    ? {
        top: Math.min(
          hole.top + hole.height + 12,
          window.innerHeight - 220,
        ),
        left: Math.min(
          Math.max(12, hole.left),
          window.innerWidth - 320,
        ),
      }
    : { top: '30%', left: '50%', transform: 'translateX(-50%)' as const }

  return createPortal(
    <div className="onboarding-coach" role="dialog" aria-modal="true" aria-labelledby="onboarding-coach-title">
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
      <div className="onboarding-coach__card" style={cardStyle}>
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
