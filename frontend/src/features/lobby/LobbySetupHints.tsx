import { Panel, Stack, Text } from '../../ui'
import {
  computeSetupHintSteps,
  shouldShowSetupHints,
  type SetupHintStep,
} from './lobbySetupHints'
import type { LobbyDetail } from '../../shared/api/lobbies'

type Props = {
  lobby: LobbyDetail
}

function StepRow({ step }: { step: SetupHintStep }) {
  return (
    <li
      className={
        step.done ? 'lobby-setup-hints__step is-done' : 'lobby-setup-hints__step'
      }
    >
      <span className="lobby-setup-hints__mark" aria-hidden>
        {step.done ? '✓' : String(['invite', 'session', 'play'].indexOf(step.id) + 1)}
      </span>
      <Text tone={step.done ? 'muted' : undefined}>{step.title}</Text>
    </li>
  )
}

export function LobbySetupHints({ lobby }: Props) {
  if (!shouldShowSetupHints(lobby)) return null
  const steps = computeSetupHintSteps(lobby)
  return (
    <Panel title="С чего начать" className="lobby-setup-hints">
      <Stack gap={10}>
        <Text tone="muted">Три шага — подсказка исчезнет, когда все будут сделаны.</Text>
        <ol className="lobby-setup-hints__list">
          {steps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </ol>
      </Stack>
    </Panel>
  )
}
