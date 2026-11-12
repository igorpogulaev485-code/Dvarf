import { useEffect, useState } from 'react'
import { Dialog, Field, NumberInput, Stack, Text } from '../../ui'

type Props = {
  open: boolean
  busy?: boolean
  characterName: string
  currentScore: number | null
  onClose: () => void
  onSubmit: (payload: { delta: number; comment: string | null }) => void
}

export function PietyAwardDialog({
  open,
  busy = false,
  characterName,
  currentScore,
  onClose,
  onSubmit,
}: Props) {
  const [delta, setDelta] = useState<number | null>(1)
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (!open) return
    setDelta(1)
    setComment('')
  }, [open])

  const canSubmit = delta != null && delta !== 0 && delta >= -50 && delta <= 50
  const preview =
    canSubmit && currentScore != null ? Math.max(0, currentScore + (delta ?? 0)) : null

  return (
    <Dialog
      open={open}
      title={`Благочестие · ${characterName}`}
      primaryLabel="Применить"
      secondaryLabel="Отмена"
      busy={busy}
      primaryDisabled={!canSubmit}
      onSecondary={onClose}
      onPrimary={() => {
        if (!canSubmit || delta == null) return
        onSubmit({ delta, comment: comment.trim() || null })
      }}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Мастер меняет счёт благочестия. Игрок сам счёт на листе не правит.
          {currentScore != null ? ` Сейчас: ${currentScore}.` : ''}
          {preview != null ? ` Будет: ${preview}.` : ''}
        </Text>
        <Field label="Изменение (−50…+50)">
          <NumberInput
            value={delta}
            min={-50}
            max={50}
            integer
            emptyValue={null}
            disabled={busy}
            onValueChange={setDelta}
          />
        </Field>
        <Field label="Комментарий (необязательно)">
          <input
            className="ui-input"
            value={comment}
            disabled={busy}
            maxLength={240}
            placeholder="Например: подношение в храме"
            onChange={(e) => setComment(e.target.value)}
          />
        </Field>
      </Stack>
    </Dialog>
  )
}
