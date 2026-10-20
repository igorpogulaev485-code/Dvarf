import { useMemo, useState } from 'react'
import { Coachmark } from './Coachmark'
import { TOUR_STEPS } from './copy.ru'

type SheetTourProps = {
  open: boolean
  onComplete: () => void
  onSkip: () => void
}

export function SheetTour({ open, onComplete, onSkip }: SheetTourProps) {
  const [index, setIndex] = useState(0)
  const steps = TOUR_STEPS
  const step = steps[Math.min(index, steps.length - 1)]

  const stepLabel = useMemo(
    () => `Подсказка ${Math.min(index + 1, steps.length)} из ${steps.length}`,
    [index, steps.length],
  )

  if (!open || !step) return null

  const isLast = index >= steps.length - 1

  return (
    <Coachmark
      open={open}
      anchorSelector={`[data-onboarding="${step.anchor}"]`}
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
