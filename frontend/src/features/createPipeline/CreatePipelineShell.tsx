import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Button, Dialog, Stack, Text } from '../../ui'
import {
  CREATE_PIPELINE_STEP_LABELS,
  CREATE_PIPELINE_STEPS,
  type CreatePipelineStepId,
} from './createPipelineTypes'

type CreatePipelineShellProps = {
  step: CreatePipelineStepId
  /** Visible steps (feat may be omitted). Defaults to full canonical list. */
  steps?: readonly CreatePipelineStepId[]
  title: string
  subtitle?: string
  /** Optional onboarding what/why under the subtitle. */
  stepHint?: ReactNode
  cards: ReactNode
  detail: ReactNode
  footer?: ReactNode
  onStepClick?: (step: CreatePipelineStepId) => void
  onBack?: () => void
  backDisabled?: boolean
  /**
   * Abilities / leveling: interactive work lives in `detail`.
   * On phone, show detail as the stage and put `cards` into Сводка.
   * Catalog steps keep cards as the stage and detail in Сводка.
   */
  detailPrimary?: boolean
}

/** Pure edge flags for the mobile step strip (selfcheck + UI). */
export function createPipelineStepsScrollEdges(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
  epsilon = 1,
): { canScrollLeft: boolean; canScrollRight: boolean } {
  if (scrollWidth <= clientWidth + epsilon) {
    return { canScrollLeft: false, canScrollRight: false }
  }
  return {
    canScrollLeft: scrollLeft > epsilon,
    canScrollRight: scrollLeft + clientWidth < scrollWidth - epsilon,
  }
}

function scrollStepsByApproxOneChip(el: HTMLElement, direction: 1 | -1) {
  const chip = el.querySelector<HTMLElement>('.create-pipeline__step')
  const delta = chip ? chip.offsetWidth + 8 : Math.max(120, el.clientWidth * 0.45)
  el.scrollBy({ left: direction * delta, behavior: 'smooth' })
}

export function CreatePipelineShell({
  step,
  steps = CREATE_PIPELINE_STEPS,
  title,
  subtitle,
  stepHint,
  cards,
  detail,
  footer,
  onStepClick,
  onBack,
  backDisabled,
  detailPrimary = false,
}: CreatePipelineShellProps) {
  const [summaryOpen, setSummaryOpen] = useState(false)
  const stepsRef = useRef<HTMLElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const currentIndex = steps.indexOf(step)
  const stepNumber = currentIndex >= 0 ? currentIndex + 1 : 1
  const stepTotal = steps.length
  const progressPct = Math.round((stepNumber / Math.max(1, stepTotal)) * 100)

  useEffect(() => {
    setSummaryOpen(false)
  }, [step])

  const updateScrollHints = () => {
    const el = stepsRef.current
    if (!el) return
    const edges = createPipelineStepsScrollEdges(el.scrollLeft, el.clientWidth, el.scrollWidth)
    setCanScrollLeft(edges.canScrollLeft)
    setCanScrollRight(edges.canScrollRight)
  }

  useLayoutEffect(() => {
    const el = stepsRef.current
    if (!el) return
    const active = el.querySelector<HTMLElement>('.create-pipeline__step--active')
    active?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
    updateScrollHints()
  }, [step, stepTotal])

  useEffect(() => {
    const el = stepsRef.current
    if (!el) return

    const onScroll = () => updateScrollHints()
    el.addEventListener('scroll', onScroll, { passive: true })

    const ro = new ResizeObserver(() => updateScrollHints())
    ro.observe(el)
    for (const child of Array.from(el.children)) {
      if (child instanceof HTMLElement) ro.observe(child)
    }
    window.addEventListener('resize', updateScrollHints)

    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
      window.removeEventListener('resize', updateScrollHints)
    }
  }, [stepTotal])

  const summaryBody = detailPrimary ? cards : detail
  const summaryTitle = detailPrimary ? 'Сводка' : 'Сводка выбора'
  const closeSummary = () => setSummaryOpen(false)

  return (
    <div
      className={`create-pipeline${detailPrimary ? ' create-pipeline--detail-primary' : ''}`}
    >
      <header className="create-pipeline__header create-pipeline__steprrail">
        <Stack gap={6} className="create-pipeline__steprrail-intro">
          <Text as="h1" className="create-pipeline__title">
            {title}
          </Text>
          {subtitle ? (
            <Text tone="muted" className="create-pipeline__subtitle">
              {subtitle}
            </Text>
          ) : null}
          {stepHint}
        </Stack>

        <div className="create-pipeline__progress">
          <div className="create-pipeline__progress-meta" aria-live="polite">
            <span>
              Шаг {stepNumber} из {stepTotal}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div
            key={step}
            className="create-pipeline__progress-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            aria-valuetext={`${progressPct} процентов`}
            aria-label="Прогресс создания персонажа"
          >
            <div
              className="create-pipeline__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="create-pipeline__steps-wrap">
          {canScrollLeft ? (
            <>
              <div
                className="create-pipeline__steps-fade create-pipeline__steps-fade--left"
                aria-hidden="true"
              />
              <button
                type="button"
                className="create-pipeline__steps-arrow create-pipeline__steps-arrow--left"
                aria-label="Прокрутить шаги влево"
                onClick={() => {
                  const el = stepsRef.current
                  if (el) scrollStepsByApproxOneChip(el, -1)
                }}
              >
                ‹
              </button>
            </>
          ) : null}
          {canScrollRight ? (
            <>
              <div
                className="create-pipeline__steps-fade create-pipeline__steps-fade--right"
                aria-hidden="true"
              />
              <button
                type="button"
                className="create-pipeline__steps-arrow create-pipeline__steps-arrow--right"
                aria-label="Прокрутить шаги вправо"
                onClick={() => {
                  const el = stepsRef.current
                  if (el) scrollStepsByApproxOneChip(el, 1)
                }}
              >
                ›
              </button>
            </>
          ) : null}
          <nav
            ref={stepsRef}
            className="create-pipeline__steps"
            aria-label="Шаги создания"
          >
            {steps.map((id, index) => {
              const active = id === step
              const done = index < currentIndex
              const reachable = index <= currentIndex
              const className = [
                'create-pipeline__step',
                active ? 'create-pipeline__step--active' : '',
                done ? 'create-pipeline__step--done' : '',
                !reachable ? 'create-pipeline__step--locked' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={id}
                  type="button"
                  className={className}
                  disabled={!reachable || !onStepClick}
                  onClick={() => onStepClick?.(id)}
                >
                  <span className="create-pipeline__step-index">{index + 1}</span>
                  <span className="create-pipeline__step-label">
                    {CREATE_PIPELINE_STEP_LABELS[id]}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <div className="create-pipeline__body">
        <aside className="create-pipeline__cards">{cards}</aside>
        <section className="create-pipeline__detail">{detail}</section>
      </div>

      <footer className="create-pipeline__footer">
        <div className="create-pipeline__footer-left">
          {onBack ? (
            <Button variant="ghost" disabled={backDisabled} onClick={onBack}>
              ← Назад
            </Button>
          ) : null}
        </div>
        <Text tone="muted" className="create-pipeline__footer-progress" aria-live="polite">
          Шаг {stepNumber} из {stepTotal}
        </Text>
        <div className="create-pipeline__footer-mid">
          <Button
            type="button"
            variant="secondary"
            className="create-pipeline__summary-btn"
            onClick={() => setSummaryOpen(true)}
          >
            Сводка
          </Button>
        </div>
        <div className="create-pipeline__footer-right">{footer}</div>
      </footer>

      <Dialog
        open={summaryOpen}
        title={summaryTitle}
        size="wide"
        primaryLabel="Закрыть"
        onPrimary={closeSummary}
        onSecondary={closeSummary}
        closeOnBackdrop
      >
        <div className="create-pipeline__summary-sheet">{summaryBody}</div>
      </Dialog>
    </div>
  )
}
