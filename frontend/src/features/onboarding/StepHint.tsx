import { Text } from '../../ui'
import { CREATE_STEP_HINTS } from './copy.ru'
import type { CreatePipelineStepId } from '../createPipeline/createPipelineTypes'

type StepHintProps = {
  step: CreatePipelineStepId
  visible?: boolean
}

export function StepHint({ step, visible = true }: StepHintProps) {
  if (!visible) return null
  const hint = CREATE_STEP_HINTS[step]
  return (
    <div className="onboarding-step-hint" role="note">
      <Text>
        <strong>Что это.</strong> {hint.what}
      </Text>
      <Text tone="muted">
        <strong>Зачем.</strong> {hint.why}
      </Text>
    </div>
  )
}
