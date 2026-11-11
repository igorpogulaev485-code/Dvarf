import { useState } from 'react'
import { Dialog, Field, NumberInput, Text } from '../../ui'

type ConsumableSpendPadDialogProps = {
  open: boolean
  itemName: string
  maxQty: number
  onClose: () => void
  onConfirm: (amount: number) => void
}

/** Qty → confirm. Title carries the item name (fixes “хз какой предмет”). */
export function ConsumableSpendPadDialog({
  open,
  itemName,
  maxQty,
  onClose,
  onConfirm,
}: ConsumableSpendPadDialogProps) {
  const ceiling = Math.max(1, maxQty)
  // Parent should remount via key=itemId when opening a different item.
  const [amount, setAmount] = useState(1)

  const canConfirm = amount >= 1 && amount <= ceiling

  return (
    <Dialog
      open={open}
      title={`Потратить: ${itemName}`}
      primaryLabel={canConfirm ? `Потратить ${amount}` : 'Потратить'}
      secondaryLabel="Отмена"
      primaryDisabled={!canConfirm}
      primaryVariant="danger"
      onPrimary={() => {
        if (!canConfirm) return
        onConfirm(amount)
      }}
      onSecondary={onClose}
    >
      <Field label="Количество">
        <NumberInput
          min={1}
          max={ceiling}
          emptyValue={1}
          value={amount}
          onValueChange={(next) => setAmount(Math.max(1, Math.min(ceiling, next ?? 1)))}
        />
      </Field>
      <Text tone="muted">Сейчас ×{maxQty}. После траты можно отменить из тоста или журнала.</Text>
    </Dialog>
  )
}
