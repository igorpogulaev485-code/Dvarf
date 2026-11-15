import { useEffect, useMemo, useState } from 'react'
import {
  ensureCombatTourSurface,
  hasVisibleOnboardingAnchor,
  resolveSheetTourAnchor,
} from './anchors'
import { Coachmark } from './Coachmark'
import { TOUR_STEPS } from './copy.ru'
import type { SheetTourStepId } from './types'

type SheetTourProps = {
  open: boolean
  onComplete: () => void
  onSkip: () => void
}

function pickAnchor(stepId: SheetTourStepId, fallback: string): string {
  const narrow =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 959px)').matches
  return resolveSheetTourAnchor(stepId, fallback, {
    narrow,
    hasVisible: (anchor) => hasVisibleOnboardingAnchor(anchor),
  })
}

export function SheetTour({ open, onComplete, onSkip }: SheetTourProps) {
  const [index, setIndex] = useState(0)
  const [surfaceTick, setSurfaceTick] = useState(0)
  const steps = TOUR_STEPS
  const step = steps[Math.min(index, steps.length - 1)]

  // Reset when tour re-opens (create bridge / «Показать подсказки снова»).
  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  // Before «Ход в Бою»: switch to combat + Атаки so the turn row is on screen.
  useEffect(() => {
    if (!open || !step || step.id !== 'turn_actions') return
    ensureCombatTourSurface()
    const t1 = window.setTimeout(() => {
      ensureCombatTourSurface()
      setSurfaceTick((n) => n + 1)
    }, 50)
    const t2 = window.setTimeout(() => setSurfaceTick((n) => n + 1), 220)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [open, step, index])

  const stepLabel = useMemo(
    () => `Подсказка ${Math.min(index + 1, steps.length)} из ${steps.length}`,
    [index, steps.length],
  )

  const tourBody = useMemo(() => {
    if (!step) return ''
    const narrow =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 959px)').matches
    // Collapsed mobile vitals: name + hits + expand arrow (see MobileVitalsBar).
    if (narrow && step.id === 'combat_header') {
      return (
        'Сверху имя и хиты. Нажми хиты, чтобы изменить, а стрелку — чтобы увидеть КД, скорость и отдых.'
      )
    }
    if (narrow && step.id === 'desk_modes') {
      return (
        'Пять вкладок — пять ситуаций за столом: Бой, Исследование, Общение, Напарники, Способности. ' +
        'Зажми вкладку — коротко напомним, что внутри.'
      )
    }
    if (narrow && step.id === 'turn_actions') {
      return (
        'В сцене «Бой» строка «Действие / Бонусное / Реакция»: нажми — появятся варианты, потраченное отмечается галкой.'
      )
    }
    return step.body
  }, [step])

  const tourTitle = useMemo(() => {
    if (!step) return ''
    return step.title
  }, [step])

  if (!open || !step) return null

  const isLast = index >= steps.length - 1
  // surfaceTick forces re-pick after combat switch layout settles.
  void surfaceTick
  const anchor = pickAnchor(step.id, step.anchor)
  const hasHole = hasVisibleOnboardingAnchor(anchor)

  return (
    <Coachmark
      open={open}
      anchorSelector={hasHole ? `[data-onboarding="${anchor}"]` : '[data-onboarding="__missing__"]'}
      title={tourTitle}
      body={tourBody}
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
