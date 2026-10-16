import type { ReactNode } from 'react'
import { Button, Stack, Text } from '../../ui'
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
  cards: ReactNode
  detail: ReactNode
  footer?: ReactNode
  onStepClick?: (step: CreatePipelineStepId) => void
  onBack?: () => void
  backDisabled?: boolean
}

export function CreatePipelineShell({
  step,
  steps = CREATE_PIPELINE_STEPS,
  title,
  subtitle,
  cards,
  detail,
  footer,
  onStepClick,
  onBack,
  backDisabled,
}: CreatePipelineShellProps) {
  const currentIndex = steps.indexOf(step)

  return (
    <div className="create-pipeline">
      <header className="create-pipeline__header">
        <Stack gap={8}>
          <Text as="h1" className="create-pipeline__title">
            {title}
          </Text>
          {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
        </Stack>
        <nav className="create-pipeline__steps" aria-label="Шаги создания">
          {steps.map((id, index) => {
            const active = id === step
            const reachable = index <= currentIndex
            return (
              <button
                key={id}
                type="button"
                className={
                  active
                    ? 'create-pipeline__step create-pipeline__step--active'
                    : reachable
                      ? 'create-pipeline__step'
                      : 'create-pipeline__step create-pipeline__step--locked'
                }
                disabled={!reachable || !onStepClick}
                onClick={() => onStepClick?.(id)}
              >
                <span className="create-pipeline__step-index">{index + 1}</span>
                <span>{CREATE_PIPELINE_STEP_LABELS[id]}</span>
              </button>
            )
          })}
        </nav>
      </header>

      <div className="create-pipeline__body">
        <aside className="create-pipeline__cards">{cards}</aside>
        <section className="create-pipeline__detail">{detail}</section>
      </div>

      <footer className="create-pipeline__footer">
        <div className="create-pipeline__footer-left">
          {onBack ? (
            <Button variant="ghost" disabled={backDisabled} onClick={onBack}>
              Назад
            </Button>
          ) : null}
        </div>
        <div className="create-pipeline__footer-right">{footer}</div>
      </footer>
    </div>
  )
}
