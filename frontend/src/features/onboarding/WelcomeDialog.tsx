import { Dialog, Stack, Text } from '../../ui'
import { WELCOME } from './copy.ru'
import type { OnboardingSegment } from './types'

type WelcomeDialogProps = {
  open: boolean
  onChoose: (segment: OnboardingSegment) => void
}

export function WelcomeDialog({ open, onChoose }: WelcomeDialogProps) {
  return (
    <Dialog
      open={open}
      title={WELCOME.title}
      primaryLabel={WELCOME.dndNew}
      secondaryLabel={WELCOME.skip}
      onPrimary={() => onChoose('dnd_new')}
      onSecondary={() => onChoose('skip')}
      size="wide"
    >
      <Stack gap={12}>
        <Text>{WELCOME.body}</Text>
        <Text tone="muted">{WELCOME.question}</Text>
        <button
          type="button"
          className="onboarding-welcome__alt"
          onClick={() => onChoose('product_new')}
        >
          {WELCOME.productNew}
        </button>
      </Stack>
    </Dialog>
  )
}
