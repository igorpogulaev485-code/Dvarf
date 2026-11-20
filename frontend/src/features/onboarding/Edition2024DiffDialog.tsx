import { Dialog, Stack, Text } from '../../ui'
import { EDITION_2024_DIFF } from './edition2024Diff.ru'

type Edition2024DiffDialogProps = {
  open: boolean
  onDone: () => void
}

/**
 * P24-M06: first-visit coach for rules_edition === '2024'.
 * Uses kit Dialog only — no custom CSS.
 */
export function Edition2024DiffDialog({ open, onDone }: Edition2024DiffDialogProps) {
  return (
    <Dialog
      open={open}
      title={EDITION_2024_DIFF.title}
      primaryLabel={EDITION_2024_DIFF.primaryLabel}
      onPrimary={onDone}
      onDismiss={onDone}
      size="wide"
      showClose
    >
      <div data-testid="edition-2024-diff-dialog">
        <Stack gap={12}>
          <Text>{EDITION_2024_DIFF.lead}</Text>
          <ul className="create-2024__list" data-testid="edition-2024-diff-list">
            {EDITION_2024_DIFF.items.map((item) => (
              <li key={item.id} data-testid={`edition-2024-diff-${item.id}`}>
                <Text>
                  <strong>{item.title}.</strong> {item.body}
                </Text>
              </li>
            ))}
          </ul>
        </Stack>
      </div>
    </Dialog>
  )
}
