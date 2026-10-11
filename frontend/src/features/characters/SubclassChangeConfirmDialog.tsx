import { useEffect, useState } from 'react'
import type { SubclassChangeMode } from '../../shared/dnd/subclassGrants'
import { Dialog, Stack, Text } from '../../ui'

type SubclassChangeConfirmDialogProps = {
  open: boolean
  fromName: string
  toName: string
  classLevel: number
  textSnippets: string[]
  onConfirm: (input: { mode: SubclassChangeMode; copyTextToNotes: boolean }) => void
  onClose: () => void
}

export function SubclassChangeConfirmDialog({
  open,
  fromName,
  toName,
  classLevel,
  textSnippets,
  onConfirm,
  onClose,
}: SubclassChangeConfirmDialogProps) {
  const [mode, setMode] = useState<SubclassChangeMode>('replace_all')
  const [copyText, setCopyText] = useState(true)

  useEffect(() => {
    if (!open) return
    setMode('replace_all')
    setCopyText(true)
  }, [open, fromName, toName])

  return (
    <Dialog
      open={open}
      title="Сменить архетип?"
      primaryLabel="Сменить"
      secondaryLabel="Отмена"
      onPrimary={() => onConfirm({ mode, copyTextToNotes: copyText })}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text>
          «{fromName || '—'}» → «{toName}». Уровень класса ({classLevel}), хиты и ASI не меняются.
        </Text>

        <div className="chip-row">
          <button
            type="button"
            className={`sheet-chip${mode === 'replace_all' ? ' is-on' : ''}`}
            onClick={() => setMode('replace_all')}
          >
            Все способности
          </button>
          <button
            type="button"
            className={`sheet-chip${mode === 'future_only' ? ' is-on' : ''}`}
            onClick={() => setMode('future_only')}
          >
            Только будущие уровни
          </button>
        </div>

        {mode === 'replace_all' ? (
          <Text tone="muted">
            Старые владения, выборы и умения архетипа снимутся; новый применится целиком с порога
            выбора до текущего уровня класса.
          </Text>
        ) : (
          <Text tone="muted">
            Владения и уже открытые умения «{fromName || 'старого архетипа'}» до {classLevel} ур.
            останутся. Новый архетип откроет только умения с уровня {classLevel + 1}+; его стартовые
            владения сейчас не начисляются.
          </Text>
        )}

        {textSnippets.length > 0 ? (
          <Text tone="muted">
            Текст выборов текущего архетипа:
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
          <span>Скопировать заметку о смене в «Заметки»</span>
        </label>
      </Stack>
    </Dialog>
  )
}
