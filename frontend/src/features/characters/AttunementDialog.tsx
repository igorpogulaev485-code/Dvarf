import { Dialog } from '../../ui'
import {
  AttunementEditor,
  type AttunementEditorProps,
} from './AttunementPanel'

type AttunementDialogProps = AttunementEditorProps & {
  open: boolean
  onClose: () => void
}

/** Explore summary → pad/dialog (sole attunement UI; ЕЩЁ stage removed). */
export function AttunementDialog({
  open,
  onClose,
  attunements,
  inventoryItems,
  onChange,
}: AttunementDialogProps) {
  return (
    <Dialog
      open={open}
      title="Настроенные предметы"
      size="wide"
      primaryLabel="Готово"
      onPrimary={onClose}
      secondaryLabel="Закрыть"
      onSecondary={onClose}
    >
      <AttunementEditor
        attunements={attunements}
        inventoryItems={inventoryItems}
        onChange={onChange}
      />
    </Dialog>
  )
}
