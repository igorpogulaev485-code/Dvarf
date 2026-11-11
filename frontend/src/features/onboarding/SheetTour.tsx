import { useMemo, useState } from 'react'
import { Coachmark } from './Coachmark'
import { TOUR_STEPS } from './copy.ru'
import type { SheetTourStepId } from './types'

type SheetTourProps = {
  open: boolean
  onComplete: () => void
  onSkip: () => void
}

function resolveAnchor(stepId: SheetTourStepId, fallback: string): string {
  // Mobile: left rail (abilities + checklist) is hidden — point at visible controls.
  const narrow =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 959px)').matches
  if (!narrow) return fallback
  if (stepId === 'checklist') return 'help'
  return fallback
}

export function SheetTour({ open, onComplete, onSkip }: SheetTourProps) {
  const [index, setIndex] = useState(0)
  const steps = TOUR_STEPS
  const step = steps[Math.min(index, steps.length - 1)]

  const stepLabel = useMemo(
    () => `Подсказка ${Math.min(index + 1, steps.length)} из ${steps.length}`,
    [index, steps.length],
  )

  const tourBody = useMemo(() => {
    if (!step) return ''
    const narrow =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 959px)').matches
    if (narrow && step.id === 'desk_modes') {
      return (
        'Это не «ещё меню», а сцены за столом: Бой, Исследование, Общение, Напарники, Способности. ' +
        'Одна сцена = один job, лишнее спрятано. Начни с «Бой»; позже зажми вкладку — коротко напомним.'
      )
    }
    if (narrow && step.id === 'checklist') {
      return 'Необязательно заполнять всё сразу. Кнопка «Справка» — карта листа и словарь, если что-то забудешь.'
    }
    if (narrow && step.id === 'abilities') {
      return 'Характеристики открываются из шапки («Характеристики ▸» или «СИЛ»). Мастер просит проверку — бросок оттуда.'
    }
    return step.body
  }, [step])

  if (!open || !step) return null

  const isLast = index >= steps.length - 1
  const anchor = resolveAnchor(step.id, step.anchor)

  return (
    <Coachmark
      open={open}
      anchorSelector={`[data-onboarding="${anchor}"]`}
      title={step.title}
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
