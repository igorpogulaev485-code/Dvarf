import { useEffect, useMemo, useState } from 'react'
import {
  ensureLobbyTourSurface,
  hasVisibleOnboardingAnchor,
  resolveLobbyTourAnchor,
} from './anchors'
import { Coachmark } from './Coachmark'
import { LOBBY_TOUR } from './copy.ru'
import type { LobbyTourStepId, LobbyTourSurface } from './types'

type LobbyTourProps = {
  open: boolean
  /** Master / co-master — 5 steps across hub + session. */
  isMaster: boolean
  /** Which page mounts the tour (filters steps by surface). */
  surface: LobbyTourSurface
  /** Steps already completed this run (local multi-page progress). */
  seenSteps: LobbyTourStepId[]
  onStepSeen: (id: LobbyTourStepId) => void
  onComplete: () => void
  onSkip: () => void
}

type Step = {
  id: LobbyTourStepId
  surface: LobbyTourSurface
  anchor: string
  title: string
  body: string
  bodyNarrow?: string
}

function roleSteps(isMaster: boolean): Step[] {
  if (isMaster) {
    return LOBBY_TOUR.master.map((s) => ({
      id: s.id,
      surface: s.surface,
      anchor: s.anchor,
      title: s.title,
      body: s.body,
      bodyNarrow: s.bodyNarrow,
    }))
  }
  return LOBBY_TOUR.player.map((s) => ({
    id: s.id,
    surface: s.surface,
    anchor: s.anchor,
    title: s.title,
    body: s.body,
  }))
}

export function LobbyTour({
  open,
  isMaster,
  surface,
  seenSteps,
  onStepSeen,
  onComplete,
  onSkip,
}: LobbyTourProps) {
  const [surfaceTick, setSurfaceTick] = useState(0)
  const all = useMemo(() => roleSteps(isMaster), [isMaster])
  const remaining = useMemo(
    () => all.filter((s) => !seenSteps.includes(s.id)),
    [all, seenSteps],
  )
  const surfaceRemaining = useMemo(
    () => remaining.filter((s) => s.surface === surface),
    [remaining, surface],
  )
  const step = surfaceRemaining[0] ?? null
  const roleTotal = all.length
  const roleDoneCount = roleTotal - remaining.length
  const stepOrdinal = Math.min(roleDoneCount + 1, roleTotal)

  const stepLabel = useMemo(() => {
    const scope = isMaster ? 'Стол' : 'За столом'
    return `${scope} · ${stepOrdinal} из ${roleTotal}`
  }, [isMaster, stepOrdinal, roleTotal])

  // Prepare DOM (open invite accordion, roster tab, combat surface).
  useEffect(() => {
    if (!open || !step) return
    ensureLobbyTourSurface(step.id, surface)
    const t1 = window.setTimeout(() => {
      ensureLobbyTourSurface(step.id, surface)
      setSurfaceTick((n) => n + 1)
    }, 60)
    const t2 = window.setTimeout(() => setSurfaceTick((n) => n + 1), 220)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [open, step, surface])

  // Missing anchor → skip step (do not break the tour).
  useEffect(() => {
    if (!open || !step) return
    const t = window.setTimeout(() => {
      const resolved = resolveLobbyTourAnchor(step.id, step.anchor, {
        hasVisible: (a) => hasVisibleOnboardingAnchor(a),
      })
      if (hasVisibleOnboardingAnchor(resolved)) return
      const lastOverall = remaining.length <= 1
      onStepSeen(step.id)
      if (lastOverall) onComplete()
    }, 320)
    return () => window.clearTimeout(t)
  }, [open, step, remaining.length, onStepSeen, onComplete, surfaceTick])

  const tourBody = useMemo(() => {
    if (!step) return ''
    const narrow =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 959px)').matches
    if (narrow && step.bodyNarrow) return step.bodyNarrow
    return step.body
  }, [step, surfaceTick])

  if (!open || !step) return null

  void surfaceTick
  const isLastOverall = remaining.length <= 1
  const anchor = resolveLobbyTourAnchor(step.id, step.anchor, {
    hasVisible: (a) => hasVisibleOnboardingAnchor(a),
  })
  const hasHole = hasVisibleOnboardingAnchor(anchor)

  // While waiting for skip-missing effect, do not flash a hole-less coachmark.
  if (!hasHole) return null

  return (
    <Coachmark
      open={open}
      anchorSelector={`[data-onboarding="${anchor}"]`}
      title={step.title}
      body={tourBody}
      stepLabel={stepLabel}
      primaryLabel={isLastOverall ? 'Готово' : 'Далее'}
      secondaryLabel="Пропустить"
      onPrimary={() => {
        onStepSeen(step.id)
        if (isLastOverall) onComplete()
      }}
      onSecondary={() => {
        onSkip()
      }}
    />
  )
}
