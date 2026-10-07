import { useEffect, useState } from 'react'
import { Dialog, Stack, Text } from '../../ui'

type SubclassChangeConfirmDialogProps = {
  open: boolean
  fromName: string
  toName: string
  textSnippets: string[]
  onConfirm: (copyTextToNotes: boolean) => void
  onClose: () => void
}

export function SubclassChangeConfirmDialog({
  open,
  fromName,
  toName,
  textSnippets,
  onConfirm,
  onClose,
}: SubclassChangeConfirmDialogProps) {
  const [copyText, setCopyText] = useState(true)

  useEffect(() => {
    if (!open) return
    setCopyText(true)
  }, [open, fromName, toName])

  return (
    <Dialog
      open={open}
      title="Сменить архетип?"
      primaryLabel="Сменить"
      secondaryLabel="Отмена"
      onPrimary={() => onConfirm(copyText)}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text>
          «{fromName || '—'}» → «{toName}». Старые владения и выборы архетипа снимутся; новый
          применится как с порога выбора. Уровень класса, хиты и ASI не меняются.
        </Text>
        {textSnippets.length > 0 ? (
          <Text tone="muted">
            Текст выборов, который будет снят:
            <br />
            {textSnippets.map((line) => (
              <span key={line}>
                • {line}
                <br />
              </span>
            ))}
          </Text>
        ) : (
          <Text tone="muted">Общие заметки персонажа не изменятся.</Text>
        )}
        <label className="sheet-check">
          <input
            type="checkbox"
            checked={copyText}
            onChange={(event) => setCopyText(event.target.checked)}
          />
          <span>Скопировать снимаемый текст в «Заметки»</span>
        </label>
      </Stack>
    </Dialog>
  )
}
