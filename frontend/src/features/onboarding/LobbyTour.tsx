import { useMemo, useState } from 'react'
import { hasVisibleOnboardingAnchor } from './anchors'
import { Coachmark } from './Coachmark'
import { LOBBY_TOUR } from './copy.ru'
import type { LobbyTourStepId } from './types'

type LobbyTourProps = {
  open: boolean
  /** Master / co-master — one short step, no player toolbar reveal. */
  isMaster: boolean
  onComplete: () => void
  onSkip: () => void
}

type Step = {
  id: LobbyTourStepId
  anchor: string
  title: string
  body: string
}

function pickSteps(isMaster: boolean): Step[] {
  if (isMaster) {
    const m = LOBBY_TOUR.master
    return [{ id: m.id, anchor: m.anchor, title: m.title, body: m.body }]
  }
  return LOBBY_TOUR.player.map((s) => ({
    id: s.id,
    anchor: s.anchor,
    title: s.title,
    body: s.body,
  }))
}

function resolveLobbyAnchor(preferred: string, fallbacks: string[]): string {
  if (hasVisibleOnboardingAnchor(preferred)) return preferred
  for (const fb of fallbacks) {
    if (hasVisibleOnboardingAnchor(fb)) return fb
  }
  return preferred
}

export function LobbyTour({ open, isMaster, onComplete, onSkip }: LobbyTourProps) {
  const [index, setIndex] = useState(0)
  const steps = useMemo(() => pickSteps(isMaster), [isMaster])
  const step = steps[Math.min(index, steps.length - 1)]

  const stepLabel = useMemo(
    () => `Стол · ${Math.min(index + 1, steps.length)} из ${steps.length}`,
    [index, steps.length],
  )

  if (!open || !step) return null

  const isLast = index >= steps.length - 1
  const fallbacks =
    step.id === 'seat'
      ? ['lobby-join', 'lobby-seat-cta']
      : step.id === 'combat_view'
        ? ['lobby-own-card', 'lobby-initiative', 'lobby-your-turn-banner']
        : step.id === 'turn_economy'
          ? ['lobby-own-card', 'lobby-turn-chips']
          : ['lobby-master-toolbar', 'lobby-master-hint']
  const anchor = resolveLobbyAnchor(step.anchor, fallbacks)

  return (
    <Coachmark
      open={open}
      anchorSelector={`[data-onboarding="${anchor}"]`}
      title={step.title}
      body={step.body}
      stepLabel={stepLabel}
      primaryLabel={isLast ? 'Готово' : 'Далее'}
      secondaryLabel="Пропустить"
      onPrimary={() => {
        if (isLast) {
          onComplete()
          setIndex(0)
          return
        }
        setIndex((i) => i + 1)
      }}
      onSecondary={() => {
        onSkip()
        setIndex(0)
      }}
    />
  )
}
