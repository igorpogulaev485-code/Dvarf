import { useEffect, useState, type ReactNode } from 'react'
import { Dialog, Field, NumberInput, Stack, Text } from '../../ui'

type Props = {
  open: boolean
  title?: string
  /** Подпись поля: итог или выпавшее на d20. */
  mode?: 'total' | 'd20'
  modifier?: number
  busy?: boolean
  onClose: () => void
  onConfirm: (payload: { total: number; d20?: number; physical_dice: true }) => void
  /** SC-02: укрытие / состояния цели в окне «кубики на столе». */
  modifiersSlot?: ReactNode
}

/**
 * T-01: «Ввести своё число» у любого броска — пометка «кубик на столе» в ленте.
 */
export function EnterOwnNumberDialog({
  open,
  title = 'Ввести своё число',
  mode = 'total',
  modifier = 0,
  busy = false,
  onClose,
  onConfirm,
  modifiersSlot,
}: Props) {
  const [value, setValue] = useState<number | null>(null)

  useEffect(() => {
    if (!open) setValue(null)
  }, [open])

  const total =
    mode === 'd20' && value != null
      ? value + modifier
      : value

  return (
    <Dialog
      open={open}
      title={title}
      primaryLabel="Записать"
      secondaryLabel="Отмена"
      busy={busy}
      onSecondary={onClose}
      onPrimary={() => {
        if (total == null) return
        onConfirm({
          total,
          ...(mode === 'd20' && value != null ? { d20: value } : {}),
          physical_dice: true,
        })
      }}
      size="default"
    >
      <Stack gap={12}>
        <Text tone="muted">
          Число с живого кубика. В ленту уйдёт с пометкой «кубик на столе».
        </Text>
        {modifiersSlot}
        <Field label={mode === 'd20' ? 'Выпало на d20' : 'Итог'}>
          <NumberInput
            value={value}
            min={mode === 'd20' ? 1 : -99}
            max={mode === 'd20' ? 20 : 999}
            integer
            emptyValue={null}
            disabled={busy}
            onValueChange={setValue}
          />
        </Field>
        {mode === 'd20' ? (
          <Text tone="muted">
            Модификатор {modifier >= 0 ? `+${modifier}` : modifier}
            {value != null ? ` → итог ${total}` : ''}
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}
