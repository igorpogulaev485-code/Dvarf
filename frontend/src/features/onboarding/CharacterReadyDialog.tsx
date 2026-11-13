import { Dialog, Stack, Text } from '../../ui'
import { READY_BRIDGE } from './copy.ru'

type CharacterReadyDialogProps = {
  open: boolean
  onOpenWithTour: () => void
  onOpenSkipTour: () => void
}

function readyBody(): string {
  if (typeof window === 'undefined') return READY_BRIDGE.bodyDesktop
  const narrow = window.matchMedia('(max-width: 959px)').matches
  return narrow ? READY_BRIDGE.bodyMobile : READY_BRIDGE.bodyDesktop
}

export function CharacterReadyDialog({
  open,
  onOpenWithTour,
  onOpenSkipTour,
}: CharacterReadyDialogProps) {
  return (
    <Dialog
      open={open}
      title={READY_BRIDGE.title}
      primaryLabel={READY_BRIDGE.withTour}
      secondaryLabel={READY_BRIDGE.skipTour}
      onPrimary={onOpenWithTour}
      onSecondary={onOpenSkipTour}
      size="wide"
    >
      <Stack gap={10}>
        <Text>{readyBody()}</Text>
      </Stack>
    </Dialog>
  )
}
