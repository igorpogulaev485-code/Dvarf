import { useMemo, useState } from 'react'
import { hasVisibleOnboardingAnchor, resolveSheetTourAnchor } from './anchors'
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
        'Одна сцена = один контекст, лишнее спрятано. Начни с «Бой»; позже зажми вкладку — коротко напомним.'
      )
    }
    if (narrow && step.id === 'actions') {
      return (
        'Жесты игры: ударить или колдовать. Рядом чипы хода — отмечай действие, бонусное и реакцию, когда потратил.'
      )
    }
    if (narrow && step.id === 'checklist') {
      return 'Необязательно заполнять всё сразу. Кнопка «Справка» — карта листа и словарь, если что-то забудешь.'
    }
    if (narrow && step.id === 'abilities') {
      return 'Характеристики открываются из шапки («Характеристики ▸» или «СИЛ»). Мастер просит проверку — бросок оттуда.'
    }
    if (narrow && step.id === 'combat_header') {
      return (
        'Хиты, КД, скорость — живые числа сверху. В бою отмечай действие / бонусное / реакцию; «Новый ход» сбрасывает отметки.'
      )
    }
    return step.body
  }, [step])

  const tourTitle = useMemo(() => {
    if (!step) return ''
    const narrow =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 959px)').matches
    if (narrow && step.id === 'checklist') return 'Справка под рукой'
    return step.title
  }, [step])

  if (!open || !step) return null

  const isLast = index >= steps.length - 1
  const anchor = pickAnchor(step.id, step.anchor)

  return (
    <Coachmark
      open={open}
      anchorSelector={`[data-onboarding="${anchor}"]`}
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
