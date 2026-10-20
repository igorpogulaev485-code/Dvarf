import { Dialog, Stack, Text } from '../../ui'
import { READY_BRIDGE } from './copy.ru'

type CharacterReadyDialogProps = {
  open: boolean
  onOpenWithTour: () => void
  onOpenSkipTour: () => void
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
        <Text>{READY_BRIDGE.body}</Text>
      </Stack>
    </Dialog>
  )
}
