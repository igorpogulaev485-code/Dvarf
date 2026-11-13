import { Dialog, Stack, Text } from '../../ui'
import { WELCOME } from './copy.ru'
import type { OnboardingSegment } from './types'

type WelcomeDialogProps = {
  open: boolean
  onChoose: (segment: OnboardingSegment) => void
  /** Backdrop / Escape — close without picking a segment (not skip). */
  onDismiss?: () => void
}

export function WelcomeDialog({ open, onChoose, onDismiss }: WelcomeDialogProps) {
  return (
    <Dialog
      open={open}
      title={WELCOME.title}
      primaryLabel={WELCOME.dndNew}
      onPrimary={() => onChoose('dnd_new')}
      onDismiss={onDismiss}
      size="wide"
      showActions={false}
    >
      <Stack gap={12}>
        <Text>{WELCOME.body}</Text>
        <Text tone="muted">{WELCOME.question}</Text>
        <div className="onboarding-welcome__choices" role="group" aria-label={WELCOME.question}>
          <button
            type="button"
            className="onboarding-welcome__choice"
            onClick={() => onChoose('dnd_new')}
          >
            {WELCOME.dndNew}
          </button>
          <button
            type="button"
            className="onboarding-welcome__choice"
            onClick={() => onChoose('product_new')}
          >
            {WELCOME.productNew}
          </button>
          <button
            type="button"
            className="onboarding-welcome__choice onboarding-welcome__choice--muted"
            onClick={() => onChoose('skip')}
          >
            {WELCOME.skip}
          </button>
        </div>
      </Stack>
    </Dialog>
  )
}
